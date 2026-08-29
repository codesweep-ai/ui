import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checker = path.join(path.dirname(fileURLToPath(import.meta.url)), "check-consumer-dom-contract.mjs");

async function fixture(source) {
  const root = await mkdtemp(path.join(tmpdir(), "consumer-dom-checker-"));
  const consumer = path.join(root, "consumer");
  const inventory = path.join(root, "inventory.json");
  await mkdir(path.join(consumer, "src"), { recursive: true });
  await writeFile(path.join(consumer, "src", "a.tsx"), source);
  await writeFile(inventory, '{"selectors":[]}\n');
  return { root, consumer, inventory };
}

function run({ consumer, inventory }, extraArgs = []) {
  return spawnSync(process.execPath, [checker, "--root", consumer, "--inventory", inventory, ...extraArgs], {
    encoding: "utf8",
  });
}

test("a TSX const initializer completes instead of recursing", async (t) => {
  const files = await fixture("const x = 1;\n");
  t.after(() => rm(files.root, { recursive: true, force: true }));

  const result = run(files);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Checked 0 selector references: 0 resolved, 0 unresolved\./);
});

test("exclude globs omit generated files without hiding declared evidence", async (t) => {
  const files = await fixture("const x = 1;\n");
  t.after(() => rm(files.root, { recursive: true, force: true }));
  const generated = path.join(files.consumer, "internal", "viewer", "split", "assets");
  await mkdir(generated, { recursive: true });
  await writeFile(path.join(generated, "app.css"), '.x [data-component="Card"] div { color: red; }\n');
  await writeFile(files.inventory, JSON.stringify({ selectors: [{
    file: "internal/viewer/split/assets/app.css",
    line: 1,
    selector: "[data-card-header]",
    component: "Card",
  }] }));

  const unscoped = run(files);
  assert.equal(unscoped.status, 1, unscoped.stderr);
  assert.match(unscoped.stdout, /internal\/viewer\/split\/assets\/app\.css/);

  const excluded = run(files, ["--exclude", "internal/**/assets/**"]);
  assert.equal(excluded.status, 0, excluded.stderr);
  assert.match(excluded.stdout, /app\.css.*\(declared\)/);
  assert.doesNotMatch(excluded.stdout, /app\.css.*\(scan\)/);
  assert.match(excluded.stdout, /Excluded 1 source files by --exclude\./);
});

test("assembled selectors still produce a normal unresolved exit", async (t) => {
  const files = await fixture([
    'const rootSelector = \'[data-component="Card"]\';',
    "const root = document.querySelector(rootSelector);",
    "const content = root.querySelector('div');",
  ].join("\n"));
  t.after(() => rm(files.root, { recursive: true, force: true }));

  const result = run(files);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /UNRESOLVED src\/a\.tsx:3/);
  assert.match(result.stdout, /Card.*div/);
});
