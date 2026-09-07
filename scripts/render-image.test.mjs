import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { RECORD, readRecord, verdictFor, writeRecord } from "./render-image.mjs";

const IMAGE = "mcr.microsoft.com/playwright:v1.62.1-noble";
// The two digests podman reports for that tag, measured. The first is the
// manifest list's and the second the amd64 manifest's.
const LIST = "sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e";
const PLATFORM = "sha256:c091b21d9fae78c76e85cd4356431e9b018402f172a214fc7d7a5e9a7e29d8ac";
const REBUILT = "sha256:0000000000000000000000000000000000000000000000000000000000000000";

const record = { image: IMAGE, digests: [LIST, PLATFORM], recorded: "2026-09-07" };

test("either digest identifies the recorded image", () => {
  assert.equal(verdictFor(record, IMAGE, [LIST, PLATFORM]).state, "ok");
  assert.equal(verdictFor(record, IMAGE, [LIST]).state, "ok");
  assert.equal(verdictFor(record, IMAGE, [PLATFORM]).state, "ok");
});

test("a record from one engine matches a run on the other", () => {
  const fromDocker = { ...record, digests: [LIST] };
  assert.equal(verdictFor(fromDocker, IMAGE, [LIST, PLATFORM]).state, "ok");
});

test("a rebuilt tag is a mismatch, and the message says the tag is mutable", () => {
  const verdict = verdictFor(record, IMAGE, [REBUILT]);
  assert.equal(verdict.state, "mismatch");
  assert.match(verdict.message, /is not the image the baseline was drawn by/);
  assert.match(verdict.message, /A tag is mutable/);
  assert.match(verdict.message, new RegExp(LIST));
  assert.match(verdict.message, new RegExp(REBUILT));
});

test("a moved playwright version is named as the cause instead", () => {
  const verdict = verdictFor(record, "mcr.microsoft.com/playwright:v1.63.0-noble", [REBUILT]);
  assert.equal(verdict.state, "mismatch");
  assert.match(verdict.message, /playwright version moved/);
});

test("an unreadable digest warns rather than failing the run", () => {
  const verdict = verdictFor(record, IMAGE, []);
  assert.equal(verdict.state, "unknown");
  assert.match(verdict.message, /went unchecked/);
});

test("no record at all points at the command that writes one", () => {
  assert.equal(verdictFor(null, IMAGE, [LIST]).state, "unrecorded");
  assert.equal(verdictFor({ image: IMAGE, digests: [] }, IMAGE, [LIST]).state, "unrecorded");
  assert.match(verdictFor(null, IMAGE, [LIST]).message, /visual:capture/);
});

test("a written record reads back, and a missing one reads as null", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "render-image-"));
  try {
    assert.equal(readRecord(root), null);
    mkdirSync(path.join(root, path.dirname(RECORD)), { recursive: true });
    writeRecord(root, record);
    assert.deepEqual(readRecord(root), record);
    assert.equal(verdictFor(readRecord(root), IMAGE, [PLATFORM]).state, "ok");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
