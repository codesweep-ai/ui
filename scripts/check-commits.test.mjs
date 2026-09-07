import assert from "node:assert/strict";
import test from "node:test";

import { COLUMNS, widestBodyLine } from "./check-commits.mjs";

const TRAILER = "Co-Authored-By: Someone <nobody@example.com>";

test("a body at the wrap passes, and one column over does not", () => {
  const at = "x".repeat(COLUMNS);
  assert.equal(widestBodyLine(at), COLUMNS);
  assert.equal(widestBodyLine(`${at}x`), COLUMNS + 1);
});

test("no body is not a wide body", () => {
  assert.equal(widestBodyLine(""), 0);
  assert.equal(widestBodyLine(TRAILER), 0);
});

test("a trailer is exempt, because an address is as long as it is", () => {
  const long = "Co-Authored-By: Someone With A Very Long Name Indeed <someone@example.com>";
  assert.ok(long.length > COLUMNS);
  assert.equal(widestBodyLine(`Body.\n\n${long}`), 5);
});

// The audit this replaces reported two false positives, on ordinary prose lines
// that happened to begin with a word and a colon. A trailer block is the last
// thing in a message and its keys are capitalised.
test("a wrapped prose line beginning with a word and a colon is prose", () => {
  const body = `They watch for two kinds of\ncontext: one for drift, one for how they read.\n\n${TRAILER}`;
  // The `context:` line is the widest prose at 46, and it is prose.
  assert.equal(widestBodyLine(body), 46);
});

test("a capitalised key with prose after it is prose too", () => {
  const body = `Note: this is prose because text follows it.\n\nAnd here it is.\n\n${TRAILER}`;
  assert.equal(widestBodyLine(body), 44);
});

test("the widest line wins, not the first over", () => {
  const body = `${"x".repeat(74)}\n${"y".repeat(80)}\n\n${TRAILER}`;
  assert.equal(widestBodyLine(body), 80);
});
