#!/usr/bin/env node
// CONTRIBUTING's Commits section, checked.
//
// Every rule below was already written down and none was enforced, which is the
// class this branch exists to close. An audit found the subject, trailer and
// length rules holding on all 117 commits and the body wrap broken on 29, at
// one to five columns over. They pass by care rather than by gate, and care is
// what runs out at the end of a long session.
//
// The history is not rewritten to make this clean. 54 of the ledger's records
// cite a sha on this branch, 71 citations across 60 commits, and the ledger's
// own rule is that a closed record cites a sha that exists. Rewrapping by
// rebase would dangle every one of them, which is a far worse trade than 29
// bodies a column over. So the rule is gated from BASELINE forward.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

// The last commit written before this check existed. Everything after it is
// held to the rules; everything at or before it predates them.
export const BASELINE = "58668d6";

const SUBJECT_MAX = 60;
const BODY_COLUMNS = 72;
const BODY_WORDS = 120;
const BODY_PARAGRAPHS = 2;
const KEPT_TRAILER = "Co-Authored-By:";

// `feat:`, `fix(ui):`, `[docs]` — the category is already in the diff.
const CATEGORY_PREFIX = /^(\[[^\]]+\]|[a-z][\w-]*(\([^)]*\))?!?:)\s/;
const TRAILER = /^[A-Z][A-Za-z-]*:\s/;

/**
 * Problems with one commit message, as sentences a reader can act on.
 * The message arrives already split, because git gives it that way and a
 * `commit-msg` file does not.
 */
export function checkMessage(subject, body) {
  const problems = [];

  if (!subject.trim()) problems.push("the subject is empty");
  if (subject.length >= SUBJECT_MAX) {
    problems.push(`the subject is ${subject.length} characters, and the limit is ${SUBJECT_MAX}`);
  }
  if (subject[0] && subject[0] !== subject[0].toUpperCase()) {
    problems.push("the subject does not start with a capital");
  }
  if (subject.endsWith(".")) problems.push("the subject ends with a full stop");
  if (CATEGORY_PREFIX.test(subject)) {
    problems.push("the subject carries a category prefix, and the category is already in the diff");
  }

  // Trailers are the last block, and only Co-Authored-By survives.
  const lines = body.split("\n");
  const trailerStart = lines.findIndex(
    (line, i) => TRAILER.test(line) && lines.slice(i).every((rest) => !rest.trim() || TRAILER.test(rest)),
  );
  const prose = (trailerStart === -1 ? lines : lines.slice(0, trailerStart)).join("\n").trim();
  const trailers = trailerStart === -1 ? [] : lines.slice(trailerStart).filter((line) => line.trim());

  for (const trailer of trailers) {
    if (!trailer.startsWith(KEPT_TRAILER)) {
      const name = trailer.split(":")[0];
      problems.push(`the ${name} trailer is not kept; only ${KEPT_TRAILER} is`);
    }
  }

  if (prose) {
    for (const line of prose.split("\n")) {
      if (line.length > BODY_COLUMNS) {
        problems.push(`a body line is ${line.length} columns, and the wrap is ${BODY_COLUMNS}`);
        break;
      }
    }
    const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim());
    if (paragraphs.length > BODY_PARAGRAPHS) {
      problems.push(`the body has ${paragraphs.length} paragraphs, and the limit is ${BODY_PARAGRAPHS}`);
    }
    const words = prose.split(/\s+/).filter(Boolean).length;
    if (words > BODY_WORDS) {
      problems.push(`the body is ${words} words, and the limit is ${BODY_WORDS}`);
    }
  }

  return problems;
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
    // The commit-msg hook's path: one message, before the commit exists.
    const raw = readFileSync(process.argv[fileArg + 1], "utf8");
    const withoutComments = raw
      .split("\n")
      .filter((line) => !line.startsWith("#"))
      .join("\n");
    const [subject, ...rest] = withoutComments.split("\n");
    const problems = checkMessage(subject ?? "", rest.join("\n"));
    if (problems.length) {
      console.error("commit message:");
      for (const problem of problems) console.error(`  - ${problem}`);
      console.error("\nCONTRIBUTING.md, under Commits, has the rules and the reasoning.");
      process.exitCode = 1;
    }
    return;
  }

  const commits = commitsIn(`${BASELINE}..HEAD`);
  if (commits === null) {
    // A shallow clone has no range to read, and reporting that is better than
    // failing a gate over a checkout depth.
    console.log(`skipped: ${BASELINE}..HEAD is not resolvable here, so no commit message was checked.`);
    return;
  }

  let bad = 0;
  for (const { sha, subject, body } of commits) {
    const problems = checkMessage(subject, body);
    if (!problems.length) continue;
    bad += 1;
    console.error(`${sha}  ${subject}`);
    for (const problem of problems) console.error(`          ${problem}`);
  }

  const counted = `${commits.length} commit${commits.length === 1 ? "" : "s"} since ${BASELINE}`;
  if (bad) {
    console.error(`\ncommits: ${bad} of ${counted} break a rule in CONTRIBUTING.md`);
    process.exitCode = 1;
  } else {
    console.log(`commits: ${counted}, all within the rules`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
