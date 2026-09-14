import assert from "node:assert/strict";
import test from "node:test";

import {
  publishedReadme,
  publishedCatalog,
  publishedManifest,
  assertCommitIsFetchable,
  inspectionOnly,
} from "./stage-package.mjs";

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

test("pins the entries in an array this catalog has never carried before", () => {
  // `components` and `patterns` are what gen-catalog.mjs writes today. A third
  // kind of entry must not be able to reach the tarball still pointing at the
  // repository, which is what walking those two arrays by name would allow.
  const withTokens = JSON.stringify({
    $generated: "Do not edit.",
    counts: { components: 1, tokens: 1 },
    components: [{ spec: "components/Button.md", name: "Button" }],
    tokens: [{ spec: "tokens/Color.md", name: "Color" }],
  });

  const out = JSON.parse(publishedCatalog(withTokens, SHA));

  assert.equal(out.tokens[0].spec, `https://github.com/codesweep-ai/ui/blob/${SHA}/tokens/Color.md`);
  assert.equal(out.components[0].spec, `https://github.com/codesweep-ai/ui/blob/${SHA}/components/Button.md`);
});

test("refuses a dead entry in an array it has never seen before", () => {
  // The rewrite and the guard have to cover the same ground. An array only the
  // guard reached would fail every build; one only the rewrite reached would
  // ship a dead pointer quietly.
  const broken = JSON.stringify({
    components: [{ spec: "components/Button.md", name: "Button" }],
    tokens: [{ name: "Orphan" }],
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

// A commit nobody can fetch ships a package whose every documentation link
// 404s, and the publish says nothing. That is CUI-087. The runner is injected
// so these ask about the logic rather than about whatever this checkout holds.

test("accepts a commit a remote branch or a tag contains", () => {
  // The two questions get different answers, and the second one is the answer
  // that disarms the check. A run that asked it anyway, or that judged by it,
  // reaches a different verdict rather than the same one by luck.
  const asked = [];
  const run = (args) => {
    asked.push(args.join(" "));
    return args.includes("--contains") ? "refs/tags/v0.3.0\n" : "";
  };

  assert.equal(assertCommitIsFetchable(SHA, run), "contained");
  assert.equal(asked.length, 1, "a ref that contains the commit answers it; nothing else is asked");
  assert.match(asked[0], /--contains/);
});

test("refuses a commit no remote branch and no tag contains", () => {
  const run = (args) => (args.includes("--contains") ? "" : "refs/remotes/origin/main\n");

  assert.throws(() => assertCommitIsFetchable(SHA, run), (err) => {
    assert.match(err.message, new RegExp(SHA));
    assert.match(err.message, /no remote branch and no tag/);
    return true;
  });
});

test("reports that there was no ref to judge against rather than going quiet", () => {
  // A checkout with neither a remote-tracking ref nor a tag cannot answer the
  // question. A check with no evidence should not be what stops a release, but
  // the caller has to be able to tell that from a check that passed: this is
  // the case `fetch-depth: 0` in the publishing workflows exists to avoid.
  const run = () => "";

  assert.equal(assertCommitIsFetchable(SHA, run), "no-refs");
});

test("staging inspects only when it was asked to by argument", () => {
  // The defect: CS_UI_STAGE_INSPECT=1 exported in a shell, a dotfile or a CI
  // runner disarmed the guard above for every `npm run stage` that inherited
  // it, and the publish that followed said nothing about it.
  const prior = process.env.CS_UI_STAGE_INSPECT;
  process.env.CS_UI_STAGE_INSPECT = "1";
  try {
    assert.equal(inspectionOnly([]), false, "an ambient variable must not disarm the guard");
    assert.equal(inspectionOnly(["--inspect"]), true, "the gate asks for it where it is read");
  } finally {
    if (prior === undefined) delete process.env.CS_UI_STAGE_INSPECT;
    else process.env.CS_UI_STAGE_INSPECT = prior;
  }
});
