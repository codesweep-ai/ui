import assert from "node:assert/strict";
import test from "node:test";

import { check, declaredTokens, findListing, write } from "./check-spec-tokens.mjs";

const TOKENS = [":root {", "  --space-1: 0.25rem;", "  --fg: #d1d9e0;", "}", ""].join("\n");

function spec(listing) {
  return [
    "## 4. Design Tokens",
    "",
    "### 4.19 Complete `tokens.css`",
    "",
    "```css",
    ...listing,
    "```",
    "",
    "### 4.20 Page Width",
    "",
    "Text after the listing.",
    "",
  ].join("\n");
}

test("passes a listing that is the token file verbatim", () => {
  assert.deepEqual(check(spec([":root {", "  --space-1: 0.25rem;", "  --fg: #d1d9e0;", "}"]), TOKENS), []);
});

test("names every token the listing leaves out", () => {
  const problems = check(spec([":root {", "  --space-1: 0.25rem;", "}"]), TOKENS);

  assert.match(problems[0], /leaves out 1 token\(s\) tokens\.css declares: --fg/);
});

test("fails a value the file no longer has, and names both lines", () => {
  // The listing this check replaced gave --fg a colour tokens.css had moved on
  // from, and naming every token would not have caught it.
  const problems = check(spec([":root {", "  --space-1: 0.25rem;", "  --fg: #e6edf3;", "}"]), TOKENS);

  assert.equal(problems.length, 1);
  assert.match(problems[0], /DESIGN_SYSTEM_SPEC\.md:8 differs from tokens\.css:3: "  --fg: #e6edf3;" where the file has "  --fg: #d1d9e0;"/);
});

test("names a token the listing keeps after the file dropped it", () => {
  const problems = check(spec([":root {", "  --space-1: 0.25rem;", "  --fg: #d1d9e0;", "  --gone: 1px;", "}"]), TOKENS);

  assert.match(problems.join("\n"), /names 1 token\(s\) tokens\.css does not declare: --gone/);
});

test("refuses a specification without the section", () => {
  assert.match(check("# Spec\n\nNo listing here.\n", TOKENS)[0], /has no "Complete `tokens\.css`" section/);
  assert.equal(findListing(["### 4.19 Complete `tokens.css`", "", "### 4.20 Page Width", "```css", "```"]), null);
});

test("writes the file into the listing and leaves the rest of the specification alone", () => {
  const before = spec([":root {", "  --space-1: 1rem;", "}"]);
  const after = write(before, TOKENS);

  assert.deepEqual(check(after, TOKENS), []);
  assert.equal(after.split("```css")[0], before.split("```css")[0]);
  assert.equal(after.split("```\n").at(-1), before.split("```\n").at(-1));
});

test("lists each declared token once, in order", () => {
  const css = [":root {", "  --a: 1;", "  --b: 2;", "}", ':root[data-theme="light"] {', "  --a: 3;", "}"].join("\n");

  assert.deepEqual(declaredTokens(css), ["--a", "--b"]);
});
