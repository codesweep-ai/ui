import assert from "node:assert/strict";
import test from "node:test";

import { publishedReadme, publishedCatalog, publishedManifest } from "./stage-package.mjs";

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

// catalog.json is the one document that ships beside the code, and AGENTS.md
// tells an agent to search it before building any UI. Its `spec` paths are
// relative to the repository, which an install does not have, so unrewritten
// they send that agent to a file that is not there. That is CUI-086.

const CATALOG = JSON.stringify({
  $generated: "Do not edit.",
  counts: { components: 1, patterns: 1 },
  components: [{ spec: "components/Button.md", name: "Button" }],
  patterns: [{ spec: "patterns/Form.md", name: "Form" }],
});

test("pins every catalog spec to the commit rather than leaving it relative", () => {
  const out = JSON.parse(publishedCatalog(CATALOG, SHA));

  assert.equal(out.components[0].spec, `https://github.com/codesweep-ai/ui/blob/${SHA}/components/Button.md`);
  assert.equal(out.patterns[0].spec, `https://github.com/codesweep-ai/ui/blob/${SHA}/patterns/Form.md`);
  assert.doesNotMatch(publishedCatalog(CATALOG, SHA), /\/blob\/main\//);
});

test("says in the catalog itself which commit its specs point at", () => {
  const out = JSON.parse(publishedCatalog(CATALOG, SHA));

  assert.ok(out.$generated.includes(SHA), "the generated note should name the commit");
});

test("refuses to ship a catalog entry that points nowhere", () => {
  // The same guard the README has. A pointer that reaches the tarball still
  // relative resolves against a repository the reader has not got.
  const broken = JSON.stringify({
    components: [{ spec: "components/Button.md", name: "Button" }, { name: "Orphan" }],
  });

  assert.throws(() => publishedCatalog(broken, SHA), /not absolute.*Orphan/s);
});

test("refuses to stage a catalog or a manifest without a commit", () => {
  assert.throws(() => publishedCatalog(CATALOG, ""), /no commit/);
  assert.throws(() => publishedManifest({ name: "x" }, ""), /no commit/);
});

test("pins the manifest homepage and drops what a package must not carry", () => {
  const out = JSON.parse(publishedManifest(
    { name: "x", homepage: "https://github.com/codesweep-ai/ui#readme", scripts: { build: "x" }, devDependencies: { v: "1" } },
    SHA,
  ));

  assert.equal(out.homepage, `https://github.com/codesweep-ai/ui/blob/${SHA}/README.md`);
  assert.doesNotMatch(out.homepage, /#readme$/);
  assert.equal(out.scripts, undefined);
  assert.equal(out.devDependencies, undefined);
});
