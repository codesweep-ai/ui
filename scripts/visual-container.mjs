#!/usr/bin/env node
// The visual gate compares pixels, so it only answers a useful question when
// every run renders in the same place. Text metrics come from the host's fonts
// and glyph rasterisation from the host's Chromium, and neither is something a
// checkout carries: the same commit measured a toast at 181x38, 173x38 and
// 167x38 on three machines. So the gate does not run on the host. It runs in
// the Playwright image, which pins both.
//
// The tag follows the installed playwright version rather than a constant, so
// bumping the package moves the image with it and the two cannot drift apart.

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const { version } = createRequire(import.meta.url)("playwright/package.json");
const IMAGE = `mcr.microsoft.com/playwright:v${version}-noble`;

const command = process.argv[2];
if (command !== "capture" && command !== "compare") {
  throw new Error("usage: node scripts/visual-container.mjs <capture|compare>");
}

// Docker first because it is what the workflow has, podman second because it is
// what a contributor is more likely to already be running.
function runtime() {
  const named = process.env.VISUAL_CONTAINER_RUNTIME;
  const candidates = named ? [named] : ["docker", "podman"];
  for (const candidate of candidates) {
    if (spawnSync(candidate, ["info"], { stdio: "ignore" }).status === 0) return candidate;
  }
  return null;
}

const engine = runtime();
if (!engine) {
  console.error(`visual: no container runtime. ${IMAGE} is where this gate renders,`);
  console.error("and a host run measures different pixels, so there is nothing useful to fall");
  console.error("back to. Start Docker or podman, or set VISUAL_CONTAINER_RUNTIME.");
  process.exit(2);
}

// CHROME_BIN is resolved inside the image by the same playwright that will
// launch it, so the browser is never a second thing to keep in step by hand.
const script = [
  'CHROME_BIN="$(node -e "process.stdout.write(require(\'playwright\').chromium.executablePath())")"',
  "export CHROME_BIN",
  "npm run preview:build",
  `node scripts/visual-baseline.mjs ${command}`,
].join("\n");

const args = [
  "run", "--rm", "--init",
  ...(process.stdout.isTTY ? ["-t"] : []),
  // :z relabels the mount for SELinux, which is enforcing on the distributions
  // podman comes from. Without it the container cannot read /work at all, and
  // the first thing to fail is a require() that reports a missing module rather
  // than a denied directory. Docker accepts the flag and ignores it elsewhere.
  "-v", `${ROOT}:/work:z`,
  "-w", "/work",
  // Docker runs the container as root, so without this it writes preview/dist and
  // visual-baseline as root and the next host command cannot clean up after it.
  // Rootless podman already maps the container's root to the invoking user, and
  // passing --user there maps to a subuid that owns nothing: the mount turns
  // read-only from inside and the build fails writing its own temp file.
  ...(engine === "docker" ? ["--user", `${process.getuid()}:${process.getgid()}`] : []),
  "-e", "HOME=/tmp",
  "-e", "PLAYWRIGHT_BROWSERS_PATH=/ms-playwright",
  ...(process.env.KEEP_VISUAL_CURRENT ? ["-e", "KEEP_VISUAL_CURRENT"] : []),
  IMAGE,
  "sh", "-euc", script,
];

console.log(`visual: ${command} in ${IMAGE} via ${engine}`);
const result = spawnSync(engine, args, { stdio: "inherit" });
if (result.error) {
  console.error(`visual: cannot run ${engine}: ${result.error.message}`);
  process.exit(2);
}
process.exit(result.status ?? 1);
