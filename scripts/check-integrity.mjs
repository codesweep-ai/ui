#!/usr/bin/env node
// Static-integrity linter for the design system.
//
// The existing gates each prove one thing well:
//   catalog:check  — spec frontmatter is well formed and every EXPORTED
//                    component has a spec (source → doc direction).
//   docs:compile   — every spec's marked example TYPE-CHECKS and, when
//                    rendered, produces every DOM hook its Traceability
//                    section documents.
//   lint:styles    — no hex colours, no px units.
//   size:subpaths  — per-entry bundle budgets.
//
// This script covers the seams between them: references that point at nothing,
// documentation that describes hooks the component source never emits, CSS
// that nothing wears, and examples that reach past the public entry.
//
// Usage:  node scripts/check-integrity.mjs [--json]
// Exit 1 on any FAIL, 0 when only WARNs (or INFO) are reported.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_OUT = process.argv.includes("--json");

// ---------------------------------------------------------------------------
// Third-party custom-property families that are legitimately undefined here.
//
// --tw-*: Tailwind-era leftovers. The library CSS was extracted from a
// Tailwind build, and several shorthand values still carry Tailwind's internal
// ring/shadow/transform variables inside them (e.g. `box-shadow: var(--tw-ring-
// offset-shadow, 0 0 #0000), ...`). Tailwind defines those in its own
// preflight; this repo ships no preflight, so they resolve to their inline
// fallbacks. They are dead weight, not dangling references, and removing them
// is a CSS-cleanup task rather than an integrity failure.
//
// Nothing else is allowlisted. Anything matched here is still PRINTED (as
// INFO) so an allowlisted family can never hide silently.
// ---------------------------------------------------------------------------
const CSS_VAR_ALLOWLIST = [
  { prefix: "--tw-", why: "Tailwind-era leftover inside shorthand values; resolves to its inline fallback" },
];

const findings = [];
const record = (level, check, where, message) =>
  findings.push({ level, check, where, message });
const fail = (...a) => record("FAIL", ...a);
const warn = (...a) => record("WARN", ...a);
const info = (...a) => record("INFO", ...a);

// --- shared helpers --------------------------------------------------------

function walk(dir, predicate) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(file, predicate));
    else if (predicate(file)) out.push(file);
  }
  return out;
}

const rel = (file) => relative(ROOT, file).split("\\").join("/");
const read = (file) => readFileSync(file, "utf8");
const lineOf = (source, index) => source.slice(0, index).split("\n").length;

/** Blank out /* ... *\/ comments while preserving offsets. */
const stripCssComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));

// ===========================================================================
// 1. Dangling CSS custom properties (FAIL)
//    Every var(--x) in src/styles/** and preview/src/** must have a --x:
//    definition. Definitions also come from inline style objects in component
//    source, which is how per-instance properties like
//    --event-lanes-lane-height are supplied.
//
//    preview/ is included deliberately: its stylesheet is hand-maintained, and
//    inventing a plausible-looking token there fails silently — the declaration
//    is simply dropped and the element renders unstyled. That is exactly the
//    mistake this check exists to catch.
// ===========================================================================

function checkCssVariables() {
  const cssFiles = [
    ...walk(join(ROOT, "src", "styles"), (f) => f.endsWith(".css")),
    ...walk(join(ROOT, "preview", "src"), (f) => f.endsWith(".css")),
  ].sort();
  const defined = new Set();
  const used = new Map(); // name -> [{file, line}]

  for (const file of cssFiles) {
    const source = stripCssComments(read(file));
    for (const m of source.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) defined.add(m[1]);
    for (const m of source.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
      if (!used.has(m[1])) used.set(m[1], []);
      used.get(m[1]).push({ file: rel(file), line: lineOf(source, m.index) });
    }
  }

  // Custom properties assigned from component source (inline style objects or
  // CSSStyleDeclaration.setProperty) are real definitions at runtime.
  for (const file of walk(join(ROOT, "src"), (f) => /\.(ts|tsx)$/.test(f))) {
    const source = read(file);
    for (const m of source.matchAll(/["'`](--[A-Za-z0-9_-]+)["'`]\s*[:,]/g)) defined.add(m[1]);
    for (const m of source.matchAll(/setProperty\(\s*["'`](--[A-Za-z0-9_-]+)["'`]/g)) defined.add(m[1]);
  }

  for (const name of [...used.keys()].sort()) {
    if (defined.has(name)) continue;
    const allowed = CSS_VAR_ALLOWLIST.find((entry) => name.startsWith(entry.prefix));
    for (const { file, line } of used.get(name)) {
      if (allowed) {
        info("css-vars", `${file}:${line}`, `var(${name}) is undefined but allowlisted — ${allowed.why}`);
      } else {
        fail("css-vars", `${file}:${line}`, `var(${name}) is used but never defined in src/styles/** or src/**/*.tsx`);
      }
    }
  }
}

// ===========================================================================
// Spec + export inventory (shared by checks 2 and 3)
// ===========================================================================

function frontmatterBlock(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") return { lines: lines.slice(1, i), offset: 2 };
  }
  return null;
}

function loadSpecs() {
  const specs = new Map();
  for (const kind of ["components", "patterns"]) {
    const dir = join(ROOT, kind);
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
      const raw = read(join(dir, file));
      const block = frontmatterBlock(raw);
      if (!block) continue; // catalog:check already fails on this
      let data;
      try {
        data = yaml.load(block.lines.join("\n"));
      } catch {
        continue; // catalog:check already fails on this
      }
      if (!data || typeof data !== "object") continue;
      specs.set(basename(file, ".md"), {
        kind,
        spec: `${kind}/${file}`,
        raw,
        fm: block,
        data,
      });
    }
  }
  return specs;
}

/** Value names exported from every public entry point declared in package.json. */
function publicExports() {
  const pkg = JSON.parse(read(join(ROOT, "package.json")));
  const entries = new Set();
  for (const target of Object.values(pkg.exports ?? {})) {
    const dist = typeof target === "string" ? target : target?.import;
    if (typeof dist !== "string" || !dist.endsWith(".js")) continue;
    // ./dist/markdown/rich.js -> src/markdown/rich.ts
    const candidate = join(ROOT, dist.replace(/^\.\/dist\//, "src/").replace(/\.js$/, ".ts"));
    if (existsSync(candidate)) entries.add(candidate);
  }
  entries.add(join(ROOT, "src", "index.ts"));

  const names = new Set();
  for (const entry of entries) {
    const source = read(entry);
    for (const m of source.matchAll(/export\s+(?!type\b)\{([^}]*)\}/g)) {
      for (const piece of m[1].split(",")) {
        const name = piece.trim().split(/\s+as\s+/).pop()?.trim();
        if (name && !name.startsWith("type ")) names.add(name);
      }
    }
    for (const m of source.matchAll(/export\s+(?:const|function|class)\s+([A-Za-z0-9_$]+)/g)) {
      names.add(m[1]);
    }
  }
  return names;
}

// ===========================================================================
// 2. Dangling documentation cross-references (FAIL)
//    catalog:check already proves `related:` resolves to SOME spec. It does
//    not prove the target is importable, and it never looks at the `→ Name`
//    convention used inside use_when / avoid_when prose.
// ===========================================================================

// Words that may sit between "→" and the component name in the convention.
const REFERENCE_LEAD_WORDS = new Set([
  "use", "used", "using", "a", "an", "the", "wrap", "wrapped", "in", "into",
  "plain", "or", "and", "with", "prefer", "just", "to", "compose", "inside",
]);
const isPascalCase = (word) => /^[A-Z][A-Za-z0-9]*$/.test(word) && /[a-z]/.test(word);

/**
 * Pull the component names out of the reference clause that follows "→".
 * Only the leading run of connector words + PascalCase names is treated as a
 * reference; the first ordinary prose word ends the clause. This keeps
 * "→ Tree or SectionedTree" and "→ wrap in CardGroup" while ignoring
 * "→ use a plain checkbox or Toggle" and "→ use an <a>".
 */
function referenceClauseTargets(tail) {
  const targets = [];
  for (const raw of tail.trim().split(/[\s,]+/)) {
    const word = raw.replace(/^[("']+|[.;:)"']+$/g, "");
    if (!word) continue;
    if (isPascalCase(word)) {
      targets.push(word);
      continue;
    }
    if (REFERENCE_LEAD_WORDS.has(word.toLowerCase())) continue;
    break;
  }
  return targets;
}

/** PascalCase names further into the prose — reported as WARN, never FAIL. */
function looseProseTargets(tail, alreadyFound) {
  const withoutParens = tail.replace(/\([^)]*\)/g, " "); // "(CodeMirror, Monaco)" is a third-party aside
  return [...withoutParens.matchAll(/\b([A-Z][A-Za-z0-9]*)\b/g)]
    .map((m) => m[1])
    .filter((n) => isPascalCase(n) && !alreadyFound.includes(n));
}

function frontmatterLine(spec, needle) {
  const index = spec.fm.lines.findIndex((line) => line.includes(needle));
  return index === -1 ? 1 : index + spec.fm.offset;
}

function checkDocReferences(specs, exports_) {
  for (const [, spec] of specs) {
    const related = [].concat(spec.data.related ?? []);
    for (const name of related) {
      const where = `${spec.spec}:${frontmatterLine(spec, String(name))}`;
      const target = specs.get(String(name));
      if (!target) {
        fail("doc-refs", where, `related: "${name}" has no components/${name}.md or patterns/${name}.md`);
      } else if (target.kind === "components" && !exports_.has(String(name))) {
        fail("doc-refs", where, `related: "${name}" has a spec but is not exported from any public entry point`);
      }
    }

    for (const key of ["use_when", "avoid_when"]) {
      for (const item of [].concat(spec.data[key] ?? [])) {
        const text = String(item);
        const arrow = text.indexOf("\u2192");
        if (arrow === -1) continue;
        const tail = text.slice(arrow + 1);
        const where = `${spec.spec}:${frontmatterLine(spec, text.slice(0, 40))}`;

        const targets = referenceClauseTargets(tail);
        for (const name of targets) {
          const target = specs.get(name);
          if (!target) {
            fail("doc-refs", where, `${key} "\u2192 ${name}" names no component or pattern spec`);
          } else if (target.kind === "components" && !exports_.has(name)) {
            fail("doc-refs", where, `${key} "\u2192 ${name}" has a spec but is not exported from any public entry point`);
          }
        }
        for (const name of looseProseTargets(tail, targets)) {
          if (!specs.get(name)) {
            warn("doc-refs", where, `${key} prose mentions "${name}", which is not a component or pattern spec (may be a third-party name)`);
          }
        }
      }
    }
  }
}

// ===========================================================================
// 3. Documented-but-never-emitted DOM hooks (FAIL / WARN)
//    docs:compile proves the documented hooks appear in the RENDERED example —
//    which passes even when the hook comes from a nested component. This asks
//    the complementary question: does the component's own source emit it? A
//    hook found in another src file is a WARN (documented on the wrong spec),
//    a hook found nowhere is a FAIL.
// ===========================================================================

function checkDocumentedHooks(specs) {
  const sourceFiles = walk(join(ROOT, "src"), (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  const sources = new Map(sourceFiles.map((f) => [f, read(f)]));

  for (const [name, spec] of specs) {
    if (spec.kind !== "components") continue;
    const section = spec.raw.match(/(?:^|\n)## Traceability\s*\n([\s\S]*?)(?=\n## |$)/);
    if (!section) continue; // docs:compile already fails on this

    const sectionStart = spec.raw.indexOf(section[1]);
    const hooks = new Map(); // hook -> line in the spec
    for (const code of section[1].matchAll(/`([^`\n]+)`/g)) {
      for (const attr of code[1].matchAll(/\b(data-[a-z0-9-]+)/gi)) {
        const hook = attr[1].toLowerCase();
        if (!hooks.has(hook)) hooks.set(hook, lineOf(spec.raw, sectionStart + code.index));
      }
    }

    const own = join(ROOT, "src", "components", `${name}.tsx`);
    const ownSource = sources.get(own);
    if (ownSource === undefined) {
      warn("doc-hooks", spec.spec, `no src/components/${name}.tsx to check documented hooks against`);
      continue;
    }
    for (const [hook, line] of hooks) {
      if (ownSource.includes(hook)) continue;
      const elsewhere = [...sources.entries()]
        .filter(([file, text]) => file !== own && text.includes(hook))
        .map(([file]) => rel(file));
      if (elsewhere.length) {
        warn("doc-hooks", `${spec.spec}:${line}`, `${hook} is documented here but emitted by ${elsewhere.join(", ")}, not src/components/${name}.tsx`);
      } else {
        fail("doc-hooks", `${spec.spec}:${line}`, `${hook} is documented but appears in no component source`);
      }
    }
  }
}

// ===========================================================================
// 4. CSS class hygiene (WARN)
//    cs-component-* classes are machine-generated numbers, so a stale one is
//    invisible to review. Dynamically composed names would be false positives,
//    which is why this never fails the build.
// ===========================================================================

function checkClassHygiene() {
  const CLASS = /cs-component-[a-z0-9-]+/g;
  const defined = new Map();
  for (const file of walk(join(ROOT, "src", "styles", "components"), (f) => f.endsWith(".css")).sort()) {
    const source = stripCssComments(read(file));
    for (const m of source.matchAll(/\.(cs-component-[a-z0-9-]+)/g)) {
      if (!defined.has(m[1])) defined.set(m[1], `${rel(file)}:${lineOf(source, m.index)}`);
    }
  }

  const referenced = new Map();
  // preview/src is read-only here but counts as a legitimate consumer.
  const consumers = [
    ...walk(join(ROOT, "src"), (f) => /\.tsx?$/.test(f)),
    ...walk(join(ROOT, "preview", "src"), (f) => /\.tsx?$/.test(f)),
  ].sort();
  for (const file of consumers) {
    const source = read(file);
    for (const m of source.matchAll(CLASS)) {
      if (!referenced.has(m[0])) referenced.set(m[0], `${rel(file)}:${lineOf(source, m.index)}`);
    }
  }

  for (const [name, where] of [...defined].sort()) {
    if (!referenced.has(name)) {
      warn("css-classes", where, `.${name} is defined but referenced by no component source`);
    }
  }
  for (const [name, where] of [...referenced].sort()) {
    if (!defined.has(name)) {
      warn("css-classes", where, `${name} is referenced but defined in no src/styles/components/*.css`);
    }
  }
}

// ===========================================================================
// 5. Example import hygiene (FAIL)
//    A docs-compile example that reaches a relative path documents a private
//    import a consumer cannot write. docs:compile type-checks the example but
//    is indifferent to where the symbols come from.
// ===========================================================================

const PUBLIC_ENTRY = /^@codesweep-ai\/ui(\/|$)/;

function checkExampleImports(specs) {
  const marker = /<!-- docs-compile -->\s*```tsx\n([\s\S]*?)\n```/g;
  for (const [, spec] of specs) {
    for (const example of spec.raw.matchAll(marker)) {
      const firstCodeLine = lineOf(spec.raw, example.index) + 2;
      example[1].split("\n").forEach((line, offset) => {
        const match =
          line.match(/\bfrom\s+["']([^"']+)["']/) ??
          line.match(/^\s*import\s+["']([^"']+)["']/) ??
          line.match(/\bimport\(\s*["']([^"']+)["']\s*\)/) ??
          line.match(/\brequire\(\s*["']([^"']+)["']\s*\)/);
        if (!match) return;
        const specifier = match[1];
        const where = `${spec.spec}:${firstCodeLine + offset}`;
        if (specifier.startsWith(".") || specifier.startsWith("/")) {
          fail("example-imports", where, `example imports "${specifier}" — examples must import from @codesweep-ai/ui or a public subpath`);
        } else if (/^@codesweep-ai\/ui\/(src|dist)\b/.test(specifier)) {
          fail("example-imports", where, `example imports "${specifier}" — reaches past the declared exports map`);
        } else if (!PUBLIC_ENTRY.test(specifier) && specifier !== "react" && specifier !== "react-dom" && !specifier.startsWith("react-dom/") && !specifier.startsWith("react/")) {
          warn("example-imports", where, `example imports third-party module "${specifier}"`);
        }
      });
    }
  }
}

// ===========================================================================
// main
// ===========================================================================

const specs = loadSpecs();
const exports_ = publicExports();

checkCssVariables();
checkDocReferences(specs, exports_);
checkDocumentedHooks(specs);
checkClassHygiene();
checkExampleImports(specs);

const failures = findings.filter((f) => f.level === "FAIL");
const warnings = findings.filter((f) => f.level === "WARN");
const notes = findings.filter((f) => f.level === "INFO");

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        pass: failures.length === 0,
        counts: { fail: failures.length, warn: warnings.length, info: notes.length },
        findings,
      },
      null,
      2,
    ),
  );
} else {
  const order = { FAIL: 0, WARN: 1, INFO: 2 };
  for (const f of [...findings].sort((a, b) => order[a.level] - order[b.level] || a.check.localeCompare(b.check) || a.where.localeCompare(b.where))) {
    console.log(`${f.level.padEnd(4)} ${f.check.padEnd(15)} ${f.where}  ${f.message}`);
  }
  if (findings.length) console.log("");
  const tail = `${warnings.length} warning${warnings.length === 1 ? "" : "s"}, ${notes.length} note${notes.length === 1 ? "" : "s"}`;
  if (failures.length) {
    console.log(`check-integrity: FAIL — ${failures.length} failure${failures.length === 1 ? "" : "s"}, ${tail}`);
  } else {
    console.log(`check-integrity: PASS — 0 failures, ${tail}`);
  }
}

process.exitCode = failures.length ? 1 : 0;
