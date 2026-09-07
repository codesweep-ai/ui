#!/usr/bin/env node
// The one commit rule nothing else checks: a body wrapped at 72 columns.
//
// `cs-lint oss` already owns the rest of CONTRIBUTING's Commits section and
// already runs, both inside `npm run check` and as its own CI job. OSS-702
// holds the subject to its length, its capital, its missing full stop and its
// missing category prefix. OSS-701 rejects a session link. OSS-709, OSS-710 and
// OSS-711 hold the body to its bullets, its subject matter and its length.
//
// The wrap is the gap. An audit of 117 commits found every other rule holding
// and 29 bodies one to five columns over, so this checks that and nothing else.
// Duplicating a rule that already runs would give a contributor two checkers to
// satisfy and two places for them to disagree.
//
// The durable home for this is an OSS rule in cs-lint, where every project in
// the family would get it. That binary lives in another repository, so this is
// the local stand-in until it does.
//
// The history is not rewritten to make it clean. 54 of the ledger's records
// cite a sha on this branch, 71 citations across 60 commits, and a closed
// record has to cite a sha that exists. So the rule is gated from BASELINE on.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** The last commit written before this check existed. */
export const BASELINE = "58668d6";

export const COLUMNS = 72;

const TRAILER = /^[A-Z][A-Za-z-]*:\s/;

/**
 * The columns of the widest body line, ignoring the trailer block. Returns 0
 * for a body that is only trailers, or none at all.
 *
 * Trailers are exempt because an address is as long as it is: a
 * `Co-Authored-By` line cannot be wrapped and is not prose.
 */
export function widestBodyLine(body) {
  const lines = body.split("\n");
  // The trailer block is the last run of lines, and its keys are capitalised. A
  // wrapped prose line beginning "context:" is prose, and an audit that missed
  // that reported two false positives.
  const start = lines.findIndex(
    (line, i) => TRAILER.test(line) && lines.slice(i).every((rest) => !rest.trim() || TRAILER.test(rest)),
  );
  const prose = start === -1 ? lines : lines.slice(0, start);
  return prose.reduce((widest, line) => Math.max(widest, line.length), 0);
}

function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout : null;
}

/** Every commit in `range`, as `{ sha, subject, body }`. */
export function commitsIn(range) {
  const raw = git("log", range, "--format=%h%x00%s%x00%b%x1e");
  if (raw === null) return null;
  return raw
    .split("\x1e")
    .filter((entry) => entry.trim())
    .map((entry) => {
      const [sha, subject, body] = entry.replace(/^\n/, "").split("\x00");
      return { sha, subject, body: body ?? "" };
    });
}

function main() {
  const fileArg = process.argv.indexOf("--file");
  if (fileArg !== -1) {
    // The commit-msg hook's path: one message, before the commit exists, which
    // is the only moment a wrap is cheap to fix.
    const raw = readFileSync(process.argv[fileArg + 1], "utf8");
    const body = raw
      .split("\n")
      .filter((line) => !line.startsWith("#"))
      .slice(1)
      .join("\n");
    const widest = widestBodyLine(body);
    if (widest > COLUMNS) {
      console.error(`commit message: a body line is ${widest} columns, and the wrap is ${COLUMNS}.`);
      console.error("CONTRIBUTING.md, under Commits, has the rule and the reasoning.");
      process.exitCode = 1;
    }
    return;
  }

  const commits = commitsIn(`${BASELINE}..HEAD`);
  if (commits === null) {
    // A shallow clone has no range to read, and saying so is better than
    // failing a gate over a checkout depth.
    console.log(`skipped: ${BASELINE}..HEAD is not resolvable here, so no commit body was checked.`);
    return;
  }

  let bad = 0;
  for (const { sha, subject, body } of commits) {
    const widest = widestBodyLine(body);
    if (widest <= COLUMNS) continue;
    bad += 1;
    console.error(`${sha}  ${subject}`);
    console.error(`          a body line is ${widest} columns, and the wrap is ${COLUMNS}`);
  }

  const counted = `${commits.length} commit${commits.length === 1 ? "" : "s"} since ${BASELINE}`;
  if (bad) {
    console.error(`\ncommits: ${bad} of ${counted} run past the ${COLUMNS} column wrap`);
    process.exitCode = 1;
  } else {
    console.log(`commits: ${counted}, all wrapped at ${COLUMNS}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
