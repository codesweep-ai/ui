#!/usr/bin/env node
// Serve a build of this package from a registry on this machine, and say how
// to install it.
//
// Installing a tarball by path is not how a consumer meets the package. It
// skips the export map, the `files` list and the peer-dependency resolution,
// which is most of what can be wrong with a publish. cs-npmrevs
// (https://github.com/codesweep-ai/npmrevs) makes every revision of an npm package
// installable without publishing it: it serves the build made here, and passes
// every other package through from npmjs.com.
//
//   node scripts/npmrevs-registry.mjs         # build, stage, serve, print how to install
//   node scripts/npmrevs-registry.mjs pack    # build and stage only, for a later build to install
//   node scripts/npmrevs-registry.mjs stop    # stop the server again
//
// The package goes into cs-npmrevs's own data directory, which every project's
// build shares: a later build that installs through cs-npmrevs on this port, such
// as ledger's, tracer's and campaign's through their scripts/with-npmrevs.sh,
// finds it there. The server is started as those scripts start one, with the
// @codesweep-ai images on ghcr.io as well, so either finds what it needs on the
// port. It is packed under the dev version of this commit, -dirty when the tree
// has changes, so it never takes the place of a release.
//
// Nothing here touches ~/.npmrc or npmjs.com. The npmrc it writes lives in the
// state directory and is passed with NPM_CONFIG_USERCONFIG, and cs-npmrevs refuses
// every write, so nothing run through that npmrc can publish anywhere.
//
// cs-npmrevs listens on 127.0.0.1, and localhost reaches it there. Its port is
// not the 4873 scripts/local-registry.mjs gives verdaccio, so both can run.

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, openSync, closeSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = join(ROOT, ".npmrevs-registry");
// The directory cs-npmrevs serves when given none, resolved as it resolves it.
const DATA =
  process.env.CS_NPMREVS_DATA ||
  join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "cs-npmrevs", "data");
const NPMRC = join(STATE, "npmrc");
const PIDFILE = join(STATE, "cs-npmrevs.pid");
const LOG = join(STATE, "cs-npmrevs.log");
const PORT = process.env.CS_NPMREVS_PORT ?? "4875";
const IMAGES = process.env.CS_NPMREVS_IMAGES ?? "ghcr.io";
const SCOPE = process.env.CS_NPMREVS_SCOPE ?? "@codesweep-ai";
const URL = `http://localhost:${PORT}`;

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: ROOT, stdio: "inherit", ...options });
}

// The command that runs cs-npmrevs: $NPMREVS when it is set, else the copy
// `npm ci` installs from the @codesweep-ai/npmrevs devDependency, else the one
// on the PATH. `shown` is how the closing message names it.
function npmrevs() {
  if (process.env.NPMREVS) return { argv: process.env.NPMREVS.split(" ").filter(Boolean), shown: process.env.NPMREVS };
  const installed = join(ROOT, "node_modules", ".bin", "cs-npmrevs");
  if (existsSync(installed)) return { argv: [installed], shown: "npx cs-npmrevs" };
  return { argv: ["cs-npmrevs"], shown: "cs-npmrevs" };
}

// The cs-npmrevs version package.json pins, so a message about installing it
// names the version this project runs.
function pinnedVersion() {
  try {
    const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    return manifest.devDependencies?.["@codesweep-ai/npmrevs"] ?? "latest";
  } catch {
    return "latest";
  }
}

async function answering() {
  try {
    const response = await fetch(`${URL}/-/ping`, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

// The pid of the cs-npmrevs answering on the port, when it serves this script's
// data directory, and null otherwise. NPMREVS may be a launcher, such as the npm
// package's, whose own pid is not the server's, so the server is asked.
async function ours() {
  try {
    const response = await fetch(`${URL}/-/npmrevs`, { signal: AbortSignal.timeout(1000) });
    const status = await response.json();
    const serving = status.server === "cs-npmrevs" && status.data?.length === 1 && status.data[0] === DATA;
    return serving ? status.pid : null;
  } catch {
    return null;
  }
}

// Whether pid is still a cs-npmrevs command, so a stale file never names some
// other process that took the pid over.
function runsNpmrevs(pid) {
  const ps = spawnSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf8" });
  return ps.status === 0 && ps.stdout.includes("cs-npmrevs");
}

// stop ends the server this script started last. quiet is for a restart, where
// finding none is the normal case and not news.
async function stop({ quiet = false } = {}) {
  const pid = await ours();
  if (pid) {
    try {
      process.kill(pid);
    } catch {
      // Already gone, which is what stopping it asks for.
    }
  }
  let launcher = null;
  if (existsSync(PIDFILE)) {
    launcher = Number(readFileSync(PIDFILE, "utf8").trim());
    rmSync(PIDFILE, { force: true });
    if (launcher && (pid || runsNpmrevs(launcher))) {
      try {
        // The launcher was started in a process group of its own.
        process.kill(-launcher);
      } catch {
        // Already gone.
      }
    } else {
      launcher = null;
    }
  }
  if (!pid && !launcher) {
    if (!quiet) console.log("no registry started by this script is running");
    return;
  }
  for (let i = 0; i < 50 && (await answering()); i += 1) await sleep(100);
  if (!quiet) console.log(`stopped the registry on port ${PORT}`);
}

if (process.argv[2] === "stop") {
  await stop();
  process.exit(0);
}

// Packing alone runs no cs-npmrevs, so only serving needs one.
const packOnly = process.argv[2] === "pack";
const { argv: [command, ...prefix], shown } = npmrevs();
if (!packOnly && spawnSync(command, [...prefix, "version"], { stdio: "ignore" }).status !== 0) {
  console.error(
    "cs-npmrevs is not installed, and it is the registry this script runs.\n" +
      `It is a devDependency, so \`npm ci\` installs the @codesweep-ai/npmrevs@${pinnedVersion()}\n` +
      "this package pins. Or set NPMREVS to the command that runs it.",
  );
  process.exit(1);
}

mkdirSync(STATE, { recursive: true });
mkdirSync(DATA, { recursive: true });

// Staged with --inspect, so a commit no remote has yet can be tried too. The
// links a staged README pins to that commit resolve only once it is pushed,
// which matters for a publish and not for an install on this machine.
console.log("==> building and staging");
if (run(npm, ["run", "build"]).status !== 0) process.exit(1);
if (run(process.execPath, ["scripts/stage-package.mjs", "--inspect"]).status !== 0) process.exit(1);

// The version the images workflow gives this commit, so the data directory,
// which every build on this machine shares, never holds one under a release's
// number.
const dev = spawnSync(process.execPath, ["scripts/dev-version.mjs", "--dirty"], {
  cwd: ROOT,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
if (dev.status !== 0) process.exit(1);
const version = dev.stdout.trim();
const staged = join(ROOT, ".package", "package.json");
const manifest = JSON.parse(readFileSync(staged, "utf8"));
const { name } = manifest;
writeFileSync(staged, `${JSON.stringify({ ...manifest, version }, null, 2)}\n`);

// Packed into the data directory, which the server rereads as it changes. A
// version packed again replaces its file, so a rebuild replaces what the last
// run packed.
console.log(`==> packing ${name}@${version} into ${DATA}`);
if (run(npm, ["pack", ".package", "--pack-destination", DATA, "--silent"], { stdio: ["ignore", "ignore", "inherit"] }).status !== 0) {
  process.exit(1);
}

if (packOnly) {
  console.log(`A build installing through cs-npmrevs on port ${PORT} now finds ${name}@${version}.`);
  process.exit(0);
}

// The server this script started last is replaced, so the cs-npmrevs doing the
// serving is the one installed now. Anything else on the port is left alone.
await stop({ quiet: true });
if (await answering()) {
  console.error(`port ${PORT} is taken by a program this script did not start.`);
  console.error("Stop it, or set CS_NPMREVS_PORT to a free port.");
  process.exit(1);
}
console.log(`==> starting the registry on port ${PORT}`);
const log = openSync(LOG, "w");
const serve = ["serve", "--data", DATA, "--images", IMAGES, "--images-scope", SCOPE, "--listen", `127.0.0.1:${PORT}`];
const child = spawn(command, [...prefix, ...serve], {
  cwd: STATE,
  detached: true,
  stdio: ["ignore", log, log],
});
child.unref();
closeSync(log);
writeFileSync(PIDFILE, `${child.pid}\n`);
let up = false;
for (let i = 0; i < 50 && !up; i += 1) {
  await sleep(100);
  up = await answering();
}
if (!up) {
  console.error(`the registry did not come up on ${URL}; see .npmrevs-registry/cs-npmrevs.log`);
  process.exit(1);
}

// Every package goes to this registry, which serves the build made here and
// passes the rest through from npmjs.com.
writeFileSync(NPMRC, `registry=${URL}/\n`);

console.log(`
Serving ${name}@${version} from this machine, and every other package from npmjs.com.

  Install  NPM_CONFIG_USERCONFIG=${NPMRC} npm install ${name}@${version}
  Status   curl ${URL}/-/npmrevs
  Stop     node scripts/npmrevs-registry.mjs stop

A lockfile written through it names this machine for this package.
\`${shown} lockfile check\` finds that entry before one is committed.
`);
