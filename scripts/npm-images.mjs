#!/usr/bin/env node
// A project's npm packages as a container image, named like the package it
// holds and carrying the last builds of each package rather than only this one.
//
// CI publishes one image per commit. @codesweep-ai/lint at version
// 0.0.0-20260915044436-9f21070d14c8 is ghcr.io/codesweep-ai/npm/lint at that
// tag, and holds that version's tarballs beside the ones carried forward from
// the branch's previous image. The npm/ in the name keeps these apart from
// images that run. A dev environment, a sandbox or a build system pulls a
// package's newest image and copies every tarball in it, one file per version,
// into a data directory, where a local registry can serve them or an
// `overrides` entry can point at them.
//
//   node npm-images.mjs publish <package dir or .tgz>...      # CI
//   node npm-images.mjs fetch --data ./data @codesweep-ai/lint @codesweep-ai/ui
//
// The same file is in every project that publishes an image, so a fix made in
// one is copied to the others rather than rewritten there.

import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

// Versions kept per package name inside one image. Counted per name, so a
// project publishing five packages keeps twenty of each rather than four. Every
// tarball is a layer, and docker's overlay2 driver mounts no more than 125, so
// five packages at twenty versions is close to as far as this goes.
export const KEEP = 20;

// The workflow that publishes the images: ci.yml, whose last job calls
// npm-images.yml once the rest have passed. A called workflow records no runs of
// its own, so its caller's successful runs on a branch are the commits that
// branch has published, newest first.
const WORKFLOW = "ci.yml";

// The image is data rather than a program, so one platform serves every client:
// an arm64 laptop copies files out of it exactly as an amd64 runner does.
const PLATFORM = "linux/amd64";

// Every tarball enters the image with this mtime, the one npm pack gives every
// entry inside a tarball. A layer's digest covers the file's mtime, so without
// it a tarball carried forward from the previous image would become a new blob
// in every build, and each image would store the whole history again.
const MTIME = new Date("1985-10-26T08:15:00Z");

const USAGE = `usage:
  npm-images.mjs publish [options] <package dir or .tgz>...
      The first package names the image: ghcr.io/<scope>/npm/<name>:<version>.
      --repository <owner/name>  the repository publishing, from GITHUB_REPOSITORY or the git remote
      --branch <name>            the branch whose latest image is carried forward
      --registry <host>          ghcr.io unless given
      --engine <podman|docker>   podman where it is installed, docker otherwise
      --dry-run                  build the image, and push nothing

  npm-images.mjs fetch --data <dir> [options] <@scope/name>...
      Copies every tarball in the package's newest image, the one tagged with
      the highest version, into <dir>.
      --registry <host>          ghcr.io unless given
      --engine <podman|docker>   podman where it is installed, docker otherwise`;

function fail(message) {
  console.error(`npm-images: ${message}`);
  process.exit(1);
}

// In Actions a notice is an annotation on the run, which is where somebody
// watching the chain of images looks. Anywhere else it is a line of output.
function notice(level, message) {
  console.log(process.env.GITHUB_ACTIONS ? `::${level}::${message}` : `${level}: ${message}`);
}

function dir(path) {
  mkdirSync(path, { recursive: true });
  return path;
}

const tarballs = (n) => `${n} tarball${n === 1 ? "" : "s"}`;

// ---------------------------------------------------------------------------
// Versions

const IDENT = String.raw`(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)`;
const SEMVER = new RegExp(
  String.raw`^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(${IDENT}(?:\.${IDENT})*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$`,
);

function parseVersion(version) {
  const m = SEMVER.exec(version);
  if (!m) throw new Error(`"${version}" is not a semver version`);
  return { core: [m[1], m[2], m[3]].map(BigInt), pre: m[4] ? m[4].split(".") : [] };
}

/** Semver precedence, the order a registry ranks versions in. */
export function compareVersions(a, b) {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  for (let i = 0; i < 3; i++) {
    if (x.core[i] !== y.core[i]) return x.core[i] < y.core[i] ? -1 : 1;
  }
  // A release ranks above every prerelease of the same version.
  if (!x.pre.length || !y.pre.length) return Math.sign(y.pre.length - x.pre.length);
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    if (i === x.pre.length) return -1;
    if (i === y.pre.length) return 1;
    const [p, q] = [x.pre[i], y.pre[i]];
    const [pNumeric, qNumeric] = [/^\d+$/.test(p), /^\d+$/.test(q)];
    if (pNumeric && qNumeric && BigInt(p) !== BigInt(q)) return BigInt(p) < BigInt(q) ? -1 : 1;
    if (pNumeric !== qNumeric) return pNumeric ? -1 : 1;
    if (!pNumeric && p !== q) return p < q ? -1 : 1;
  }
  return 0;
}

/** The highest of the tags that are versions, or undefined. */
export function highestVersion(tags) {
  return tags.filter((t) => SEMVER.test(t)).sort(compareVersions).at(-1);
}

/**
 * The image a commit published, among an image's tags. A build's version ends
 * with its commit's abbreviated sha, so the tag whose last identifier the
 * commit's sha starts with is that commit's.
 */
export function tagForCommit(tags, sha) {
  return highestVersion(
    tags.filter((t) => {
      const last = t.split(/[.-]/).at(-1);
      return /^[0-9a-f]{7,40}$/.test(last) && sha.startsWith(last);
    }),
  );
}

// ---------------------------------------------------------------------------
// Names

/** A scoped package name, `@scope/name`, with no version. */
export function parseName(arg) {
  if (!/^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(arg)) {
    throw new Error(`"${arg}" is not a scoped package name`);
  }
  return arg;
}

/** The image a package is published as: its scope is the owner, and its name the image under npm/. */
export function imageFor(registry, name) {
  const [scope, bare] = parseName(name).slice(1).split("/");
  return `${registry}/${scope}/npm/${bare}`;
}

// A container tag is narrower than a version: no `+`, and at most 128 characters.
const TAG = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$/;

// ---------------------------------------------------------------------------
// Tarballs

/** The name and version a tarball's own package.json declares. */
function readPackage(file) {
  let manifest;
  try {
    manifest = JSON.parse(
      execFileSync("tar", ["-xzOf", file, "package/package.json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }),
    );
    parseVersion(manifest.version);
  } catch (error) {
    throw new Error(`${file} is not an npm package tarball: ${error.message.trim()}`);
  }
  return { name: manifest.name, version: manifest.version, file, filename: basename(file) };
}

function tarballsIn(path) {
  return readdirSync(path)
    .filter((f) => f.endsWith(".tgz"))
    .map((f) => readPackage(join(path, f)));
}

const id = (p) => `${p.name}@${p.version}`;

/**
 * The tarballs one image carries: every one this build made, and the newest of
 * the rest up to `keep` per package name.
 *
 * This build's own are kept whatever their rank, because the image is named for
 * this build's version and has to hold it. A version this build made again
 * replaces the carried copy.
 */
export function selectRetained(built, carried, keep = KEEP) {
  const own = new Set(built.map(id));
  const byName = new Map();
  for (const p of [...built, ...carried.filter((c) => !own.has(id(c)))]) {
    byName.set(p.name, [...(byName.get(p.name) ?? []), p]);
  }
  const kept = [];
  for (const packages of byName.values()) {
    const mine = packages.filter((p) => own.has(id(p)));
    const rest = packages.filter((p) => !own.has(id(p))).sort((a, b) => compareVersions(b.version, a.version));
    kept.push(...mine, ...rest.slice(0, Math.max(0, keep - mine.length)));
  }
  return kept.sort((a, b) => (a.name === b.name ? compareVersions(a.version, b.version) : a.name < b.name ? -1 : 1));
}

/**
 * One COPY per tarball, so each is a layer of its own and two images carrying
 * the same tarball share its blob. One COPY of every file would make each image
 * a single new blob holding the whole history.
 */
export function containerfile(packages, labels) {
  const lines = ["FROM scratch"];
  for (const p of packages) lines.push(`COPY ${JSON.stringify([p.filename, "/"])}`);
  for (const [key, value] of Object.entries(labels)) lines.push(`LABEL ${key}=${JSON.stringify(value)}`);
  // `create` refuses an image with nothing to run, and this one is only ever
  // created to be copied out of. Nothing starts it, so /noop need not exist.
  lines.push('CMD ["/noop"]');
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------------------
// The engine, the registry, and GitHub

function engineFor(requested) {
  if (requested) return requested;
  for (const candidate of ["podman", "docker"]) {
    if (spawnSync(candidate, ["--version"], { stdio: "ignore" }).status === 0) return candidate;
  }
  fail("neither podman nor docker is installed, and one is needed to pull or build an image.");
}

function attempt(engine, args) {
  const result = spawnSync(engine, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return {
    ok: result.status === 0,
    out: (result.stdout ?? "").trim(),
    err: (result.stderr || result.error?.message || "").trim(),
  };
}

function run(engine, args) {
  const result = attempt(engine, args);
  if (!result.ok) throw new Error(`${engine} ${args.join(" ")} failed:\n${result.err}`);
  return result.out;
}

/** Copy the tarballs out of an image already on this machine, into `dest`. */
function copyOut(engine, ref, dest) {
  const container = run(engine, ["create", "--pull=never", "--platform", PLATFORM, ref]);
  try {
    run(engine, ["cp", `${container}:/.`, dest]);
  } finally {
    attempt(engine, ["rm", container]);
  }
}

/**
 * A pull token for one repository in a registry, from the challenge its 401
 * carried. Anonymous first, which is all a public image needs; then GH_TOKEN or
 * GITHUB_TOKEN, for a private one.
 */
async function pullToken(challenge) {
  const params = Object.fromEntries([...challenge.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  if (!/^Bearer\s/i.test(challenge) || !params.realm) {
    throw new Error(`the registry wants credentials this script cannot supply: ${challenge || "no challenge"}`);
  }
  const url = new URL(params.realm);
  for (const key of ["service", "scope"]) if (params[key]) url.searchParams.set(key, params[key]);
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  const basic = token && Buffer.from(`${process.env.GITHUB_ACTOR ?? "token"}:${token}`).toString("base64");
  let response;
  for (const headers of [{}, ...(basic ? [{ authorization: `Basic ${basic}` }] : [])]) {
    response = await fetch(url, { headers });
    if (response.ok) {
      const body = await response.json();
      return `Bearer ${body.token ?? body.access_token}`;
    }
  }
  throw new Error(`${url.host} gave no pull token for ${params.scope} (${response.status}): private, or not published`);
}

/** Every tag an image has, or none when nothing is published under its name. */
async function listTags(image) {
  const [host, ...path] = image.split("/");
  // A registry on this machine answers plain HTTP, as docker assumes of one.
  const scheme = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https";
  let url = `${scheme}://${host}/v2/${path.join("/")}/tags/list?n=1000`;
  let authorization;
  const tags = [];
  while (url) {
    let response = await fetch(url, { headers: authorization ? { authorization } : {} });
    if (response.status === 401 && !authorization) {
      authorization = await pullToken(response.headers.get("www-authenticate") ?? "");
      response = await fetch(url, { headers: { authorization } });
    }
    if (response.status === 404) return tags;
    if (!response.ok) throw new Error(`GET ${url} answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
    tags.push(...((await response.json()).tags ?? []));
    const next = response.headers.get("link")?.match(/<([^>]+)>\s*;\s*rel="next"/)?.[1];
    url = next && new URL(next, url).href;
  }
  return tags;
}

/** The repository this checkout is of, from Actions or from the git remote. */
function repositoryName() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const url = execFileSync("git", ["ls-remote", "--get-url"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const m = url.trim().match(/[@/]github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {
    // Not a checkout, so the caller has to say.
  }
  return null;
}

/** The commits of the publishing workflow's successful runs on a branch, newest first. */
async function successfulRuns(repository, branch) {
  const api = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const url =
    `${api}/repos/${repository}/actions/workflows/${WORKFLOW}/runs` +
    `?branch=${encodeURIComponent(branch)}&status=success&per_page=30`;
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  const response = await fetch(url, {
    headers: { accept: "application/vnd.github+json", ...(token && { authorization: `Bearer ${token}` }) },
  });
  if (!response.ok) {
    throw new Error(`GET ${url} answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }
  const { workflow_runs: runs } = await response.json();
  // A pull request from a fork is recorded against the fork's branch name, often
  // this one's, and its ci passes without publishing an image.
  const own = runs.filter((r) => r.head_repository?.full_name?.toLowerCase() === repository.toLowerCase());
  return [...new Set(own.map((r) => r.head_sha))];
}

/**
 * Pull the image the branch published last: its newest successful run whose
 * image is still in the registry. Returns the reference pulled, or null with
 * the reason there is none.
 */
async function pullPrevious(engine, image, repository, branch) {
  const shas = await successfulRuns(repository, branch);
  if (!shas.length) return { ref: null, reason: `no successful ${WORKFLOW} run on ${branch}` };
  const tags = await listTags(image);
  let reason = `none of the last ${shas.length} successful runs on ${branch} has an image left`;
  for (const sha of shas) {
    const tag = tagForCommit(tags, sha);
    if (!tag) continue;
    const pulled = attempt(engine, ["pull", "-q", "--platform", PLATFORM, `${image}:${tag}`]);
    if (pulled.ok) return { ref: `${image}:${tag}` };
    reason = `${image}:${tag} did not pull: ${pulled.err.split("\n").at(-1)}`;
  }
  return { ref: null, reason };
}

// ---------------------------------------------------------------------------
// publish

/**
 * Pack every package directory, and copy every tarball, each into a directory
 * of its own so the result keeps the order they were named in.
 */
function collect(inputs, dest) {
  const built = inputs.map((input, i) => {
    const out = dir(join(dest, String(i)));
    if (input.endsWith(".tgz")) {
      copyFileSync(input, join(out, basename(input)));
    } else if (existsSync(join(input, "package.json"))) {
      execFileSync("npm", ["pack", resolve(input), "--pack-destination", out, "--ignore-scripts", "--silent"], {
        stdio: ["ignore", "ignore", "inherit"],
      });
    } else {
      fail(`${input} is neither a .tgz nor a directory holding a package.json.`);
    }
    return readPackage(join(out, readdirSync(out)[0]));
  });
  const names = new Map();
  for (const p of built) {
    if (names.has(id(p))) fail(`${id(p)} was named twice, as ${names.get(id(p))} and as ${p.file}.`);
    names.set(id(p), p.file);
  }
  return built;
}

async function publish(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      repository: { type: "string" },
      branch: { type: "string" },
      registry: { type: "string", default: "ghcr.io" },
      engine: { type: "string" },
      "dry-run": { type: "boolean", default: false },
    },
  });
  if (!positionals.length) fail(`nothing to publish.\n\n${USAGE}`);

  const repository = values.repository ?? repositoryName();
  if (!repository) fail("no repository to link the image to. Pass --repository <owner/name>.");
  const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  // A pull request's runs are recorded against its head branch, a push's
  // against the branch pushed.
  const branch = values.branch || process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || git("branch", "--show-current");
  const engine = engineFor(values.engine);

  const work = mkdtempSync(join(tmpdir(), "npm-images-"));
  try {
    const built = collect(positionals, dir(join(work, "built")));
    const [named] = built;
    let image;
    try {
      image = imageFor(values.registry, named.name);
    } catch (error) {
      fail(`${error.message}. The first package names the image, so it has to be scoped.`);
    }
    if (!TAG.test(named.version)) fail(`${id(named)} has a version a container tag cannot hold.`);
    const ref = `${image}:${named.version}`;

    // The branch's previous image, carried forward. Absence is normal — a new
    // branch, or a chain whose head was pruned — and costs only the history, so
    // it is reported rather than failed.
    let previous;
    try {
      previous = branch ? await pullPrevious(engine, image, repository, branch) : { ref: null, reason: "no branch" };
    } catch (error) {
      previous = { ref: null, reason: error.message };
      notice("warning", `cannot find this branch's previous image: ${error.message}`);
    }
    let carried = [];
    if (previous.ref) {
      copyOut(engine, previous.ref, dir(join(work, "carried")));
      carried = tarballsIn(join(work, "carried"));
      console.log(`carrying forward ${tarballs(carried.length)} from ${previous.ref}`);
    } else {
      notice("notice", `${ref} starts a new chain, carrying nothing forward: ${previous.reason}`);
    }

    const kept = selectRetained(built, carried);
    const context = dir(join(work, "context"));
    for (const p of kept) {
      const target = join(context, p.filename);
      copyFileSync(p.file, target);
      chmodSync(target, 0o644);
      utimesSync(target, MTIME, MTIME);
    }
    let revision = null;
    try {
      revision = git("rev-parse", "HEAD");
    } catch {
      // Packed outside a checkout, so there is no commit to name.
    }
    writeFileSync(
      join(context, "Containerfile"),
      containerfile(kept, {
        "org.opencontainers.image.title": named.name,
        "org.opencontainers.image.version": named.version,
        // Shown on the package's page, where it is the first thing that says
        // this is data rather than something to run.
        "org.opencontainers.image.description":
          `npm package tarballs, not a runnable image: ${id(named)}, and the last ${KEEP} ` +
          `versions of each package ${repository} builds. Copy them out to install from.`,
        // What links the image to the repository, and lists it on the
        // repository's page.
        "org.opencontainers.image.source": `https://github.com/${repository}`,
        ...(revision && { "org.opencontainers.image.revision": revision }),
        // The npm view of the image, readable from its config without pulling a
        // layer: the package it is named for, and every tarball it holds.
        "ai.codesweep.npm.package": named.name,
        "ai.codesweep.npm.version": named.version,
        "ai.codesweep.npm.packages": kept.map(id).join(","),
      }),
    );

    run(engine, ["build", "-q", "--platform", PLATFORM, "-t", ref, "-f", join(context, "Containerfile"), context]);
    let digest = null;
    if (values["dry-run"]) {
      console.log(`built ${ref}, and pushed nothing`);
    } else if (engine === "podman") {
      run(engine, ["push", "--digestfile", join(work, "digest"), ref]);
      digest = readFileSync(join(work, "digest"), "utf8").trim();
    } else {
      run(engine, ["push", "-q", ref]);
      digest = run(engine, ["image", "inspect", "--format", "{{index .RepoDigests 0}}", ref]).split("@")[1];
    }
    if (digest) console.log(`pushed ${ref}\n  ${digest}`);

    const own = new Set(built.map(id));
    for (const p of kept) console.log(`  ${own.has(id(p)) ? "built  " : "carried"}  ${id(p)}`);

    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(
        process.env.GITHUB_STEP_SUMMARY,
        [
          `### \`${ref}\``,
          "",
          `${digest ? `Digest \`${digest}\`.` : "Built, and pushed nothing."} ` +
            `${tarballs(built.length)} built, ${kept.length - built.length} carried forward` +
            `${previous.ref ? ` from \`${previous.ref}\`` : ""}.`,
          "",
          "```sh",
          `npm-images.mjs fetch --data ./data ${named.name}`,
          "```",
          "",
          ...built.map((p) => `- \`${id(p)}\``),
          "",
        ].join("\n"),
      );
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// fetch

async function fetchImages(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      data: { type: "string" },
      registry: { type: "string", default: "ghcr.io" },
      engine: { type: "string" },
    },
  });
  if (!values.data || !positionals.length) fail(`fetch needs --data and at least one package.\n\n${USAGE}`);
  let names;
  try {
    names = positionals.map(parseName);
  } catch (error) {
    fail(`${error.message}. fetch takes package names, and copies every version the newest image holds.`);
  }
  const engine = engineFor(values.engine);
  const data = dir(resolve(values.data));

  for (const name of names) {
    const image = imageFor(values.registry, name);
    const version = highestVersion(await listTags(image).catch((error) => fail(error.message)));
    if (!version) fail(`${image} has no image tagged with a version.`);
    const ref = `${image}:${version}`;
    console.log(`${name}: pulling ${ref}`);
    run(engine, ["pull", "-q", "--platform", PLATFORM, ref]);

    // Copied out beside the data directory's files, so each lands by rename and
    // none is ever there half-written. A tarball already there is replaced.
    const staging = mkdtempSync(join(data, ".npm-images-"));
    try {
      copyOut(engine, ref, staging);
      const packages = tarballsIn(staging);
      for (const p of packages) renameSync(p.file, join(data, p.filename));
      console.log(`${name}: ${tarballs(packages.length)} into ${data}`);
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
  }
}

// ---------------------------------------------------------------------------

// Importable for its tests without running a command as a side effect.
const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  const [command, ...rest] = process.argv.slice(2);
  const commands = { publish, fetch: fetchImages };
  if (!Object.hasOwn(commands, command ?? "")) fail(`unknown command "${command ?? ""}".\n\n${USAGE}`);
  commands[command](rest).catch((error) => fail(error.message));
}
