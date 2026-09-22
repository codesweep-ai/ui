import { describe, expect, it } from "vitest";
import {
  MARK_GUTTER,
  MAX_AXIS_PIXELS,
  clampScale,
  markWidth,
  sharedWidth,
  nextPositions,
  positionForX,
  scaleLimits,
  visibleSlice,
  xForPosition,
  zoomAbout,
} from "./eventLanesPosition";

describe("position to pixel", () => {
  it("places the origin after the padding and scales every unit", () => {
    expect(xForPosition(100, 100, 2, 8)).toBe(8);
    expect(xForPosition(160, 100, 2, 8)).toBe(128);
  });

  it("round-trips through positionForX", () => {
    for (const position of [100, 100.25, 137, 9_999.5]) {
      const x = xForPosition(position, 100, 0.37, 8);
      expect(positionForX(x, 100, 0.37, 8)).toBeCloseTo(position, 9);
    }
  });
});

describe("mark width", () => {
  const size = 9;

  it("fills the gap to the next mark, less the gutter", () => {
    expect(markWidth(0, 5, undefined, 1, size)).toBe(5 - MARK_GUTTER);
  });

  it("clamps a dense run to a one-pixel hairline", () => {
    expect(markWidth(0, 0.1, undefined, 1, size)).toBe(1);
    expect(markWidth(0, 0, undefined, 1, size)).toBe(1);
  });

  it("clamps a sparse run to the mark size", () => {
    expect(markWidth(0, 1_000, undefined, 1, size)).toBe(size);
  });

  it("draws the last mark in its timeline at the mark size", () => {
    expect(markWidth(0, undefined, undefined, 1, size)).toBe(size);
  });

  it("draws an explicit extent at its true length, however long", () => {
    expect(markWidth(0, 1, 60, 2, size)).toBe(120);
    expect(markWidth(0, 1, 0, 2, size)).toBe(1);
  });

  it("widens as the scale grows, until the clamp", () => {
    const widths = [0.5, 1, 2, 4, 8].map((scale) => markWidth(0, 3, undefined, scale, size));
    expect(widths).toEqual([1, 2, 5, 9, 9]);
  });
});

describe("zoom about a fixed point", () => {
  it("keeps the position under the anchor where it was", () => {
    const origin = 50;
    const padding = 8;
    const scrollLeft = 400;
    const anchor = 230;
    const held = positionForX(scrollLeft + anchor, origin, 1.5, padding);
    for (const nextScale of [0.2, 1.5, 3, 40]) {
      const next = zoomAbout(1.5, nextScale, anchor, scrollLeft, origin, padding);
      expect(positionForX(next + anchor, origin, nextScale, padding)).toBeCloseTo(held, 9);
    }
  });

  it("changes nothing when the scale does not change", () => {
    expect(zoomAbout(2, 2, 120, 333, 0, 8)).toBeCloseTo(333, 9);
  });
});

describe("finding the visible marks by position", () => {
  const positions = Float64Array.from([0, 1, 2, 5, 8, 13, 21, 34]);

  it("returns the marks that begin inside the window", () => {
    const [start, end] = visibleSlice(positions, 4, 14, 0);
    expect(Array.from(positions.slice(start, end))).toEqual([5, 8, 13]);
  });

  it("reaches left by the longest extent, for a mark that begins before the window", () => {
    const [start, end] = visibleSlice(positions, 4, 14, 3);
    expect(Array.from(positions.slice(start, end))).toEqual([1, 2, 5, 8, 13]);
  });

  it("returns an empty slice for a window between marks or past the end", () => {
    const [emptyStart, emptyEnd] = visibleSlice(positions, 14, 20, 0);
    expect(emptyEnd - emptyStart).toBe(0);
    const [pastStart, pastEnd] = visibleSlice(positions, 40, 60, 0);
    expect(pastEnd - pastStart).toBe(0);
  });

  it("finds a window in a large run without scanning it", () => {
    const many = Float64Array.from({ length: 300_000 }, (_, i) => i * 0.5);
    const [start, end] = visibleSlice(many, 1_000, 1_010, 0);
    expect([start, end]).toEqual([2_000, 2_021]);
  });
});

describe("timelines", () => {
  it("orders several lanes as one timeline, so work never stretches across waiting", () => {
    const work = [{ i: 0, position: 0 }, { i: 2, position: 10 }];
    const waiting = [{ i: 1, position: 4 }];
    const { next } = nextPositions([[...work, ...waiting]]);
    expect(next.get(0)).toBe(4);
    expect(next.get(1)).toBe(10);
    expect(next.has(2)).toBe(false);
  });

  it("keeps separate timelines apart", () => {
    const { next } = nextPositions([[{ i: 0, position: 0 }], [{ i: 1, position: 1 }]]);
    expect(next.size).toBe(0);
  });

  it("reports the smallest positive gap, ignoring shared positions", () => {
    const { smallestGap } = nextPositions([[
      { i: 0, position: 0 },
      { i: 1, position: 0 },
      { i: 2, position: 0.25 },
      { i: 3, position: 3 },
    ]]);
    expect(smallestGap).toBe(0.25);
  });
});

describe("scale limits", () => {
  it("fits the whole extent when fully zoomed out", () => {
    const limits = scaleLimits(1_000, 1_016, 16, 1, 9);
    expect(limits.min).toBe(1);
  });

  it("zooms in until the closest marks sit a few mark sizes apart", () => {
    const limits = scaleLimits(1_000, 1_016, 16, 0.5, 9);
    expect(limits.max).toBe(72);
  });

  it("never grows the axis past what a browser can lay out", () => {
    const limits = scaleLimits(10_000_000, 1_016, 16, 0.0001, 9);
    expect(10_000_000 * limits.max).toBeLessThanOrEqual(MAX_AXIS_PIXELS);
  });

  it("clamps a requested scale, and falls back to fitting for nonsense", () => {
    const limits = { min: 1, max: 10 };
    expect(clampScale(0.1, limits)).toBe(1);
    expect(clampScale(50, limits)).toBe(10);
    expect(clampScale(4, limits)).toBe(4);
    expect(clampScale(Number.NaN, limits)).toBe(1);
    expect(clampScale(-3, limits)).toBe(1);
  });
});

describe("sharedWidth", () => {
  it("gives each of two marks half the gap, less the gutter, up to the mark size", () => {
    const size = 8;
    expect(sharedWidth(0, 7, 1, size)).toBe(3);
    expect(sharedWidth(0, 100, 1, size)).toBe(size);
    expect(sharedWidth(0, 0, 1, size)).toBe(1);
  });
});

describe("nextPositions indices", () => {
  it("names each mark's neighbours by index as well as by position", () => {
    const { nextIndex, previousIndex } = nextPositions([[{ i: 5, position: 10 }, { i: 2, position: 3 }]]);
    expect(nextIndex.get(2)).toBe(5);
    expect(previousIndex.get(5)).toBe(2);
    expect(nextIndex.has(5)).toBe(false);
  });
});
