#!/usr/bin/env node
// Build the site the way GitHub Pages builds it, before a merge rather than
// after one.
//
// `pages.yml` only runs on a push to `main`, so until this gate existed the
// first build of the site happened after the merge and reported to whoever
// merged. CUI-073 is what that cost once: eleven Liquid braces reached `main`.
// Section 9 of check-integrity.mjs catches that one failure mode. It does not
// build the site, so a change to _config.yml, a document that gains a YAML
// header, or anything else Jekyll refuses still went unnoticed until too late.
//
// This runs the same image `actions/jekyll-build-pages@v1` runs, so the gem,
// the plugin set and the Jekyll version are the ones that will build the real
// site rather than an approximation of them. Like the visual gate it needs a
// container runtime and nothing else: no Ruby on the host, no Gemfile in the
// tree. Without a runtime it exits 2, which `npm run ci` reports as a skip.

import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..");
const DESTINATION = "_site";

// The workflow pins `@v1`, which is itself a moving tag: the action and this
// image advance together, so following `latest` here keeps the two in step
// rather than pinning one of them to a version the other has left behind.
const IMAGE = "ghcr.io/actions/jekyll-build-pages:latest";

// The repository the metadata plugin resolves. The entrypoint takes this from
// GITHUB_REPOSITORY; without it the plugin has no repository to describe.
const REPO_NWO = process.env.GITHUB_REPOSITORY || "codesweep-ai/ui";

// Docker first because it is what the workflow has, podman second because it is
// what a contributor is more likely to already be running.
function runtime() {
  const named = process.env.PAGES_CONTAINER_RUNTIME;
  for (const candidate of named ? [named] : ["docker", "podman"]) {
    if (spawnSync(candidate, ["info"], { stdio: "ignore" }).status === 0) return candidate;
  }
  return null;
}

const engine = runtime();
if (!engine) {
  console.error(`pages: no container runtime. ${IMAGE} is where the site is built,`);
  console.error("and it is the only place the real gem and plugin set exist. Start Docker or");
  console.error("podman, or set PAGES_CONTAINER_RUNTIME.");
  process.exit(2);
}

if (spawnSync(engine, ["image", "inspect", IMAGE], { stdio: "ignore" }).status !== 0) {
  console.log(`pages: pulling ${IMAGE}`);
  if (spawnSync(engine, ["pull", IMAGE], { stdio: "inherit" }).status !== 0) {
    console.error(`pages: cannot obtain ${IMAGE}, which is where the site is built.`);
    process.exit(2);
  }
}

// A stale destination hides a page that stopped being generated, so the build
// always starts from nothing.
rmSync(path.join(ROOT, DESTINATION), { recursive: true, force: true });

// The image's own entrypoint exports JEKYLL_GITHUB_TOKEN from an input this
// gate has no value for, and the metadata plugin reads an empty token as bad
// credentials and fails. Calling the gem directly leaves the variable unset,
// which the plugin treats as "unauthenticated" and warns about instead. The
// arguments below are the ones entrypoint.sh builds.
const args = [
  "run", "--rm", "--init",
  // :z relabels the mount for SELinux, which is enforcing on the distributions
  // podman comes from. Docker accepts the flag and ignores it elsewhere.
  "-v", `${ROOT}:/work:z`,
  "-w", "/usr/local/bundle",
  ...(engine === "docker" ? ["--user", `${process.getuid()}:${process.getgid()}`] : []),
  "-e", `PAGES_REPO_NWO=${REPO_NWO}`,
  "-e", "JEKYLL_ENV=production",
  "--entrypoint", "/usr/local/bundle/bin/github-pages",
  IMAGE,
  "build", "--source", "/work/.", "--destination", `/work/${DESTINATION}`,
];

console.log(`pages: building the site in ${IMAGE} via ${engine}`);
const result = spawnSync(engine, args, { stdio: "inherit" });
if (result.error) {
  console.error(`pages: cannot run ${engine}: ${result.error.message}`);
  process.exit(2);
}
if (result.status !== 0) {
  console.error("\npages: Jekyll refused this tree, so a push to main would publish nothing.");
  console.error("The error above is what the pages workflow would report after the merge.");
  process.exit(result.status ?? 1);
}
console.log(`pages: the site built into ${DESTINATION}/.`);
