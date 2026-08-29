#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const uiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedClass = /\.?\bcs-component-[a-z0-9-]+-\d+\b/gi;
const componentRoot = /\[data-component\s*=\s*["']?([^\]"']+)["']?\]/i;
const sourceExtensions = new Set([".css", ".scss", ".sass", ".less", ".styl", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const ignoredDirectories = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".cache"]);

function usage() {
  return `Usage: npm run check:consumer-dom -- --root <consumer-repo> --inventory <inventory.json> [--exclude <glob> ...]

The inventory is either an array or { "selectors": [...] }. Each row requires:
  { "file": "src/app.css", "line": 67, "selector": ".prose p", "component": "MarkdownViewer" }

Declared rows are primary evidence and are never excluded. The source scan corroborates generated-class
references and explicit CSS or runtime-JavaScript descents rooted at [data-component=...].
Repeat --exclude to omit generated or vendored files from that corroborating scan.`;
}

function parseArgs(argv) {
  const result = { exclude: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") return { help: true };
    if (arg === "--root" || arg === "--inventory" || arg === "--exclude") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      if (arg === "--exclude") result.exclude.push(value);
      else result[arg.slice(2)] = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!result.root || !result.inventory) throw new Error("Both --root and --inventory are required");
  return result;
}

function globToRegExp(glob) {
  const normalized = glob.replaceAll("\\", "/").replace(/^\.\//, "");
  let pattern = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === "*" && normalized[index + 1] === "*") {
      if (normalized[index + 2] === "/") {
        pattern += "(?:.*/)?";
        index += 2;
      } else {
        pattern += ".*";
        index += 1;
      }
    } else if (char === "*") {
      pattern += "[^/]*";
    } else if (char === "?") {
      pattern += "[^/]";
    } else {
      pattern += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`^${pattern}$`);
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function splitSelectors(selectorList) {
  const selectors = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < selectorList.length; index += 1) {
    const char = selectorList[index];
    if (char === "(" || char === "[") depth += 1;
    else if (char === ")" || char === "]") depth = Math.max(0, depth - 1);
    else if (char === "," && depth === 0) {
      selectors.push(selectorList.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(selectorList.slice(start).trim());
  return selectors.filter(Boolean);
}

async function documentedHooks() {
  const files = (await readdir(path.join(uiRoot, "components"))).filter((file) => file.endsWith(".md"));
  const hooks = new Set();
  const components = new Set();
  for (const file of files) {
    const source = await readFile(path.join(uiRoot, "components", file), "utf8");
    const section = source.match(/(?:^|\n)## Traceability\s*\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? "";
    for (const match of section.matchAll(/`([^`\n]+)`/g)) {
      for (const attr of match[1].matchAll(/\b(data-[a-z0-9-]+)(?:="([^"]*)"|=\{[^}]+\})?/gi)) {
        if (attr[1] === "data-component" && attr[2]) components.add(attr[2]);
        else hooks.add(attr[1].toLowerCase());
      }
      for (const root of match[1].matchAll(/\[data-component="([^"]+)"\]/g)) components.add(root[1]);
      for (const attr of match[1].matchAll(/\[(data-[a-z0-9-]+)(?:[=\]])/gi)) {
        if (attr[1].toLowerCase() !== "data-component") hooks.add(attr[1].toLowerCase());
      }
    }
  }
  return { hooks, components };
}

function assess(selector, declaredComponent, contract) {
  const generated = [...selector.matchAll(generatedClass)].map((match) => match[0]);
  if (generated.length) {
    return { resolved: false, detail: `generated class ${generated.join(", ")}` };
  }

  const root = selector.match(componentRoot);
  const component = declaredComponent || root?.[1];
  const descendantHooks = [...selector.matchAll(/\[(data-[a-z0-9-]+)(?:[=\]])/gi)]
    .map((match) => match[1].toLowerCase())
    .filter((name) => name !== "data-component" && contract.hooks.has(name));
  if (descendantHooks.length) {
    return { resolved: true, detail: `documented hook [${descendantHooks[0]}]${component ? ` for ${component}` : ""}` };
  }

  if (root && selector.slice((root.index ?? 0) + root[0].length).trim() === "") {
    const known = contract.components.has(root[1]);
    return { resolved: known, detail: known ? `documented root for ${root[1]}` : `unknown component root ${root[1]}` };
  }

  return {
    resolved: false,
    detail: component
      ? `structural reach into ${component} has no documented descendant hook`
      : "no documented component hook",
  };
}

function normalizeInventory(value) {
  const rows = Array.isArray(value) ? value : value?.selectors ?? value?.entries ?? value?.inventory;
  if (!Array.isArray(rows)) throw new Error('Inventory must be an array or an object with a "selectors" array');
  return rows.map((row, index) => {
    if (!row || typeof row.file !== "string" || !Number.isInteger(row.line) || row.line < 1 || typeof row.selector !== "string") {
      throw new Error(`Inventory row ${index + 1} requires file, positive integer line, and selector`);
    }
    if (row.component !== undefined && typeof row.component !== "string") {
      throw new Error(`Inventory row ${index + 1} component must be a string when present`);
    }
    return { file: row.file, line: row.line, selector: row.selector, component: row.component, origin: "declared" };
  });
}

async function sourceFiles(directory, consumerRoot, excludePatterns, excluded) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        result.push(...await sourceFiles(path.join(directory, entry.name), consumerRoot, excludePatterns, excluded));
      }
    } else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
      const file = path.join(directory, entry.name);
      const relative = path.relative(consumerRoot, file).split(path.sep).join("/");
      if (excludePatterns.some((pattern) => pattern.test(relative))) excluded.push(relative);
      else result.push(file);
    }
  }
  return result;
}

function scanCss(file, relative, source) {
  const results = [];
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => " ".repeat(comment.length));
  for (const match of withoutComments.matchAll(/([^{}]+)\{/g)) {
    const selectorList = match[1].trim();
    if (!selectorList || selectorList.startsWith("@")) continue;
    for (const selector of splitSelectors(selectorList)) {
      const root = selector.match(componentRoot);
      const suffix = root ? selector.slice((root.index ?? 0) + root[0].length).trim() : "";
      const hasGenerated = generatedClass.test(selector);
      generatedClass.lastIndex = 0;
      if (hasGenerated || (root && suffix)) {
        results.push({ file: relative, line: lineNumber(source, match.index ?? 0), selector, origin: "scan" });
      }
    }
  }
  return results;
}

function scanRuntime(relative, source) {
  const results = [];
  const values = new Map();
  const roots = new Map();
  const resolveExpression = (expression) => {
    const trimmed = expression.trim().replace(/;$/, "").trim();
    if (values.has(trimmed)) return values.get(trimmed);
    const template = trimmed.match(/^`([\s\S]*)`$/)?.[1];
    if (template !== undefined) {
      return template.replace(/\$\{([A-Za-z_$][\w$]*)\}/g, (whole, name) => values.get(name) ?? whole);
    }
    const quoted = trimmed.match(/^(?:"([\s\S]*)"|'([\s\S]*)')$/);
    if (quoted) return quoted[1] ?? quoted[2];
    const rawPieces = trimmed.split("+");
    if (rawPieces.length > 1) {
      const pieces = rawPieces.map((piece) => resolveExpression(piece));
      if (pieces.every((piece) => piece !== undefined)) return pieces.join("");
    }
    return undefined;
  };
  const lines = source.split("\n");
  lines.forEach((line, index) => {
    const classes = [...line.matchAll(generatedClass)].map((match) => match[0]);
    generatedClass.lastIndex = 0;
    for (const selector of classes) results.push({ file: relative, line: index + 1, selector, origin: "scan" });

    const assignment = line.match(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(.+?);?\s*$/);
    if (assignment) {
      const query = assignment[2].match(/(?:([A-Za-z_$][\w$]*)\.)?(?:querySelector|querySelectorAll|closest|locator)\((.+)\)/);
      if (query) {
        const argument = resolveExpression(query[2]);
        if (argument) {
          const selector = query[1] && roots.has(query[1]) ? `${roots.get(query[1])} ${argument}` : argument;
          roots.set(assignment[1], selector);
        }
      } else {
        const value = resolveExpression(assignment[2]);
        if (value !== undefined) values.set(assignment[1], value);
      }
    }

    if (!/(querySelector|querySelectorAll|matches|closest|locator|waitForSelector|\$eval|\$\$eval)/.test(line)) return;
    for (const call of line.matchAll(/(?:([A-Za-z_$][\w$]*)\.)?(?:querySelector|querySelectorAll|matches|closest|locator|waitForSelector|\$eval|\$\$eval)\(([^,]+)(?:,|\))/g)) {
      const argument = resolveExpression(call[2]);
      if (!argument) continue;
      const selector = call[1] && roots.has(call[1]) ? `${roots.get(call[1])} ${argument}` : argument;
      const root = selector.match(componentRoot);
      if (root && selector.slice((root.index ?? 0) + root[0].length).trim()) {
        results.push({ file: relative, line: index + 1, selector, origin: "scan" });
      }
    }
  });
  return results;
}

async function corroboratingScan(consumerRoot, excludeGlobs) {
  const results = [];
  const excluded = [];
  const excludePatterns = excludeGlobs.map(globToRegExp);
  for (const file of await sourceFiles(consumerRoot, consumerRoot, excludePatterns, excluded)) {
    const relative = path.relative(consumerRoot, file);
    const source = await readFile(file, "utf8");
    const extension = path.extname(file).toLowerCase();
    results.push(...[".css", ".scss", ".sass", ".less", ".styl"].includes(extension)
      ? scanCss(file, relative, source)
      : scanRuntime(relative, source));
  }
  return { results, excluded };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  const consumerRoot = path.resolve(args.root);
  const inventoryPath = path.resolve(args.inventory);
  const inventory = normalizeInventory(JSON.parse(await readFile(inventoryPath, "utf8")));
  const scan = await corroboratingScan(consumerRoot, args.exclude);
  const keys = new Set(inventory.map((row) => `${row.file}:${row.line}:${row.selector}`));
  const rows = [...inventory, ...scan.results.filter((row) => !keys.has(`${row.file}:${row.line}:${row.selector}`))];
  const contract = await documentedHooks();
  let unresolved = 0;

  for (const row of rows) {
    const result = assess(row.selector, row.component, contract);
    if (!result.resolved) unresolved += 1;
    const status = result.resolved ? "RESOLVED" : "UNRESOLVED";
    console.log(`${status} ${row.file}:${row.line} ${JSON.stringify(row.selector)} — ${result.detail} (${row.origin})`);
  }
  if (args.exclude.length) console.log(`Excluded ${scan.excluded.length} source files by --exclude.`);
  console.log(`Checked ${rows.length} selector references: ${rows.length - unresolved} resolved, ${unresolved} unresolved.`);
  if (unresolved) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`check:consumer-dom: ${error instanceof Error ? error.message : String(error)}`);
  console.error(usage());
  process.exitCode = 2;
});
