#!/usr/bin/env node
// Publish the staged package, unless this commit has published it already.
//
// npm refuses a version twice, so a publish run again after it went through
// fails with nothing left to do: a ci re-run on a commit the dev channel already
// has, or a release re-run because its GitHub release failed after npm took the
// package. The registry records the commit each version came from as its
// gitHead. A version this commit published is skipped, and one published from
// any other commit stops the run, because that is a version reused, not a re-run.
//
//   npm run stage && node scripts/publish-staged.mjs --tag dev --provenance --access public
//
// Every argument goes to `npm publish .package` as it is, --dry-run included.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STAGE = join(ROOT, ".package");

function fail(message) {
  console.error(`publish-staged: ${message}`);
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(readFileSync(join(STAGE, "package.json"), "utf8"));
} catch {
  fail("nothing is staged in .package/. Run `npm run stage` first.");
}
const spec = `${manifest.name}@${manifest.version}`;
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();

// The commit the registry says published this version, or null when it does not
// hold that version. Any other failure stops here rather than reading as "not
// published yet".
const view = spawnSync("npm", ["view", spec, "gitHead"], { cwd: ROOT, encoding: "utf8" });
let publishedFrom = null;
if (view.status === 0) {
  publishedFrom = view.stdout.trim() || "an unrecorded commit";
} else if (!/\bE404\b/.test(view.stderr ?? "")) {
  fail(`could not ask the registry about ${spec}:\n${(view.stderr || view.error?.message || "").trim()}`);
}

if (publishedFrom === head) {
  console.log(`${spec} is already published from this commit; skipping it.`);
  process.exit(0);
}
if (publishedFrom) {
  fail(`${spec} is already published, from ${publishedFrom} rather than ${head}.`);
}

const publish = spawnSync("npm", ["publish", ".package", ...process.argv.slice(2)], {
  cwd: ROOT,
  stdio: "inherit",
});
process.exit(publish.status ?? 1);
