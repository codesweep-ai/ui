import assert from "node:assert/strict";
import test from "node:test";

import { check, findAnnotations, findSince, isAbove, parseVersion } from "./check-versions.mjs";

test("orders versions by part rather than by string", () => {
  // "1.0.0" > "0.3.0" is the case this package shipped. The rest are the ones
  // a string comparison gets wrong.
  assert.ok(isAbove("1.0.0", "0.3.0"));
  assert.ok(isAbove("0.10.0", "0.9.0"));
  assert.ok(isAbove("0.3.1", "0.3.0"));
  assert.ok(!isAbove("0.3.0", "0.3.0"), "equal is not above");
  assert.ok(!isAbove("0.2.0", "0.3.0"), "an earlier release is the normal case");
  assert.equal(parseVersion("not a version"), null);
});

test("finds an annotation wherever it sits, and reports its line", () => {
  const text = [
    "/** Loading state. Added v1.2.0. */",
    "const x = 1;",
    "  * maximized card fills the viewport. Added v1.7.0.",
    "no annotation here",
  ].join("\n");

  assert.deepEqual(findAnnotations(text), [
    { version: "1.2.0", line: 1 },
    { version: "1.7.0", line: 3 },
  ]);
});

test("reads since out of the frontmatter and not out of the body", () => {
  const spec = ["---", "name: Button", "since: 1.0.0", "---", "", "# Button", "since: 9.9.9"].join("\n");

  assert.deepEqual(findSince(spec), { version: "1.0.0", line: 3 });
  assert.equal(findSince("# Button\n\nsince: 1.0.0"), null, "a file with no frontmatter declares none");
});

test("fails an annotation above the package version and names the file and line", () => {
  const files = [{ path: "components/Dropdown.md", text: "---\nname: Dropdown\nsince: 1.0.0\n---\n/** Added v1.3.0. */" }];

  const problems = check(files, "0.3.0");

  assert.equal(problems.length, 2);
  assert.match(problems[0], /components\/Dropdown\.md:3: since 1\.0\.0 names a version above the package's 0\.3\.0/);
  assert.match(problems[1], /components\/Dropdown\.md:5: "Added v1\.3\.0" names a version above/);
});

test("passes the same file once the package has reached that version", () => {
  const files = [{ path: "components/Dropdown.md", text: "---\nname: Dropdown\nsince: 1.0.0\n---\n/** Added v1.3.0. */" }];

  assert.deepEqual(check(files, "1.3.0"), []);
});

test("passes an annotation below the package version, which is the normal case", () => {
  const files = [{ path: "components/Chip.md", text: "---\nname: Chip\nsince: 0.2.0\n---\n/** Added v0.1.0. */" }];

  assert.deepEqual(check(files, "0.3.0"), []);
});

test("rejects a since that is not a three-part version", () => {
  const files = [{ path: "components/Odd.md", text: "---\nname: Odd\nsince: next\n---\n" }];

  const problems = check(files, "0.3.0");

  assert.equal(problems.length, 1);
  assert.match(problems[0], /is not a three-part version/);
});
