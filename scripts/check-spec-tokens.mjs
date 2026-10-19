#!/usr/bin/env node
// Hold the specification's complete token listing to the file it lists.
//
// DESIGN_SYSTEM_SPEC.md presents one section as the complete `tokens.css`, and
// CONTRIBUTING.md sends a reader looking for a token there. Section 8 also
// forbids a project to redefine a token that section 4 names, so a token the
// listing leaves out is one a project may redefine without breaking the rule
// as written. A listing copied by hand named about half the tokens and gave
// `--fg` a value the file no longer had (CUI-132).
//
// So the section's css block is `src/styles/tokens.css`, verbatim, and this
// check fails when the two differ. `--write` copies the file into the block and
// leaves every other line of the specification as it was.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = join(ROOT, "DESIGN_SYSTEM_SPEC.md");
const TOKENS = join(ROOT, "src", "styles", "tokens.css");
const HEADING = /^###\s+\S+\s+Complete `tokens\.css`\s*$/;

/**
 * The line range of the listing's css block: `first` is the line after the
 * opening fence and `end` the closing fence, both 0-based. Null where the
 * section or its block is missing.
 */
export function findListing(lines) {
  const heading = lines.findIndex((l) => HEADING.test(l));
  if (heading < 0) return null;
  let open = -1;
  for (let i = heading + 1; i < lines.length; i += 1) {
    if (/^#{1,3}\s/.test(lines[i])) return null;
    if (lines[i].trim() === "```css") {
      open = i;
      break;
    }
  }
  if (open < 0) return null;
  for (let i = open + 1; i < lines.length; i += 1) if (lines[i].trim() === "```") return { first: open + 1, end: i };
  return null;
}

/** The custom properties a stylesheet declares, in order, once each. */
export function declaredTokens(css) {
  return [...new Set([...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1]))];
}

/** What the specification gets wrong about the token file. Empty when it holds. */
export function check(spec, tokens) {
  const lines = spec.split("\n");
  const at = findListing(lines);
  if (!at) return ["DESIGN_SYSTEM_SPEC.md has no \"Complete `tokens.css`\" section with a css block"];
  const listed = lines.slice(at.first, at.end);
  const file = tokens.replace(/\n$/, "").split("\n");
  if (listed.join("\n") === file.join("\n")) return [];

  const problems = [];
  const names = declaredTokens(listed.join("\n"));
  const missing = declaredTokens(tokens).filter((t) => !names.includes(t));
  const extra = names.filter((t) => !declaredTokens(tokens).includes(t));
  if (missing.length) problems.push(`the listing leaves out ${missing.length} token(s) tokens.css declares: ${missing.join(", ")}`);
  if (extra.length) problems.push(`the listing names ${extra.length} token(s) tokens.css does not declare: ${extra.join(", ")}`);
  const differs = file.findIndex((l, i) => listed[i] !== l);
  const n = differs < 0 ? file.length : differs;
  problems.push(
    `DESIGN_SYSTEM_SPEC.md:${at.first + n + 1} differs from tokens.css:${n + 1}: ` +
      `${JSON.stringify(listed[n] ?? "(end of listing)")} where the file has ${JSON.stringify(file[n] ?? "(end of file)")}`,
  );
  return problems;
}

/** The specification with its listing replaced by the token file. */
export function write(spec, tokens) {
  const lines = spec.split("\n");
  const at = findListing(lines);
  if (!at) throw new Error("DESIGN_SYSTEM_SPEC.md has no \"Complete `tokens.css`\" section with a css block");
  return [...lines.slice(0, at.first), ...tokens.replace(/\n$/, "").split("\n"), ...lines.slice(at.end)].join("\n");
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const spec = readFileSync(SPEC, "utf8");
  const tokens = readFileSync(TOKENS, "utf8");
  if (process.argv.includes("--write")) {
    writeFileSync(SPEC, write(spec, tokens));
    console.log(`✓ spec tokens: copied src/styles/tokens.css into DESIGN_SYSTEM_SPEC.md`);
  } else {
    const problems = check(spec, tokens);
    if (problems.length) {
      console.error("✗ spec tokens: DESIGN_SYSTEM_SPEC.md's complete tokens.css is not the file:");
      for (const p of problems) console.error(`  - ${p}`);
      console.error("\nRun `npm run spec:tokens` to copy the file in, and commit both.");
      process.exit(1);
    }
    console.log(`✓ spec tokens: DESIGN_SYSTEM_SPEC.md lists tokens.css verbatim, ${declaredTokens(tokens).length} tokens`);
  }
}
