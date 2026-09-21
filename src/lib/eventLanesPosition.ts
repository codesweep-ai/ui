/** Geometry for EventLanes' positioned layout. Pure functions over numbers, so
 *  the layout's arithmetic is testable without a canvas. Not public API: the
 *  package index does not re-export this module.
 *
 *  Units are the consumer's. A position is a number on their scale, the scale
 *  is CSS pixels per unit, and the axis begins at the smallest position the
 *  data holds, its origin, after the same boundary padding the index layout
 *  reserves for selection halos. */

/** Pixels kept free between a mark and the next one in its timeline. */
export const MARK_GUTTER = 1;

/** Browsers stop laying out an element somewhere past 16 million pixels, and
 *  scrolling degrades well before that. The deepest zoom keeps the axis inside
 *  this width. */
export const MAX_AXIS_PIXELS = 8_000_000;

/** The deepest default zoom puts the two closest marks this many mark sizes
 *  apart, which is enough to read and click either. */
const DEEPEST_GAP_IN_MARKS = 4;

export function xForPosition(position: number, origin: number, scale: number, padding: number) {
  return padding + (position - origin) * scale;
}

export function positionForX(x: number, origin: number, scale: number, padding: number) {
  return origin + (x - padding) / scale;
}

/** A mark's drawn width in pixels. An explicit extent draws at its true length.
 *  Otherwise the mark fills the gap to the next mark in its timeline, less the
 *  gutter, clamped between one pixel and the mark size: dense runs become
 *  hairlines and sparse ones stay readable. The last mark has no gap and draws
 *  at the mark size. */
export function markWidth(
  position: number,
  next: number | undefined,
  extent: number | undefined,
  scale: number,
  markSize: number,
) {
  if (extent !== undefined) return Math.max(1, extent * scale);
  if (next === undefined) return markSize;
  return Math.max(1, Math.min(markSize, (next - position) * scale - MARK_GUTTER));
}

/** The half-open range [start, end) of a sorted position array that can paint
 *  inside [from, to]. A mark begins at its position and reaches at most `reach`
 *  units right of it, so the search starts that far left of the window. */
export function visibleSlice(positions: ArrayLike<number>, from: number, to: number, reach: number) {
  return [lowerBound(positions, from - reach), upperBound(positions, to)] as const;
}

/** The first index whose position is at least `value`. */
export function lowerBound(positions: ArrayLike<number>, value: number) {
  let low = 0;
  let high = positions.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (positions[middle] < value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** The first index whose position is greater than `value`. */
export function upperBound(positions: ArrayLike<number>, value: number) {
  let low = 0;
  let high = positions.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (positions[middle] <= value) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** The scroll offset that keeps the position under `anchor`, a pixel offset in
 *  the viewport, in place when the scale changes. */
export function zoomAbout(
  scale: number,
  nextScale: number,
  anchor: number,
  scrollLeft: number,
  origin: number,
  padding: number,
) {
  const held = positionForX(scrollLeft + anchor, origin, scale, padding);
  return xForPosition(held, origin, nextScale, padding) - anchor;
}

export interface ScaleLimits {
  /** The scale that fits the whole extent in the viewport. */
  min: number;
  max: number;
}

/** How far out and in the view may zoom. Fully out shows the whole extent.
 *  Fully in puts the closest two marks a few mark sizes apart, and never grows
 *  the axis past what a browser can lay out. `smallestGap` is the least positive
 *  distance between neighbouring marks, or undefined when there is none. */
export function scaleLimits(
  extent: number,
  viewportWidth: number,
  padding: number,
  smallestGap: number | undefined,
  markSize: number,
): ScaleLimits {
  const room = Math.max(1, viewportWidth - padding * 2);
  const min = extent > 0 ? room / extent : 1;
  const readable = smallestGap && smallestGap > 0 ? (markSize * DEEPEST_GAP_IN_MARKS) / smallestGap : min * 64;
  const layable = extent > 0 ? (MAX_AXIS_PIXELS - padding * 2) / extent : readable;
  return { min, max: Math.max(min, Math.min(readable, layable)) };
}

export function clampScale(scale: number, limits: ScaleLimits) {
  if (!Number.isFinite(scale) || scale <= 0) return limits.min;
  return Math.max(limits.min, Math.min(limits.max, scale));
}

/** One timeline's marks in drawing order: by position, then by index. */
export interface TimelineMark {
  i: number;
  position: number;
}

/** Each mark's next position in its timeline, keyed by index. Several lanes can
 *  form one timeline, so the order is taken across all of them: work drawn in
 *  one lane never stretches across waiting drawn in another. Marks sharing a
 *  position have no gap and draw as hairlines. */
export function nextPositions(timelines: Iterable<readonly TimelineMark[]>) {
  const next = new Map<number, number>();
  let smallestGap: number | undefined;
  for (const marks of timelines) {
    const ordered = [...marks].sort((a, b) => a.position - b.position || a.i - b.i);
    for (let index = 0; index + 1 < ordered.length; index += 1) {
      const gap = ordered[index + 1].position - ordered[index].position;
      next.set(ordered[index].i, ordered[index + 1].position);
      if (gap > 0 && (smallestGap === undefined || gap < smallestGap)) smallestGap = gap;
    }
  }
  return { next, smallestGap };
}
