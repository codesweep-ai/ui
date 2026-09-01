import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(HERE, "dev-version.mjs");

// The commit the fixture is built around. A fixed committer date is what lets
// the expected stamp be written out literally: 2026-08-31T06:39:19Z renders as
// 20260831063919 in UTC, and as a different day in either zone the test runs
// the script under.
const COMMITTED = "2026-08-31T06:39:19+00:00";
const STAMP_UTC = "20260831063919";

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

// A throwaway repository holding a copy of the script, so the test never reads
// the version or the history of the checkout it is running in.
async function fixture(version = "0.2.0") {
  const root = await mkdtemp(path.join(tmpdir(), "dev-version-"));
  await mkdir(path.join(root, "scripts"), { recursive: true });
  await copyFile(script, path.join(root, "scripts", "dev-version.mjs"));
  await writeFile(path.join(root, "package.json"), `${JSON.stringify({ name: "fixture", version }, null, 2)}\n`);

  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "fixture@example.com");
  git(root, "config", "user.name", "fixture");
  git(root, "add", ".");
  spawnSync("git", ["commit", "-q", "-m", "fixture"], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, GIT_AUTHOR_DATE: COMMITTED, GIT_COMMITTER_DATE: COMMITTED },
  });
  return root;
}

function run(root, tz) {
  return spawnSync(process.execPath, [path.join(root, "scripts", "dev-version.mjs")], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, TZ: tz },
  });
}

test("the same commit names itself the same way in every timezone", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  // Three zones straddling the UTC day boundary for this commit: the stamp is
  // yesterday in Los Angeles and tomorrow in Tokyo if the local zone leaks in.
  const versions = ["UTC", "America/Los_Angeles", "Asia/Tokyo"].map((tz) => {
    const result = run(root, tz);
    assert.equal(result.status, 0, `${tz}: ${result.stderr}`);
    return result.stdout.trim();
  });

  assert.deepEqual(new Set(versions).size, 1, `zones disagreed: ${versions.join(", ")}`);
});

test("the stamp is the commit's UTC time, and the patch is bumped past the release", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));

  const short = git(root, "rev-parse", "--short=7", "HEAD");
  const result = run(root, "America/Los_Angeles");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), `0.2.1-dev.${STAMP_UTC}.${short}`);
});

test("a dirty tree describes no commit, so it refuses to name one", async (t) => {
  const root = await fixture();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, "stray.txt"), "uncommitted\n");

  const result = run(root, "UTC");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /uncommitted changes/);
});

test("a version that is not a plain release is refused", async (t) => {
  const root = await fixture("0.2.0-rc.1");
  t.after(() => rm(root, { recursive: true, force: true }));

  const result = run(root, "UTC");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not a plain release version/);
});
