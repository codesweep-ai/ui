// The visual baseline is a set of pixels drawn by the Chromium and the fonts
// inside one container image, and the comparison allows no difference at all.
// The tag naming that image is mutable: a vendor rebuilding v1.62.1-noble on a
// newer base publishes different bytes under the same name, and different font
// packages rasterise text differently. Every capture then fails at once, with
// the version, the lockfile and the tag all unchanged, so the diff holds
// nothing that explains it and the branch looks like the culprit.
//
// So the digests the baseline was drawn by are recorded beside the baseline.
// capture writes them, compare reads them, and a rebuild becomes one sentence
// naming the cause instead of 104 failures pointing nowhere.

import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

export const RECORD = path.join("visual-baseline", "render-image.json");

export function readRecord(root) {
  try {
    return JSON.parse(readFileSync(path.join(root, RECORD), "utf8"));
  } catch {
    return null;
  }
}

export function writeRecord(root, record) {
  const file = path.join(root, RECORD);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return file;
}

// A tag can carry two digests, the manifest list's and the platform manifest's,
// and an engine reports whichever it stored. docker reports one, podman both.
// So the record keeps every digest it was shown and a match is an intersection:
// the list digest agrees across architectures, the platform digest across
// engines, and a rebuilt tag produces neither.
export function digestsOf(engine, image) {
  const out = spawnSync(engine, ["image", "inspect", "--format", "{{json .RepoDigests}}", image], {
    encoding: "utf8",
  });
  if (out.status !== 0) return [];
  let refs;
  try {
    refs = JSON.parse(out.stdout.trim() || "[]");
  } catch {
    return [];
  }
  return (refs ?? [])
    .map((ref) => ref.slice(ref.indexOf("@") + 1))
    .filter((digest) => digest.startsWith("sha256:"))
    .sort();
}

// Four verdicts rather than a boolean, because they need different sentences.
// "ok" renders, "unknown" renders with a warning, and the other two stop before
// rendering anything.
export function verdictFor(record, image, digests) {
  const recorded = record?.digests ?? [];

  if (recorded.length === 0) {
    return {
      state: "unrecorded",
      message: [
        `visual: no digest is recorded for ${image}.`,
        "",
        `${RECORD} names the image bytes the baseline was drawn by. Without it a`,
        "vendor rebuild of the tag fails every capture with nothing to explain why.",
        "Run npm run visual:capture to record it alongside the captures.",
      ].join("\n"),
    };
  }

  if (record.image !== image) {
    return {
      state: "mismatch",
      message: [
        `visual: the baseline was drawn in ${record.image}, and this run would use ${image}.`,
        "",
        "The installed playwright version moved, so the browser that drew the baseline",
        "is gone and every capture would fail. Re-record with npm run visual:capture,",
        "and review both themes and the accessibility report before you keep it.",
      ].join("\n"),
    };
  }

  if (digests.length === 0) {
    return {
      state: "unknown",
      message: `visual: cannot read the digest of ${image}, so the recorded one went unchecked.`,
    };
  }

  if (digests.some((digest) => recorded.includes(digest))) return { state: "ok", message: "" };

  return {
    state: "mismatch",
    message: [
      `visual: ${image} is not the image the baseline was drawn by.`,
      "",
      ...recorded.map((digest, i) => `  ${i === 0 ? "recorded" : "        "}  ${digest}`),
      ...digests.map((digest, i) => `  ${i === 0 ? "present " : "        "}  ${digest}`),
      "",
      "A tag is mutable, and the bytes behind this one have changed. The Chromium or",
      "the fonts inside may differ, in which case every capture fails and the diff",
      "holds nothing that explains it.",
      "",
      "Decide whether to accept the new image before re-recording. If you do, run",
      "npm run visual:capture and review both themes and the accessibility report.",
    ].join("\n"),
  };
}
