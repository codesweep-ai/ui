#!/usr/bin/env node
// Hold every version annotation to a version this package has actually reached.
//
// Two kinds exist. `since:` in the frontmatter of components/*.md and
// patterns/*.md becomes the `since` field of catalog.json, and `Added vX.Y.Z`
// sits in prose and in TSDoc beside the prop it describes.
//
// Both answer one question for a reader: do I have this yet. An annotation
// naming a version above the one in package.json cannot answer it, because
// there is no release it could refer to, and a reader who meets one learns to
// ignore the field. That is how this package came to document a 1.x line it
// never published while shipping 0.3.0.
//
// Only the upper bound is checked. A version below the package's own is the
// normal case: it says the thing has been there since an earlier release.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCANNED = ["components", "patterns", "src"];
const EXTENSIONS = [".md", ".ts", ".tsx", ".css"];

/** [major, minor, patch], or null when it is not a three-part version. */
export function parseVersion(text) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(text).trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Whether a is a later version than b. Equal is not above. */
export function isAbove(a, b) {
  const [x, y] = [parseVersion(a), parseVersion(b)];
  if (!x || !y) return false;
  for (let i = 0; i < 3; i += 1) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
}

/** Every `Added vX.Y.Z` in a file, with the line it sits on. */
export function findAnnotations(text) {
  const out = [];
  text.split(/\r?\n/).forEach((line, i) => {
    for (const m of line.matchAll(/Added v(\d+\.\d+\.\d+)/g))
      out.push({ version: m[1], line: i + 1 });
  });
  return out;
}

/** The frontmatter `since:` of a spec, or null where it declares none. */
export function findSince(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") return null;
    const m = /^since:\s*["']?([^"'\s#]+)/.exec(lines[i]);
    if (m) return { version: m[1], line: i + 1 };
  }
  return null;
}

/**
 * What a set of files gets wrong about the version they ship in. Takes the
 * files already read, so the whole check is testable without a filesystem.
 */
export function check(files, packageVersion) {
  const problems = [];
  if (!parseVersion(packageVersion))
    return [`package.json declares a version this cannot read: ${packageVersion}`];

  for (const { path, text } of files) {
    const since = findSince(text);
    if (since && !parseVersion(since.version))
      problems.push(`${path}:${since.line}: since "${since.version}" is not a three-part version`);
    else if (since && isAbove(since.version, packageVersion))
      problems.push(`${path}:${since.line}: since ${since.version} names a version above the package's ${packageVersion}`);

    for (const a of findAnnotations(text))
      if (isAbove(a.version, packageVersion))
        problems.push(`${path}:${a.line}: "Added v${a.version}" names a version above the package's ${packageVersion}`);
  }
  return problems;
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (EXTENSIONS.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const version = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
  const files = SCANNED.flatMap((d) => walk(join(ROOT, d))).map((full) => ({
    path: relative(ROOT, full),
    text: readFileSync(full, "utf8"),
  }));
  const problems = check(files, version);
  if (problems.length) {
    console.error(`✗ versions: ${problems.length} annotation(s) name a version this package has not reached:`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error(`\nThe package is at ${version}. An annotation above it refers to no release.`);
    process.exit(1);
  }
  const counted = files.reduce((n, f) => n + findAnnotations(f.text).length + (findSince(f.text) ? 1 : 0), 0);
  console.log(`✓ versions: ${counted} annotation(s) across ${files.length} files, none above ${version}`);
}
