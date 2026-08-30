#!/usr/bin/env node
// Publish this package to a registry on this machine, and say where to look.
//
// Installing a tarball by path is not how a consumer meets the package. It
// skips the export map, the `files` list, the peer-dependency resolution and the
// dist-tag, which is most of what can be wrong with a publish. A registry on
// this machine exercises all of it and reaches nothing anyone else can see.
//
//   node scripts/local-registry.mjs         # start, publish, print the URL
//   node scripts/local-registry.mjs stop    # stop it again
//
// Nothing here touches ~/.npmrc or the real registry. The credential is a
// throwaway token in the state directory, passed through NPM_CONFIG_USERCONFIG
// so that no npm command below can reach npmjs.com by accident.

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE = join(ROOT, ".local-registry");
const CONFIG = join(STATE, "config.yaml");
const NPMRC = join(STATE, "npmrc");
const PIDFILE = join(STATE, "verdaccio.pid");
const PORT = process.env.CS_UI_REGISTRY_PORT ?? "4873";
const URL = `http://localhost:${PORT}`;

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: ROOT, stdio: "inherit", ...options });
}

function quiet(command, args, options = {}) {
  return spawnSync(command, args, { cwd: ROOT, stdio: "ignore", ...options });
}

// Every npm call below gets this, so none of them can resolve the real registry
// even if the shell has credentials for it.
const npmEnv = { ...process.env, NPM_CONFIG_USERCONFIG: NPMRC };

async function reachable() {
  try {
    const response = await fetch(URL, { signal: AbortSignal.timeout(1000) });
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function stop() {
  if (!existsSync(PIDFILE)) {
    console.log("no registry started by this script is running");
    return;
  }
  const pid = Number(readFileSync(PIDFILE, "utf8").trim());
  try {
    process.kill(pid);
    console.log(`stopped the registry on port ${PORT}`);
  } catch {
    console.log("the registry was not running");
  }
  rmSync(PIDFILE, { force: true });
}

if (process.argv[2] === "stop") {
  stop();
  process.exit(0);
}

mkdirSync(STATE, { recursive: true });

// verdaccio lives in the state directory rather than in devDependencies: it is
// something you run, not something the package is built from, and nothing in
// CI needs it.
const verdaccio = join(STATE, "node_modules", ".bin", "verdaccio");
if (!existsSync(verdaccio)) {
  console.log(`==> installing verdaccio into .local-registry (once)`);
  const install = run(npm, ["install", "--silent", "--no-audit", "--no-fund", "--prefix", STATE, "verdaccio"]);
  if (install.status !== 0) process.exit(install.status ?? 1);
}

// Anonymous publish, because the only client is this script. A registry holding
// one package and answering on localhost has nothing to authenticate.
//
// The uplink is what makes the test worth running. This package depends on React
// and a dozen others, so a registry that proxies nothing cannot install it: npm
// resolves the tree, finds no react, and fails before it reads a single export.
// Locally published versions still win, so the copy under test is the one that
// gets installed.
writeFileSync(CONFIG, `storage: ./storage
auth:
  htpasswd:
    file: ./htpasswd
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
    cache: true
packages:
  '@codesweep-ai/*':
    access: $anonymous
    publish: $anonymous
    unpublish: $anonymous
    proxy: npmjs
  '**':
    access: $anonymous
    publish: $anonymous
    proxy: npmjs
log: { type: stdout, format: pretty, level: warn }
`);

// npm sends credentials even where none are wanted, so it is given some.
writeFileSync(NPMRC, `registry=${URL}/\n//localhost:${PORT}/:_authToken=local-only\n`);

if (await reachable()) {
  console.log(`==> registry already up at ${URL}`);
} else {
  console.log(`==> starting the registry on port ${PORT}`);
  const child = spawn(verdaccio, ["--config", CONFIG, "--listen", PORT], {
    cwd: STATE,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  writeFileSync(PIDFILE, `${child.pid}\n`);
  let up = false;
  for (let i = 0; i < 50 && !up; i += 1) {
    await sleep(200);
    up = await reachable();
  }
  if (!up) {
    console.error(`the registry did not come up on ${URL}`);
    process.exit(1);
  }
}

const { name, version } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

// A version cannot be published twice, and a script meant to be run after every
// change would stop at the second run. Dropping the previous copy first is what
// makes this repeatable, and is only safe because the registry is this one.
console.log(`==> replacing ${name}@${version}, if it is already there`);
quiet(npm, ["unpublish", "--force", `${name}@${version}`], { env: npmEnv });

console.log("==> publishing");
// Staged first, so this publishes what a consumer would actually install —
// including the README the package ships rather than the one the repository has.
const staged = run(npm, ["run", "stage"]);
if (staged.status !== 0) process.exit(staged.status ?? 1);
const published = run(npm, ["publish", ".package", "--access", "public"], { env: npmEnv });
if (published.status !== 0) process.exit(published.status ?? 1);

console.log(`
Published ${name}@${version} to the registry on this machine.

  Browse   ${URL}/-/web/detail/${name}
  Install  NPM_CONFIG_USERCONFIG=${NPMRC} npm install ${name}
  Stop     node scripts/local-registry.mjs stop
`);
