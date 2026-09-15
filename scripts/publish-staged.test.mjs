import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(HERE, "publish-staged.mjs");
const SPEC = "@codesweep-ai/ui@0.3.1-dev.20260915084532.5566e7d";

// An npm that answers `view` from REGISTRY and records every `publish`, so no
// test reaches a real registry. REGISTRY holds "spec gitHead" lines, with "-"
// for a version the registry holds without a gitHead.
const FAKE_NPM = `#!/bin/sh
case "$1" in
view)
  [ -n "$FAKE_ERROR" ] && { echo "npm error code ECONNRESET" >&2; exit 1; }
  line=$(grep -F "$2 " "$REGISTRY" | head -1)
  [ -z "$line" ] && { echo "npm error code E404" >&2; exit 1; }
  head=\${line#* }
  [ "$head" = "-" ] && head=""
  printf '%s\\n' "$head"
  ;;
publish)
  shift
  echo "$*" >>"$PUBLISHED"
  ;;
*) exit 2 ;;
esac
`;

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

// A throwaway repository with a copy of the script, a staged package and the
// fake npm first on PATH.
async function fixture({ staged = true } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "publish-staged-"));
  await mkdir(path.join(root, "scripts"));
  await mkdir(path.join(root, "bin"));
  await copyFile(script, path.join(root, "scripts", "publish-staged.mjs"));
  await writeFile(path.join(root, "bin", "npm"), FAKE_NPM);
  await chmod(path.join(root, "bin", "npm"), 0o755);
  if (staged) {
    const [name, version] = [SPEC.slice(0, SPEC.lastIndexOf("@")), SPEC.slice(SPEC.lastIndexOf("@") + 1)];
    await mkdir(path.join(root, ".package"));
    await writeFile(path.join(root, ".package", "package.json"), JSON.stringify({ name, version }));
  }
  git(root, "init", "-q");
  git(root, "-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "fixture");
  await writeFile(path.join(root, "registry"), "");
  return { root, head: git(root, "rev-parse", "HEAD") };
}

async function run(root, { registry = [], env = {}, args = [] } = {}) {
  await writeFile(path.join(root, "registry"), registry.map((l) => `${l}\n`).join(""));
  const result = spawnSync(process.execPath, [path.join(root, "scripts", "publish-staged.mjs"), ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${path.join(root, "bin")}${path.delimiter}${process.env.PATH}`,
      REGISTRY: path.join(root, "registry"),
      PUBLISHED: path.join(root, "published"),
      ...env,
    },
  });
  const published = await readFile(path.join(root, "published"), "utf8").catch(() => "");
  return { ...result, published: published.trim() };
}

test("publishes a version the registry does not hold, passing every argument on", async (t) => {
  const { root } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const r = await run(root, { args: ["--tag", "dev", "--provenance", "--access", "public", "--dry-run"] });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.published, ".package --tag dev --provenance --access public --dry-run");
});

test("skips a version this commit already published", async (t) => {
  const { root, head } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const r = await run(root, { registry: [`${SPEC} ${head}`] });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.published, "");
  assert.match(r.stdout, /already published from this commit/);
});

test("stops on a version another commit published", async (t) => {
  const { root, head } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const other = "1".repeat(40);
  const r = await run(root, { registry: [`${SPEC} ${other}`] });
  assert.equal(r.status, 1);
  assert.equal(r.published, "");
  assert.match(r.stderr, new RegExp(`from ${other} rather than ${head}`));
});

test("stops on a version published with no commit recorded", async (t) => {
  const { root } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const r = await run(root, { registry: [`${SPEC} -`] });
  assert.equal(r.status, 1);
  assert.equal(r.published, "");
  assert.match(r.stderr, /from an unrecorded commit/);
});

test("stops when the registry cannot be asked, rather than publishing blind", async (t) => {
  const { root } = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  const r = await run(root, { env: { FAKE_ERROR: "1" } });
  assert.equal(r.status, 1);
  assert.equal(r.published, "");
  assert.match(r.stderr, /could not ask the registry.*\n.*ECONNRESET/);
});

test("stops when nothing is staged", async (t) => {
  const { root } = await fixture({ staged: false });
  t.after(() => rm(root, { recursive: true, force: true }));
  const r = await run(root);
  assert.equal(r.status, 1);
  assert.equal(r.published, "");
  assert.match(r.stderr, /npm run stage/);
});
