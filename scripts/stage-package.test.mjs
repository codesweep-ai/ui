import assert from "node:assert/strict";
import test from "node:test";

import { publishedReadme } from "./stage-package.mjs";

// The published README is the only documentation an install carries, and its
// links are the only route to the rest. Pinning them to the commit the build
// came from is what stops a reader on a dev build being sent to documentation
// for code they do not have. That is CUI-071.

const SHA = "0db9db173d714da625c2a58713f05d16fac7a131";
const README = [
  "# Package",
  "",
  "See [CATALOG.md](CATALOG.md) and the [components](components/) directory.",
  "",
  "## Docs",
  "",
  "- [INSTALL.md](INSTALL.md) · getting it",
  "",
].join("\n");

test("pins every link to the commit rather than to a branch", () => {
  const out = publishedReadme(README, SHA);

  assert.match(out, new RegExp(`/blob/${SHA}/CATALOG\\.md`));
  assert.match(out, new RegExp(`/tree/${SHA}/components`));
  assert.match(out, new RegExp(`/blob/${SHA}/INSTALL\\.md`));
  assert.doesNotMatch(out, /\/blob\/main\/|\/tree\/main\//);
});

test("names the commit and the one file that does ship", () => {
  const out = publishedReadme(README, SHA);

  assert.ok(out.includes(SHA), "the note should say which commit the links point at");
  assert.ok(out.includes("catalog.json"), "the note should say catalog.json ships");
});

test("refuses to stage without a commit to pin to", () => {
  // Better than quietly falling back to `main`, which is the defect.
  assert.throws(() => publishedReadme(README, ""), /no commit to pin/);
});

test("still refuses a link the rewrite could not reach", () => {
  // A link carrying a title is a form the rewrite does not recognise. The
  // guard is deliberately looser so it can see what the rewrite cannot.
  const withTitle = README.replace("[INSTALL.md](INSTALL.md)", '[INSTALL.md](INSTALL.md "Install")');

  assert.throws(() => publishedReadme(withTitle, SHA), /still relative/);
});

test("leaves absolute links alone", () => {
  const external = README.replace("[CATALOG.md](CATALOG.md)", "[npm](https://www.npmjs.com/)");
  const out = publishedReadme(external, SHA);

  assert.ok(out.includes("[npm](https://www.npmjs.com/)"));
});
