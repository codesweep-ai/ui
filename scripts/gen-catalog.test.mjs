import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  MULTI_ENTRY,
  entryIndex,
  entryProblems,
  entrySources,
  exportedValueNames,
} from "./gen-catalog.mjs";

const scratch = mkdtempSync(join(tmpdir(), "gen-catalog-"));
const entry = (name, ...lines) => {
  const file = join(scratch, name);
  writeFileSync(file, `${lines.join("\n")}\n`);
  return file;
};
const index = (entries) => new Map(Object.entries(entries));

test("sees a component exported as a local const, not only as a re-export", () => {
  // The shape src/markdown/rich.ts uses. A derivation that matches
  // `export ... from "./components/X"` reads this entry as exporting nothing,
  // which is how MarkdownViewer came to be measured as having one entry point.
  const file = entry(
    "rich.ts",
    "export interface MarkdownViewerProps { content: string }",
    "export const MarkdownViewer = createMarkdownViewer(RichMarkdownRenderer);",
  );

  assert.deepEqual([...exportedValueNames(file)], ["MarkdownViewer"]);
});

test("takes the re-exported values and leaves the types behind", () => {
  const file = entry(
    "chart.ts",
    'export { ChartFrame } from "./components/ChartFrame";',
    'export { ChartTooltip as Tooltip } from "./components/ChartTooltip";',
    'export type { ChartFrameProps } from "./components/ChartFrame";',
    'export { type Axis, styleAxis } from "./lib/chartTheme";',
  );

  assert.deepEqual([...exportedValueNames(file)].sort(), ["ChartFrame", "Tooltip", "styleAxis"]);
});

test("refuses a star export rather than under-reporting what it carries", () => {
  const file = entry("star.ts", 'export * from "./components/Button";');
  const problems = [];

  assert.deepEqual([...exportedValueNames(file, (p) => problems.push(p))], []);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /export \*/);
});

test("fails a catalogued component no entry point exports", () => {
  const problems = entryProblems(["Ghost"], index({}), new Set());

  assert.equal(problems.length, 1);
  assert.match(problems[0], /no package entry point exports Ghost/);
});

test("fails a second entry point unless it is listed as deliberate", () => {
  const two = index({ Leaky: ["@codesweep-ai/ui", "@codesweep-ai/ui/chart"] });

  assert.equal(entryProblems(["Leaky"], two, new Set()).length, 1);
  assert.deepEqual(entryProblems(["Leaky"], two, new Set(["Leaky"])), []);
});

test("fails a listed component that has outlived its second entry point", () => {
  const one = index({ Settled: ["@codesweep-ai/ui"] });
  const problems = entryProblems(["Settled"], one, new Set(["Settled"]));

  assert.equal(problems.length, 1);
  assert.match(problems[0], /no longer is/);
});

test("resolves this package's own entry points as package.json declares them", () => {
  const specifiers = entrySources().map((s) => s.specifier);
  assert.ok(specifiers.includes("@codesweep-ai/ui"));
  assert.ok(specifiers.includes("@codesweep-ai/ui/markdown/rich"));

  const resolved = entryIndex();
  assert.deepEqual(resolved.get("Button"), ["@codesweep-ai/ui"]);
  assert.deepEqual(resolved.get("ChartFrame"), ["@codesweep-ai/ui/chart"]);
  assert.deepEqual(resolved.get("MarkdownViewer"), [
    "@codesweep-ai/ui/markdown",
    "@codesweep-ai/ui/markdown/rich",
  ]);
  assert.ok(MULTI_ENTRY.has("MarkdownViewer"));
});

test("the catalog that ships gives every component a specifier to paste", () => {
  const catalog = JSON.parse(readFileSync(new URL("../catalog.json", import.meta.url), "utf8"));

  for (const component of catalog.components)
    assert.ok(
      Array.isArray(component.import) && component.import.length > 0,
      `${component.name} carries no import specifier`,
    );
  assert.deepEqual(catalog.components.find((c) => c.name === "MarkdownViewer").import, [
    "@codesweep-ai/ui/markdown",
    "@codesweep-ai/ui/markdown/rich",
  ]);
  // Patterns are compositions of components rather than importable units.
  for (const pattern of catalog.patterns) assert.equal(pattern.import, undefined);
});
