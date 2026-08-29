#!/usr/bin/env node
// Every gate the CI workflow runs, on this machine, in the order the workflow
// takes them. A red build should be something a contributor sees before they
// push rather than after.
//
// `npm run check` is the faster subset to keep beside you while you work. This
// is the one that has to pass, and it is what `.github/workflows/ci.yml` and
// `.github/workflows/release.yml` between them do.
//
// What it cannot reproduce it names on the way out. A run that skipped a gate
// must never read as a run that ran them all.

import { spawnSync } from "node:child_process";

const tty = process.stdout.isTTY;

// A heading above each gate, so a long run reads as a list rather than a wall.
// Bold where a terminal is reading it and plain where a pipe is: `npm run ci >
// ci.log` should leave a log somebody can read.
function say(title) {
  process.stdout.write(tty ? `\n\x1b[1m==> ${title}\x1b[0m\n` : `\n==> ${title}\n`);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) {
    console.error(`\nci: cannot run ${command}: ${result.error.message}`);
    process.exit(2);
  }
  if (result.status !== 0) {
    console.error(`\nci: ${command} ${args.join(" ")} failed`);
    process.exit(result.status ?? 1);
  }
}

// Named on the way out, so the closing line can say what this run did not cover.
const skipped = [];

function onPath(command) {
  return spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

// The gate itself. The workflow's prose, refs and readiness jobs each run one
// linter, and `check` runs all three, so they need no step of their own here.
say("the gate a contributor runs before pushing");
run(npm, ["run", "check"]);

// An invalid workflow file fails the run with zero jobs and no annotation,
// which is the least legible failure the forge produces. actionlint is not an
// npm package, so a machine without it reports a skip rather than a failure.
say("workflows");
if (onPath("actionlint")) {
  run("actionlint", []);
} else {
  console.log("skipped: actionlint is not on the PATH, so the workflow files were not checked.");
  console.log("         Install it from https://github.com/rhysd/actionlint to close this gap.");
  skipped.push("the workflow files, for want of actionlint");
}

// Pixels and the axe report, in the image that pins the fonts and the browser.
// The wrapper exits 2 when there is no container runtime to render in, which is a
// machine this gate cannot run on rather than a gate that failed.
say("the visual baseline");
const visual = spawnSync(npm, ["run", "visual:compare"], { stdio: "inherit", shell: false });
if (visual.error) {
  console.error(`\nci: cannot run ${npm}: ${visual.error.message}`);
  process.exit(2);
}
if (visual.status === 2) {
  console.log("skipped: no container runtime, so the baseline was not compared.");
  console.log("         Start Docker or podman to close this gap.");
  skipped.push("the visual baseline, for want of a container runtime");
} else if (visual.status !== 0) {
  console.error("\nci: npm run visual:compare failed");
  process.exit(visual.status ?? 1);
}

// What the release workflow would send to the registry. `files` and `exports`
// decide that, and both are easy to break without any other gate noticing.
// The rich Markdown rungs, which need a browser but not a pinned one: it reads
// the DOM rather than the pixels, so whichever Chrome puppeteer has will do.
say("the rich Markdown flavours");
run(npm, ["run", "preview:rich-check"]);

say("the package the release workflow would publish");
run(npm, ["pack", "--dry-run"]);

const ran = skipped.length === 0 ? "ci: every gate ran." : `ci: ${skipped.length} gate(s) did not run.`;
const note = tty ? `\n\x1b[1m${ran}\x1b[0m` : `\n${ran}`;
console.log(`${note} Not reproduced here: the Node 22.13 leg of the`);
console.log("build-test matrix, and the clean install from the lockfile that CI starts from.");
for (const gap of skipped) console.log(`Also not reproduced here: ${gap}.`);
