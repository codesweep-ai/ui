import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

import { MAX_DIFF_PIXELS, MAX_DIFF_RATIO, countDifferingPixels } from "./pixel-diff.mjs";

const FIXTURES = path.join(import.meta.dirname, "fixtures", "pixel-diff");
const read = (name) => PNG.sync.read(readFileSync(path.join(FIXTURES, name)));

// The bottom-right 8×8 of dark/markdown-minimap.png. dark/markdown-viewer.png
// ends in the same bytes, because it draws the same corner.
const CORNER = "rounded-corner-dark.png";

// What the flake did, measured on a red run whose images were kept: the offset
// from the bottom-right corner, the baseline pixel and the pixel rendered.
const FLAKE = [
  { dx: -1, dy: -4, was: [11, 15, 21, 255], now: [11, 15, 20, 255] },
  { dx: -1, dy: -3, was: [19, 23, 28, 255], now: [18, 22, 28, 255] },
  { dx: -2, dy: -2, was: [16, 20, 25, 255], now: [16, 19, 25, 255] },
];

function withFlake(image) {
  const flaked = new PNG({ width: image.width, height: image.height });
  image.data.copy(flaked.data);
  for (const { dx, dy, was, now } of FLAKE) {
    const at = ((image.height + dy) * image.width + image.width + dx) * 4;
    assert.deepEqual([...image.data.subarray(at, at + 4)], was);
    flaked.data.set(now, at);
  }
  return flaked;
}

test("the dark rounded corner's rounding flake is not a difference", () => {
  const corner = read(CORNER);
  const flaked = withFlake(corner);
  // At a threshold of 0 the fixture fails exactly as the gate did, so a pass
  // below is the threshold's doing rather than a fixture that lost the flake.
  assert.equal(pixelmatch(corner.data, flaked.data, null, corner.width, corner.height, { threshold: 0 }), 3);
  assert.equal(countDifferingPixels(corner, flaked), 0);
});

// The 14×13 of {theme}/app-shell.png around the CheckCircle2 icon, as the
// baseline has it and as lucide-react 1.47 redraws it. 19 pixels move in each.
// Setting antialiasing aside counted 4 of them, and a threshold that counts
// fewer than these has started to hide real changes.
test("lucide-react 1.47's redrawn check mark counts its antialiased edge", () => {
  for (const [theme, counted] of [["dark", 16], ["light", 17]]) {
    const before = read(`check-mark-${theme}-lucide-0.563.png`);
    const after = read(`check-mark-${theme}-lucide-1.47.png`);
    assert.equal(countDifferingPixels(before, after), counted, theme);
  }
});

test("one pixel past the threshold fails the run", () => {
  assert.equal(MAX_DIFF_PIXELS, 0);
  assert.equal(MAX_DIFF_RATIO, 0);
});
