#!/usr/bin/env node
// Generates CATALOG.md + catalog.json from the YAML frontmatter on
// components/*.md and patterns/*.md, cross-checked against the component
// exports in src/index.ts and the entry points package.json declares.
//
// CATALOG.md and catalog.json are GENERATED — never hand-edit them. To change
// the catalog, edit the frontmatter on the relevant spec and re-run
// `npm run catalog`.
//
// Modes:
//   (default)  write CATALOG.md + catalog.json; warn on problems; exit 0
//   --check    validate strictly + detect drift; write nothing; exit 1 on any
//              problem (this is the CI gate — see `npm run catalog:check`)
//
// Output is a pure function of the spec frontmatter (no timestamps / versions),
// so a clean tree regenerates byte-identical files.

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import yaml from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const COMPONENTS_DIR = join(ROOT, "components");
const PATTERNS_DIR = join(ROOT, "patterns");
const INDEX = join(ROOT, "src", "index.ts");
const MARKETING_INDEX = join(ROOT, "src", "marketing", "index.ts");
const CATALOG_MD = join(ROOT, "CATALOG.md");
const CATALOG_JSON = join(ROOT, "catalog.json");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const REQUIRED = ["name", "summary", "keywords"];
const STATUSES = ["stable", "experimental", "deprecated"];
const check = process.argv.includes("--check");

const problems = [];
const fail = (msg) => problems.push(msg);

// --- frontmatter ----------------------------------------------------------

function extractFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return lines.slice(1, i).join("\n");
  }
  return null;
}

function loadSpecs(dir, kind) {
  const out = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".md")).sort()) {
    const fileName = basename(f, ".md");
    const rel = `${kind}/${f}`;
    const block = extractFrontmatter(readFileSync(join(dir, f), "utf8"));
    if (block == null) {
      fail(`${rel}: missing YAML frontmatter`);
      continue;
    }
    let data;
    try {
      data = yaml.load(block);
    } catch (e) {
      fail(`${rel}: invalid YAML frontmatter — ${e.message}`);
      continue;
    }
    if (!data || typeof data !== "object") {
      fail(`${rel}: empty frontmatter`);
      continue;
    }
    for (const r of REQUIRED) {
      const v = data[r];
      const empty = v == null || v === "" || (Array.isArray(v) && v.length === 0);
      if (empty) fail(`${rel}: missing required field "${r}"`);
    }
    if (data.name && data.name !== fileName)
      fail(`${rel}: frontmatter name "${data.name}" ≠ filename "${fileName}"`);
    if (data.status && !STATUSES.includes(data.status))
      fail(`${rel}: status "${data.status}" not one of ${STATUSES.join(", ")}`);
    const importFrom = kind === "components" ? ENTRY_INDEX.get(fileName) ?? [] : null;
    out.push({ kind, spec: rel, ...normalize(data, fileName, importFrom) });
  }
  return out;
}

function normalize(data, fileName, importFrom) {
  const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
  return {
    name: data.name ?? fileName,
    // The whole specifier rather than a flag saying the component is not at the
    // root: a flag says where a component is not, and leaves the reader looking.
    ...(importFrom ? { import: importFrom } : {}),
    summary: data.summary ?? "",
    keywords: arr(data.keywords),
    since: data.since ?? null,
    status: data.status ?? "stable",
    use_when: arr(data.use_when),
    avoid_when: arr(data.avoid_when),
    related: arr(data.related),
    patterns: arr(data.patterns),
    note: data.note ? String(data.note).trim() : null,
  };
}

// --- entry points ----------------------------------------------------------

// Which specifier a reader writes to import a component. Derived from the
// exports map in package.json and the sources it points at rather than a list
// kept by hand, so the catalog cannot come to disagree with the package it
// ships inside.
//
// MarkdownViewer is exported from two entries on purpose: "/markdown" is the
// lightweight parser, "/markdown/rich" the build-time opt-in to the full
// CommonMark + GFM pipeline, and the two take different props. Every other
// component resolves to one entry, and entryProblems holds it there. See
// components/MarkdownViewer.md.
export const MULTI_ENTRY = new Set(["MarkdownViewer"]);

// "." becomes the bare package name, "./chart" the subpath. An entry backed by
// no source file exports no components: the stylesheets, the token bundle and
// package.json itself.
export function entrySources(onProblem = fail) {
  const out = [];
  for (const [sub, target] of Object.entries(PKG.exports ?? {})) {
    const dist = typeof target === "string" ? target : target?.import;
    if (typeof dist !== "string" || !dist.endsWith(".js")) continue;
    const stem = dist.replace(/^\.\/dist\//, "").replace(/\.js$/, "");
    const file = [".ts", ".tsx"]
      .map((ext) => join(ROOT, "src", `${stem}${ext}`))
      .find((candidate) => existsSync(candidate));
    if (!file) {
      onProblem(`package.json exports "${sub}" as ${dist}, but no src/${stem}.ts backs it`);
      continue;
    }
    out.push({ specifier: `${PKG.name}${sub.slice(1)}`, file });
  }
  return out;
}

// The value names an entry exports, read from the syntax tree rather than
// matched out of the text. An entry can export a component as a local const —
// src/markdown/rich.ts builds one through createMarkdownViewer — and no
// re-export pattern sees that one.
export function exportedValueNames(file, onProblem = fail) {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.ESNext, true);
  const names = new Set();
  const isExported = (node) =>
    node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

  for (const statement of source.statements) {
    if (ts.isExportDeclaration(statement)) {
      if (statement.isTypeOnly) continue;
      if (!statement.exportClause || !ts.isNamedExports(statement.exportClause)) {
        // A star export carries names this cannot enumerate, so it would under-
        // report a component's entry points in silence. Say so instead.
        onProblem(`${relative(ROOT, file)}: "export *" is not supported by the entry-point derivation`);
        continue;
      }
      for (const element of statement.exportClause.elements)
        if (!element.isTypeOnly) names.add(element.name.text);
      continue;
    }
    if (!isExported(statement)) continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text);
    } else if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) {
      names.add(statement.name.text);
    }
  }
  return names;
}

// Exported name -> every specifier that exports it, sorted so the generated
// files do not depend on the order the exports map happens to list entries in.
export function entryIndex(sources = entrySources(), onProblem = fail) {
  const index = new Map();
  for (const { specifier, file } of sources)
    for (const name of exportedValueNames(file, onProblem))
      index.set(name, [...(index.get(name) ?? []), specifier]);
  for (const [name, specifiers] of index) index.set(name, [...specifiers].sort());
  return index;
}

// What an index gets wrong about a set of catalogued names. A component no
// entry exports is one a reader cannot import at all. A component two entries
// export is either the deliberate case above or a heavy subpath that has
// leaked into the root, and only the first is listed.
export function entryProblems(names, index, multiEntry = MULTI_ENTRY) {
  const out = [];
  for (const name of names) {
    const specifiers = index.get(name) ?? [];
    if (specifiers.length === 0)
      out.push(`components/${name}.md: no package entry point exports ${name}`);
    else if (specifiers.length > 1 && !multiEntry.has(name))
      out.push(
        `components/${name}.md: ${name} is exported from ${specifiers.join(" and ")}, ` +
          "where one entry point is expected",
      );
  }
  for (const name of multiEntry)
    if ((index.get(name) ?? []).length < 2)
      out.push(`${name} is listed as exported from several entry points and no longer is — drop it`);
  return out;
}

const ENTRY_INDEX = entryIndex();

// --- cross-checks ----------------------------------------------------------

function componentSourceFiles() {
  const files = new Set();
  for (const line of readFileSync(INDEX, "utf8").split(/\r?\n/)) {
    if (/^\s*export\s+type\b/.test(line)) continue; // type-only re-exports
    const m = line.match(/from\s+["']\.\/components\/([A-Za-z0-9_]+)["']/);
    if (m) files.add(m[1]);
  }
  // Marketing layer: src/marketing/index.ts re-exports siblings as "./Name".
  try {
    for (const line of readFileSync(MARKETING_INDEX, "utf8").split(/\r?\n/)) {
      if (/^\s*export\s+type\b/.test(line)) continue;
      const m = line.match(/from\s+["']\.\/([A-Za-z0-9_]+)["']/);
      if (m) files.add(m[1]);
    }
  } catch {
    /* no marketing barrel — fine */
  }
  return [...files];
}

function crossCheck(components, patterns) {
  const specNames = new Set([...components, ...patterns].map((s) => s.name));
  const compNames = new Set(components.map((s) => s.name));
  const patNames = new Set(patterns.map((s) => s.name));

  // every exported component source file must have a spec
  const documented = new Set(components.map((s) => s.name));
  for (const file of componentSourceFiles()) {
    if (!documented.has(file))
      fail(`src/index.ts exports ./components/${file} but components/${file}.md is missing or unparsed`);
  }
  // every catalogued component must name an entry point a reader can import it
  // from, and the six behind a subpath are the reason the field exists
  for (const problem of entryProblems(components.map((s) => s.name), ENTRY_INDEX)) fail(problem);
  // related/patterns references must resolve
  for (const s of [...components, ...patterns]) {
    for (const r of s.related)
      if (!specNames.has(r)) fail(`${s.spec}: related "${r}" has no matching spec`);
    for (const p of s.patterns)
      if (!patNames.has(p)) fail(`${s.spec}: patterns "${p}" has no matching pattern spec`);
  }
}

// --- rendering -------------------------------------------------------------

const HEADER =
  "<!-- GENERATED FILE — do not edit. Source: components/*.md + patterns/*.md frontmatter, " +
  "cross-checked against src/index.ts and the entry points in package.json. " +
  "Regenerate with `npm run catalog`. -->";

function renderEntry(s) {
  const lines = [`### ${s.name}${s.since ? `  ·  since ${s.since}` : ""}${s.status !== "stable" ? `  ·  ${s.status}` : ""}`];
  lines.push(s.summary);
  // The specifier a reader pastes. Most are the root, and the six that are not
  // are the reason this line exists.
  if (s.import?.length)
    lines.push(`- import: ${s.import.map((specifier) => `\`${specifier}\``).join(" or ")}`);
  // Each intent is a term to search for rather than prose, and marking them as
  // code says so: to a reader, and to the prose linter, which would otherwise
  // read the list as one sentence saying "button" six times.
  if (s.keywords.length)
    lines.push(`- intents: ${s.keywords.map((k) => `\`${k}\``).join(", ")}`);
  for (const u of s.use_when) lines.push(`- use when: ${u}`);
  for (const a of s.avoid_when) lines.push(`- avoid when: ${a}`);
  if (s.note) lines.push(`- ⚠ ${s.note.replace(/\s*\n\s*/g, " ")}`);
  const refs = [];
  if (s.related.length) refs.push(`related: ${s.related.join(", ")}`);
  if (s.patterns.length) refs.push(`patterns: ${s.patterns.join(", ")}`);
  if (refs.length) lines.push(`- ${refs.join(" · ")}`);
  // A link rather than a bare path: the entry exists to send a reader to the
  // specification, and a path they have to copy is a worse way to do that.
  lines.push(`- spec: [${s.spec}](${s.spec})`);
  return lines.join("\n");
}

function renderMarkdown(components, patterns) {
  const out = [
    HEADER,
    "",
    "# @codesweep-ai/ui — Component Catalog",
    "",
    "This index lists every component and pattern the package exports, and it is " +
      "the **look-here-first** place for reuse. Search it by intent, for example " +
      "\"graph\", \"table\" or \"steps\", before building any UI.",
    "",
    "**Decision order:** match an entry → import it from the specifier on that " +
      "entry and compose · close but missing a prop → enhance that component · no match → " +
      "add a new one (see [CONTRIBUTING.md](CONTRIBUTING.md)). Never hand-roll a " +
      "duplicate.",
    "",
    "## Components",
    "",
    components.map(renderEntry).join("\n\n"),
    "",
    "## Patterns",
    "",
    patterns.map(renderEntry).join("\n\n"),
    "",
  ];
  return out.join("\n");
}

function renderJson(components, patterns) {
  const strip = ({ kind, ...rest }) => rest; // drop internal "kind"
  return (
    JSON.stringify(
      {
        $generated: "Do not edit. Run `npm run catalog`. Source: spec frontmatter.",
        counts: { components: components.length, patterns: patterns.length },
        components: components.map(strip),
        patterns: patterns.map(strip),
      },
      null,
      2,
    ) + "\n"
  );
}

// --- main ------------------------------------------------------------------

const byName = (a, b) => a.name.localeCompare(b.name);
const components = loadSpecs(COMPONENTS_DIR, "components").sort(byName);
const patterns = loadSpecs(PATTERNS_DIR, "patterns").sort(byName);
crossCheck(components, patterns);

const md = renderMarkdown(components, patterns);
const json = renderJson(components, patterns);

// Importing this module, which its test does, must neither write the catalog
// nor exit the process.
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly && check) {
  let drift = false;
  for (const [path, next] of [
    [CATALOG_MD, md],
    [CATALOG_JSON, json],
  ]) {
    let current = "";
    try {
      current = readFileSync(path, "utf8");
    } catch {
      /* missing → drift */
    }
    if (current !== next) {
      drift = true;
      fail(`${basename(path)} is out of date`);
    }
  }
  if (problems.length) {
    console.error("✗ catalog check failed:\n" + problems.map((p) => `  - ${p}`).join("\n"));
    if (drift) console.error("\nRun `npm run catalog` and commit the result.");
    process.exit(1);
  }
  console.log(`✓ catalog up to date (${components.length} components, ${patterns.length} patterns)`);
} else if (invokedDirectly) {
  writeFileSync(CATALOG_MD, md);
  writeFileSync(CATALOG_JSON, json);
  if (problems.length)
    console.warn("⚠ catalog written with problems:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  console.log(`Wrote CATALOG.md + catalog.json (${components.length} components, ${patterns.length} patterns)`);
}
