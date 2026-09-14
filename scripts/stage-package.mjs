#!/usr/bin/env node
// Assemble the tarball's contents in a directory, and publish that directory.
//
// The README is the project's own, with two changes a reader who installed the
// package needs. Its relative links point at documents that are not in the
// tarball, so they become absolute URLs into the repository; and the Docs
// section says so plainly, rather than leaving the reader to discover it by
// following one.
//
// Deriving it here rather than keeping a second README in the tree is what
// stops the two drifting: there is one README to edit, and this is the only
// place that knows how the published copy differs from it.
//
// npm always takes README.md from the root of the package it is publishing, and
// no manifest field redirects it. Since this package is the repository, the
// only way to ship a different README is to publish a different root. So this
// builds one: nothing in the working tree is touched, and the staged directory
// is what `npm publish` is pointed at.
//
//   npm run stage && npm publish .package
//
// Publishing from the repository root instead would ship the project README,
// which is why the root manifest refuses it.

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STAGE = join(ROOT, ".package");

const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

// The package is named for the repository that publishes it, so a fork
// publishes under its owner's scope rather than this project's. GitHub Actions
// says which, and elsewhere the GitHub remote this checkout tracks does (origin,
// unless the branch tracks another). npm's provenance check needs that too: it
// refuses a `repository` other than the one the run came from.
function repositoryName() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const url = execFileSync("git", ["ls-remote", "--get-url"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const m = url.trim().match(/[@/]github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {
    // No git or no checkout, which is a build of this project's own source.
  }
  return "codesweep-ai/ui";
}

const REPO_NWO = repositoryName();
const REPO = `https://github.com/${REPO_NWO}`;

/** The name `name` publishes under: the same package, in the publisher's scope. */
export function publishedName(name) {
  return `@${REPO_NWO.split("/")[0].toLowerCase()}/${name.split("/")[1]}`;
}

export function publishedReadme(text, ref) {
  if (!ref) throw new Error("stage-package: no commit to pin the documentation links to.");

  // Said once, at the top of the list a reader would otherwise start following.
  const docs = "## Docs\n\n";
  const note =
    `The documentation lives in the [${REPO_NWO}](${REPO})\n` +
    "GitHub repository rather than in this package. Every link below is pinned\n" +
    `to \`${ref}\`, the commit this build came from, so it describes what you\n` +
    "installed and not whatever `main` holds when you follow it.\n\n" +
    "`catalog.json` is the exception: it ships beside the code. It is the same\n" +
    "index as `CATALOG.md`, as data, and it cannot disagree with the build it\n" +
    "came in.\n\n";
  if (!text.includes(docs)) {
    throw new Error("stage-package: README.md has no `## Docs` section to introduce.");
  }
  text = text.replace(docs, docs + note);

  // A relative link resolves against the repository, which the reader has not
  // got. GitHub serves a directory under /tree/ and a file under /blob/.
  //
  // The label may itself be an image, as the licence badge is, so it has to be
  // allowed to contain one. Matching `[^\]]*` instead stops at the image's own
  // bracket and leaves that link relative.
  const LINK = /\[((?:[^[\]]|!\[[^\]]*\]\([^)]*\))*)\]\((?!https?:|mailto:|#)([^)\s]+)\)/g;
  // Pinned to the commit rather than to `main`. A reader on a dev build from
  // an older commit would otherwise be sent to documentation for code they do
  // not have, which is CUI-071: three applications pinned to one dev build
  // would have started reading a branch 152 commits ahead of it. A sha is
  // available for a dev build and a release alike, and unlike a tag it cannot
  // be repointed afterwards.
  text = text.replace(LINK, (whole, label, target) =>
    `[${label}](${REPO}/${target.endsWith("/") ? "tree" : "blob"}/${ref}/${target.replace(/\/$/, "")})`);

  // Nothing may reach the tarball still pointing at a path the reader has not
  // got. A link this missed would 404 from the npm page and from node_modules
  // alike, and neither is somewhere a broken link gets noticed quickly.
  // Deliberately looser than LINK: a form LINK does not recognise, such as a
  // link carrying a title, would otherwise pass through unrewritten and
  // unreported. The guard has to be able to see what the rewrite cannot.
  const missed = text.match(/\]\(\s*(?!https?:|mailto:|#|<)[^)]+\)/g);
  if (missed) {
    throw new Error(`stage-package: ${missed.length} link(s) still relative: ${missed.join(", ")}`);
  }
  return text;
}

/**
 * The catalog as it ships. Every `spec` in the repository copy is a path
 * relative to the repository root, and not one of those files is in the
 * tarball. An agent told to read this index first therefore follows a pointer
 * to nothing. They become absolute URLs, pinned to the same commit the
 * README's links are, for the same reason.
 */
export function publishedCatalog(text, ref) {
  if (!ref) throw new Error("stage-package: no commit to pin the catalog to.");
  const catalog = JSON.parse(text);
  const entries = [...(catalog.components ?? []), ...(catalog.patterns ?? [])];
  if (entries.length === 0) throw new Error("stage-package: the catalog lists nothing.");

  for (const entry of entries) {
    if (typeof entry.spec === "string" && !/^https?:/.test(entry.spec)) {
      entry.spec = `${REPO}/blob/${ref}/${entry.spec.replace(/^\.?\//, "")}`;
    }
  }

  // The guard the README carries, for the reason it carries it: a pointer that
  // reaches the tarball still relative resolves against a repository the reader
  // has not got, and nothing downstream reports it. An entry with no `spec` at
  // all fails here too, because a catalog entry that points nowhere is the same
  // dead end by a different route.
  const missed = entries.filter((e) => typeof e.spec !== "string" || !/^https?:/.test(e.spec));
  if (missed.length) {
    throw new Error(
      `stage-package: ${missed.length} catalog spec(s) not absolute: ` +
      missed.map((e) => `${e.name}=${e.spec}`).join(", "),
    );
  }

  catalog.$generated =
    `${catalog.$generated} Published copy: each spec is an absolute URL pinned to ${ref}.`;
  return `${JSON.stringify(catalog, null, 2)}\n`;
}

/**
 * The manifest as it ships. `homepage` is pinned for the reason the README's
 * links are: unpinned it answers a question about the default branch, which is
 * documentation for code the reader may not have. Dropping the scripts also
 * stops npm running any lifecycle hook against the staged copy, so
 * `npm publish .package` builds nothing and packs what is there.
 */
export function publishedManifest(manifest, ref) {
  if (!ref) throw new Error("stage-package: no commit to pin the manifest to.");
  const staged = { ...manifest, homepage: `${REPO}/blob/${ref}/README.md` };
  delete staged.scripts;
  delete staged.devDependencies;
  return `${JSON.stringify(staged, null, 2)}\n`;
}

/**
 * Refuse a commit that has not left this machine.
 *
 * Every documentation pointer this package ships is pinned to the build's
 * commit, so a commit nobody can fetch ships a package that documents nothing:
 * the README's links, all 49 catalog specs and the manifest's homepage all 404
 * together, and the publish reports nothing. Staging already treats an absent
 * commit as fatal, and an unreachable one is the same failure later.
 *
 * Reachability is asked of this repository rather than of the forge, so the
 * check costs no network and answers the case that actually happens: staging
 * from work that has not been pushed. A commit on a remote-tracking branch or
 * on a tag has left; one on neither has not.
 *
 * Where there is no remote-tracking ref and no tag to judge against, it says
 * nothing rather than guessing. A check with no evidence should not be the
 * thing that stops a release.
 */
export function assertCommitIsFetchable(sha, run) {
  const containing = run([
    "for-each-ref", "--format=%(refname)", "--contains", sha, "refs/remotes", "refs/tags",
  ]).trim();
  if (containing) return;

  const anyRef = run([
    "for-each-ref", "--count=1", "--format=%(refname)", "refs/remotes", "refs/tags",
  ]).trim();
  if (!anyRef) return;

  throw new Error(
    `stage-package: ${sha} is on no remote branch and no tag, so it is not a commit a reader ` +
    "can fetch. Every documentation link this package ships would 404. Push the commit, or " +
    "stage from one that has been pushed.",
  );
}

/** The commit this build came from, which build.mjs stamps into dist. */
function builtCommit(root) {
  const stamp = join(root, "dist", "BUILD.json");
  if (!existsSync(stamp)) {
    throw new Error("stage-package: dist/BUILD.json is missing, so there is no commit to pin to.");
  }
  const { sha } = JSON.parse(readFileSync(stamp, "utf8"));
  if (!sha) throw new Error("stage-package: dist/BUILD.json records no sha.");
  return sha;
}

// Importable for its rewrite, which is the part worth testing, without staging
// anything as a side effect of the import.
const invokedDirectly =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
try {
if (!existsSync(join(ROOT, "dist"))) {
  console.error("stage-package: dist/ is not built. Run `npm run build` first.");
  process.exit(1);
}

// A fresh directory every time. Reusing one would keep a file that a later
// build stopped producing, and the tarball would carry it for ever.
rmSync(STAGE, { recursive: true, force: true });
mkdirSync(STAGE);

for (const entry of ["dist", "LICENSE", "NOTICE"]) {
  cpSync(join(ROOT, entry), join(STAGE, entry), { recursive: true });
}

// The three files that differ between the two roots. Each is the repository's
// own, rewritten for a reader who has the package and not the repository.
const ref = builtCommit(ROOT);
const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
if (process.env.CS_UI_STAGE_INSPECT === "1") {
  // `npm run ci` stages to prove the tarball assembles and publishes nothing,
  // so an unpushed commit is not a reason to fail it. Refusing there would mean
  // a branch could not pass its own gate until it had been pushed, which is the
  // wrong way round: the gate exists to be run before anything leaves.
  try {
    assertCommitIsFetchable(ref, git);
  } catch (err) {
    console.warn(`${err.message}\n  (staging anyway: this run inspects the tarball rather than publishing it)`);
  }
} else {
  assertCommitIsFetchable(ref, git);
}
writeFileSync(
  join(STAGE, "README.md"),
  publishedReadme(readFileSync(join(ROOT, "README.md"), "utf8"), ref),
);
// catalog.json ships: it is the index this project tells an agent to read
// first, and a shipped artifact cannot disagree with the build it came in.
writeFileSync(
  join(STAGE, "catalog.json"),
  publishedCatalog(readFileSync(join(ROOT, "catalog.json"), "utf8"), ref),
);
// Who publishes, rather than what was built: the scope and the issue tracker
// follow the repository this run came from, so a fork publishes as itself.
// `publishedManifest` owns the rest, which is what the build pins to a commit.
manifest.name = publishedName(manifest.name);
manifest.repository = { ...manifest.repository, url: `git+${REPO}.git` };
manifest.bugs = { url: `${REPO}/issues` };
writeFileSync(join(STAGE, "package.json"), publishedManifest(manifest, ref));

console.log(`staged ${manifest.name}@${manifest.version} in .package/`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
}
