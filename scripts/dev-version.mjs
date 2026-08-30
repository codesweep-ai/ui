#!/usr/bin/env node
// The version a build of one commit publishes under.
//
// A release carries the version in package.json. Every commit between two
// releases needs a version of its own, because npm refuses to publish over one
// that already exists, and there is no second chance: unpublishing does not
// free the name either.
//
//   0.2.0        the release in package.json
//   0.2.1-dev.20260829120000.a1b2c3d   a build of one commit after it
//
// The patch is bumped so the build sorts above the release it follows and below
// the release it precedes. Naming it for the current version instead would sort
// it *below* code it is newer than, because a prerelease of X always precedes X.
// That is the same position Go's own pseudo-versions take, which is where this
// shape comes from.
//
// The timestamp is the commit's, not the clock's, so the same commit always
// produces the same version and a rebuild is idempotent. The short hash makes
// two commits sharing a second distinct.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`dev-version: ${message}`);
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const parts = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!parts) {
  fail(`package.json holds "${version}", which is not a plain release version.`);
}
const [, major, minor, patch] = parts;

let stamp;
let hash;
try {
  // %cd with this format is the commit date in UTC, so a build on any machine
  // in any timezone names the commit the same way.
  stamp = git("log", "-1", "--format=%cd", "--date=format-local:%Y%m%d%H%M%S");
  hash = git("rev-parse", "--short=7", "HEAD");
} catch {
  fail("no git history to read a commit from. A dev version names one commit.");
}

// A tree with uncommitted changes describes no commit, and the version would
// claim one. CI always has a clean checkout; a laptop may not.
if (git("status", "--porcelain")) {
  fail("the working tree has uncommitted changes, so no commit describes it.");
}

process.stdout.write(`${major}.${minor}.${Number(patch) + 1}-dev.${stamp}.${hash}\n`);
