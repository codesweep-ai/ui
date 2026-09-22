// When the visual gate calls two captures different. scripts/visual-baseline.mjs
// runs the gate, and this file holds the one decision a test needs to reach
// without starting a browser.
//
// A difference a user could see is a difference. One no user could see is
// noise, and a gate that fails on noise gets its baseline re-recorded to make it
// stop, which moves a frozen value for nothing.
//
// Runs in the pinned image are deterministic to the pixel, with one exception
// measured. A rounded corner drawn in the dark theme blends one step in 255 low
// in one or two channels, at random. It failed 1 run in 9 on unchanged trees,
// three pixels in each of dark/markdown-minimap.png and dark/markdown-viewer.png,
// at the same offsets from their bottom-right corner every time.
//
// pixelmatch fails a pixel whose perceptual distance exceeds 35215 × threshold².
// At a threshold of 0 that is any change at all, so the corner fails the run. At
// 0.005 a pixel may move one step in every channel at once, and a grey or green
// shift of two steps still counts. The window is narrow, and both ends are
// measured. The corner counts 3 pixels at 0 and none from 0.004 upward.
// lucide-react 1.47's redrawn check mark, the smallest real change on record,
// counts 4 pixels in each theme up to 0.006 and erodes from 0.007.
// scripts/pixel-diff.test.mjs holds both ends.
//
// The threshold was once pixelmatch's default of 0.1, which ignored a shift of
// up to 26 in 255 however many pixels carried it. A table repainting from the
// page grey to its own card background moved 358109 of 371856 pixels and was
// reported as zero. Geometry survives a loose threshold, because moving an
// element puts dark text where light background was. Colour does not, and a
// design system is mostly colour.
//
// Neither allowance below moves: one pixel past the threshold fails the run.
import pixelmatch from "pixelmatch";

export const PIXEL_THRESHOLD = 0.005;
export const MAX_DIFF_RATIO = 0;
export const MAX_DIFF_PIXELS = 0;

/**
 * Counts the pixels of `actual` that differ from `expected`, two decoded PNGs of
 * the same size, and paints them into `output` when one is given.
 */
export function countDifferingPixels(expected, actual, output = null) {
  return pixelmatch(expected.data, actual.data, output, expected.width, expected.height, {
    threshold: PIXEL_THRESHOLD,
  });
}
