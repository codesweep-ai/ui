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

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

// The gate itself. The workflow's prose, refs and readiness jobs each run one
// linter, and `check` runs all three, so they need no step of their own here.
say("the gate a contributor runs before pushing");
run(npm, ["run", "check"]);

// The commit body wrap, which is the one rule in CONTRIBUTING's Commits
// section that `cs-lint oss` does not carry. It runs in the readiness job
// beside the other history rules, so this mirrors it rather than adding to it.
say("commit bodies");
run(npm, ["run", "lint:commits"]);

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

// The site the pages workflow builds. That workflow runs on a push to main and
// nowhere else, so without this the first build of the site happens after the
// merge and reports to whoever merged. The wrapper exits 2 when there is no
// container runtime, which is a machine this gate cannot run on rather than a
// gate that failed.
say("the site the pages workflow builds");
const pages = spawnSync(npm, ["run", "pages:build"], { stdio: "inherit", shell: false });
if (pages.error) {
  console.error(`\nci: cannot run ${npm}: ${pages.error.message}`);
  process.exit(2);
}
if (pages.status === 2) {
  console.log("skipped: no container runtime, so the site was not built.");
  console.log("         Start Docker or podman to close this gap.");
  skipped.push("the site build, for want of a container runtime");
} else if (pages.status !== 0) {
  console.error("\nci: npm run pages:build failed");
  process.exit(pages.status ?? 1);
}

// What the release workflow would send to the registry. `files` and `exports`
// decide that, and both are easy to break without any other gate noticing.
// The rich Markdown rungs, which need a browser but not a pinned one: it reads
// the DOM rather than the pixels, so whichever Chrome puppeteer has will do.
say("the rich Markdown flavours");
run(npm, ["run", "preview:rich-check"]);

say("the package the release workflow would publish");
// `check` above has already built dist/, so this stages without rebuilding it.
run("node", ["scripts/stage-package.mjs"]);
run(npm, ["pack", "--dry-run", ".package"]);

// The ledger's freshness gate, which `check` leaves to this run the way the
// sibling projects do. ledger.html is generated: a record edited without a
// re-render is a page that disagrees with its own JSON.
say("ledger");
run(npm, ["run", "ledger"]);

const ran = skipped.length === 0 ? "ci: every gate ran." : `ci: ${skipped.length} gate(s) did not run.`;
const note = tty ? `\n\x1b[1m${ran}\x1b[0m` : `\n${ran}`;
console.log(`${note} Not reproduced here: the Node 22.13 leg of the`);
console.log("build-test matrix, the clean install from the lockfile that CI starts from,");
// actionlint is a Go binary rather than a dependency of this package. Running it
// only where it happened to be installed made `npm run ci` mean one thing on one
// machine and another thing on the next, so the workflows job on the forge owns
// this gate outright.
console.log("and the workflow files, which the forge's own actionlint job checks.");
for (const gap of skipped) console.log(`Also not reproduced here: ${gap}.`);
