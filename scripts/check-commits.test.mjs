import assert from "node:assert/strict";
import test from "node:test";

import { checkMessage } from "./check-commits.mjs";

const TRAILER = "Co-Authored-By: Someone <nobody@example.com>";

function problems(subject, body = "") {
  return checkMessage(subject, body);
}

test("a message following CONTRIBUTING passes", () => {
  assert.deepEqual(
    problems("Give meta its own neutral step", `A sentence that says why.\n\n${TRAILER}`),
    [],
  );
});

test("the subject rules", () => {
  assert.deepEqual(problems("A".repeat(59)), []);
  assert.match(problems("A".repeat(60))[0], /60 characters/);
  assert.match(problems("give meta its own neutral step")[0], /capital/);
  assert.match(problems("Give meta its own neutral step.")[0], /full stop/);
  assert.match(problems("")[0], /empty/);
});

test("a category prefix is rejected in every shape the guide names", () => {
  for (const subject of ["feat: Add a thing", "fix(ui): Add a thing", "[docs] Add a thing"]) {
    assert.match(problems(subject).join(" "), /category prefix/, subject);
  }
  // A colon inside an ordinary subject is not a prefix.
  assert.deepEqual(problems("Say what Tooltip: the component, does"), []);
});

test("the body wrap, which is the rule this checker was written for", () => {
  const at72 = "x".repeat(72);
  assert.deepEqual(problems("Subject", at72), []);
  assert.match(problems("Subject", `${at72}x`)[0], /73 columns/);
});

test("body length and shape", () => {
  assert.match(problems("Subject", "one.\n\ntwo.\n\nthree.")[0], /3 paragraphs/);
  const long = Array.from({ length: 121 }, () => "word").join("\n");
  assert.match(problems("Subject", long).join(" "), /121 words/);
});

test("only Co-Authored-By survives", () => {
  assert.deepEqual(problems("Subject", `Body.\n\n${TRAILER}`), []);
  const extra = `Body.\n\n${TRAILER}\nClaude-Session: https://example.com/x`;
  assert.match(problems("Subject", extra)[0], /Claude-Session trailer is not kept/);
});

// The audit this checker replaces reported two false positives, on ordinary
// prose lines that happened to begin with a word and a colon. Neither is a
// trailer: a trailer block is the last thing in the message, and its keys are
// capitalised.
test("a wrapped prose line beginning with a word and a colon is prose", () => {
  const body = [
    "Two gates now cover part of it. They watch for two kinds of",
    "context: one for drift from the design system, and one for how",
    "read.",
    "",
    TRAILER,
  ].join("\n");
  assert.deepEqual(problems("Watch the two kinds of drift", body), []);
});

test("a trailer key that is not last is prose too", () => {
  const body = `Note: this reads as prose because text follows it.\n\nAnd here it is.\n\n${TRAILER}`;
  assert.deepEqual(problems("Subject", body), []);
});
