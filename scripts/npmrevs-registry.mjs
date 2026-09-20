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
//   node scripts/npmrevs-registry.mjs stop    # stop the server again
//
// Nothing here touches ~/.npmrc or npmjs.com. The npmrc it writes lives in the
// state directory and is passed with NPM_CONFIG_USERCONFIG, and cs-npmrevs refuses
// every write, so nothing run through that npmrc can publish anywhere.
//
// It takes the port and the address scripts/local-registry.mjs does, so an npmrc
// that sends this package's scope there works with either, and only one of them
// runs at a time. cs-npmrevs listens on 127.0.0.1, and localhost reaches it there.

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, openSync, closeSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { publishedName } from "./stage-package.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = join(ROOT, ".npmrevs-registry");
const DATA = join(STATE, "data");
const NPMRC = join(STATE, "npmrc");
const PIDFILE = join(STATE, "cs-npmrevs.pid");
const LOG = join(STATE, "cs-npmrevs.log");
const PORT = process.env.CS_UI_REGISTRY_PORT ?? "4873";
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

const { argv: [command, ...prefix], shown } = npmrevs();
if (spawnSync(command, [...prefix, "version"], { stdio: "ignore" }).status !== 0) {
  console.error(
    "cs-npmrevs is not installed, and it is the registry this script runs.\n" +
      `It is a devDependency, so \`npm ci\` installs the @codesweep-ai/npmrevs@${pinnedVersion()}\n` +
      "this package pins. Or set NPMREVS to the command that runs it.",
  );
  process.exit(1);
}

mkdirSync(DATA, { recursive: true });

// Staged with --inspect, so a commit no remote has yet can be tried too. The
// links a staged README pins to that commit resolve only once it is pushed,
// which matters for a publish and not for an install on this machine.
console.log("==> building and staging");
if (run(npm, ["run", "build"]).status !== 0) process.exit(1);
if (run(process.execPath, ["scripts/stage-package.mjs", "--inspect"]).status !== 0) process.exit(1);

const manifest = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const name = publishedName(manifest.name);
const { version } = manifest;

// Packed into the data directory, which the server rereads as it changes. A
// version packed again replaces its file, so a rebuild replaces what the last
// run packed.
console.log(`==> packing ${name}@${version} into .npmrevs-registry/data`);
if (run(npm, ["pack", ".package", "--pack-destination", DATA, "--silent"], { stdio: ["ignore", "ignore", "inherit"] }).status !== 0) {
  process.exit(1);
}

// The server this script started last is replaced, so the cs-npmrevs doing the
// serving is the one installed now. Anything else on the port is left alone.
await stop({ quiet: true });
if (await answering()) {
  console.error(`port ${PORT} is taken by a program this script did not start.`);
  console.error("Stop it, or set CS_UI_REGISTRY_PORT to a free port. If it is the registry");
  console.error("`npm run registry:local` started, `node scripts/local-registry.mjs stop` stops it.");
  process.exit(1);
}
console.log(`==> starting the registry on port ${PORT}`);
const log = openSync(LOG, "w");
const child = spawn(command, [...prefix, "serve", "--data", DATA, "--listen", `127.0.0.1:${PORT}`], {
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
