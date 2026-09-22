"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { Tooltip } from "./Tooltip";
import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { ChartTooltip } from "./ChartTooltip";
import {
  clampScale,
  lowerBound,
  markWidth,
  nextPositions,
  positionForX,
  scaleLimits,
  upperBound,
  visibleSlice,
  xForPosition,
  zoomAbout,
  type TimelineMark,
} from "../lib/eventLanesPosition";

export type EventShape = "square" | "circle" | "hollow" | "hollow-circle" | "hatched";
export type EventToken = `--${string}`;

export interface EventLane {
  /** Stable lane key referenced by events and spans. */
  id: string;
  /** Visible label and accessible lane name. */
  label: string;
  /** Optional tooltip for the visible lane label. */
  title?: string;
  /** Optional context included in event option announcements. */
  description?: string;
  /** Optional presentation hook for this lane's visible label. */
  className?: string;
  /** Row height in CSS pixels, at least 8. Default 28, which a height under 8
   *  or not finite also gets, with a development warning. */
  height?: number;
  /** Draw this lane's events as bars rising from the row's floor ("up") or
   *  hanging from its top ("down"), sized by each event's `magnitude`. */
  bars?: "up" | "down";
  /** A bar's length at magnitude 0, in CSS pixels. Default: the mark size, so
   *  an event with no magnitude reads as the square it would otherwise be. */
  barFloor?: number;
  /** false leaves this lane out of the overview, and the lanes that remain
   *  share its height. Default true. */
  overview?: boolean;
  /** Lanes naming the same group form one timeline in the positioned layout:
   *  their marks share one order for width and arrow keys, and a span on any of
   *  them boxes them all. A lane with no group is a timeline of its own. */
  group?: string;
  /** Takes no height and draws nothing, and the keyboard skips its events. In
   *  the positioned layout its marks still count for their timeline's widths,
   *  so hiding a lane never moves the marks in the others. */
  hidden?: boolean;
  /** Positioned layout: what a mark's width is measured against. "timeline",
   *  the default, is the gap to the next mark anywhere in the lane's
   *  timeline. "lane" is the gap to the next mark in this lane alone, for a
   *  sparse row that shares a timeline with dense ones and would otherwise
   *  draw hairlines. The timeline still boxes and walks the lane. */
  widthBy?: "timeline" | "lane";
  /** A band behind the lane in this token, from the gutter to the end of the
   *  axis. Neighbouring lanes carrying the same token form one band. */
  shade?: EventToken;
  /** Empty space above the lane, in CSS pixels, which no band covers. A hidden
   *  lane keeps none. */
  gapBefore?: number;
}

export interface EventLaneEvent<K extends string = string> {
  /** Unique, non-negative integer on the shared global axis. */
  i: number;
  lane: string;
  kind: K;
  shape: EventShape;
  label: string;
  at: string;
  error?: boolean;
  tick?: boolean;
  marker?: string;
  /** The marker's token. Default --color-accent. */
  markerToken?: EventToken;
  /** Permanent token-coloured ring, painted below linked and selected halos. */
  halo?: EventToken;
  /** 0 to 1: how far the bar reaches from its floor toward the row's far edge.
   *  Read only in a lane with `bars`; clamped, and 0 when absent. */
  magnitude?: number;
  /** The value ran past the consumer's ceiling: the bar carries a broken-bar
   *  notch at its far end. Read only in a lane with `bars`. */
  clipped?: boolean;
  /** Where the mark begins, in the consumer's axis units. Required in the
   *  positioned layout and ignored in the index layout. */
  position?: number;
  /** The mark's length in axis units. Absent, the mark fills the gap to the
   *  next mark in its timeline, clamped to the mark size. */
  extent?: number;
  /** Positioned layout: which edge sits at `position`. "start", the default,
   *  draws the mark to the right of its moment; "end" draws it to the left,
   *  for a mark that closes something, such as an opening whose box begins
   *  at the same moment. */
  anchor?: "start" | "end";
}

export interface EventLaneSpan {
  lane: string;
  /** Global indices in the index layout; axis units in the positioned one. */
  from: number;
  to: number;
  /** Identity for `selectedSpan` and `onSelectSpan`. Positioned layout. */
  id?: string;
  /** Short text drawn inside the box's top edge. Positioned layout. */
  label?: string;
  /** A trailing segment from `to` to here, in axis units. Positioned layout. */
  trail?: number;
  /** The trailing segment's token. Default --color-warning. */
  trailToken?: EventToken;
}

/** A line joining two marks, which may sit in different lanes. */
export interface EventLaneLink {
  from: number;
  to: number;
  /** Default "solid". */
  style?: "solid" | "dashed";
  /** Drawn heavier, in the link colour. */
  emphasized?: boolean;
}

/** The positioned layout's axis, as the ruler needs it to draw its own ticks. */
export interface EventLanesPositionContext {
  /** CSS pixels per axis unit. */
  scale: number;
  /** The smallest position in the data, where the axis begins. */
  origin: number;
  /** The largest position or span end in the data. */
  end: number;
  /** The axis units at the viewport's left and right edges. */
  visibleStart: number;
  visibleEnd: number;
  /** A position's x-coordinate in the scrolling content, and back. */
  xForPosition: (position: number) => number;
  positionForX: (x: number) => number;
}

export interface EventLanesRulerContext {
  start: 0;
  end: number;
  cellWidth: number;
  width: number;
  xForIndex: (i: number) => number;
  /** Present in the positioned layout. */
  position?: EventLanesPositionContext;
}

/** A visible range in axis units, as a consumer requests it. */
export interface EventLanesView {
  start: number;
  end: number;
}

/** The visible range and the scale that shows it, as the component reports it. */
export interface EventLanesViewState extends EventLanesView {
  scale: number;
}

export interface EventLanesProps<K extends string = string> {
  lanes: readonly EventLane[];
  events: readonly EventLaneEvent<K>[];
  spans?: readonly EventLaneSpan[];
  palette: Record<K, EventToken>;
  selected?: number | null;
  linked?: ReadonlySet<number>;
  hiddenKinds?: ReadonlySet<K>;
  emphasis?: ReadonlySet<number>;
  cellWidth?: number;
  /** "position" places each mark at its `position` on a continuous scale.
   *  Default "index": one `cellWidth` column per global index. */
  layout?: "index" | "position";
  /** Positioned layout: the range to show, in axis units. Applied whenever its
   *  value changes, so a page can restore a view or zoom to a preset. */
  view?: EventLanesView;
  /** Positioned layout: fires when the scale or the visible range changes. */
  onViewChange?: (view: EventLanesViewState) => void;
  /** Positioned layout: false leaves a Ctrl or Cmd wheel, and a pinch, to the
   *  browser, so a page can zoom by preset alone. The plain wheel still
   *  scrolls. Default true. */
  wheelZoom?: boolean;
  /** Positioned layout: false leaves a plain vertical wheel to the page, so a
   *  tall timeline in a long document does not catch the reader's scroll. A
   *  horizontal wheel or swipe still scrolls the axis. Default true. */
  wheelScroll?: boolean;
  /** Lines joining pairs of marks, drawn beneath the marks. */
  links?: readonly EventLaneLink[];
  /** Positioned layout: the `id` of the span drawn as selected. */
  selectedSpan?: string | null;
  /** Positioned layout: a click on a span's box, where no mark is hit. */
  onSelectSpan?: (span: EventLaneSpan) => void;
  /** What the overview draws. Default "marks". */
  overviewContent?: "marks" | "spans" | "both";
  overview?: "auto" | boolean;
  /** Overview height in CSS pixels. Default 40. */
  overviewHeight?: number;
  /** Where the overview sits. Default "below" the lanes; "above" puts it
   *  between whatever precedes the component and the ruler. */
  overviewPlacement?: "below" | "above";
  /** "overview" hides the lanes' own scrollbar while the overview is shown,
   *  since dragging or clicking the overview scrolls them. Default "native". */
  scrollbar?: "native" | "overview";
  ruler?: ReactNode | ((context: EventLanesRulerContext) => ReactNode);
  /** Sticky label for the ruler row. Default: "Index". */
  rulerLabel?: string;
  renderTooltip?: (event: EventLaneEvent<K>) => ReactNode;
  onSelect?: (event: EventLaneEvent<K>) => void;
  onHover?: (event: EventLaneEvent<K> | null) => void;
  "aria-label"?: string;
  id?: string;
  className?: string;
}

const DEFAULT_CELL_WIDTH = 10;
const LANE_HEIGHT = 28;
const RULER_HEIGHT = 24;
const OVERVIEW_HEIGHT = 40;
/** Rows reserved at the top and bottom of the overview for the viewport-window
 *  outline. The window used to be stroked across the full height with a 4px
 *  background halo, which is wider than a lane band once there are enough lanes
 *  (7 lanes => 40/7 ~= 5.7px): the halo painted over the first and last lanes'
 *  marks, so inside the window — exactly the range you are looking at — those
 *  two lanes appeared empty while showing ink outside it. Lane bands are laid
 *  out inside this inset so the outline can never erase them. */
const OVERVIEW_CHROME = 2;

/** The smallest row or overview a consumer may ask for. Below it the chrome
 *  and the one-pixel lane bands no longer fit. */
const MIN_LANE_HEIGHT = 8;
const MIN_OVERVIEW_HEIGHT = 8;
/** Space kept between a bar and its row's edges, so a clipped bar's notch cap
 *  stays inside the row it belongs to. */
const BAR_INSET = 3;

function validHeight(value: number | undefined, minimum: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum ? value : fallback;
}

function validGap(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

/** Each lane's top, height and the gap above it, in lane order, and the canvas
 *  height they sum to. Exported for its test (not public API). With no heights
 *  and no gaps supplied this is exactly the fixed 28px grid every consumer had
 *  before. */
export function laneLayout(lanes: readonly Pick<EventLane, "height" | "hidden" | "gapBefore">[]) {
  const tops: number[] = [];
  const heights: number[] = [];
  const gaps: number[] = [];
  let total = 0;
  for (const lane of lanes) {
    // A hidden lane keeps its place in the order and takes no height, and no gap.
    const height = lane.hidden ? 0 : validHeight(lane.height, MIN_LANE_HEIGHT, LANE_HEIGHT);
    const gap = lane.hidden ? 0 : validGap(lane.gapBefore);
    total += gap;
    tops.push(total);
    heights.push(height);
    gaps.push(gap);
    total += height;
  }
  return { tops, heights, gaps, total: Math.max(LANE_HEIGHT, total) };
}

/** The rectangle a bar occupies in a lane with `bars`. Exported for its test
 *  (not public API).
 *
 *  Length runs from `floor` at magnitude 0 to the row's height less the inset at
 *  each end at magnitude 1, linearly: the consumer chooses the scale (a
 *  logarithm of a duration, say) and hands over the fraction. The floor
 *  defaults to the mark size so a bar lane with no magnitudes draws the same
 *  squares as any other lane, only aligned to one edge. */
export function barRect(
  top: number,
  height: number,
  direction: "up" | "down",
  x: number,
  size: number,
  floor: number,
  magnitude: number | undefined,
) {
  const room = Math.max(1, height - BAR_INSET * 2);
  const base = Math.max(1, Math.min(floor, room));
  const fraction = typeof magnitude === "number" && Number.isFinite(magnitude)
    ? Math.max(0, Math.min(1, magnitude))
    : 0;
  const length = base + (room - base) * fraction;
  const y = direction === "up" ? top + height - BAR_INSET - length : top + BAR_INSET;
  return { x: x - size / 2, y, width: size, height: length };
}

type Rect = ReturnType<typeof barRect>;

/** The mark's drawn size for a given cell, exported for its budget test (not
 *  public API — not re-exported from the package index).
 *
 *  This is the chart's PRIMARY VISUAL ENCODING: shrink it and the timeline stops
 *  reading as one, with every other gate still green. It was
 *  `min(14, cellWidth - 4)` — a fixed inset, which costs a narrow cell far more
 *  than a wide one: at cellWidth 10 it took 40% of the cell (9px marks became
 *  6px, a dense barcode became a dotted line) while at 22 it took 18% and went
 *  unnoticed. A 1px gutter is what neighbouring marks actually need. */
export function markSizeFor(cellWidth: number) {
  return Math.max(5, Math.min(14, cellWidth - 1));
}

/** The selected halo's outer edge must fit before the first cell and after the
 * final cell. Reserving its overhang plus one antialiasing pixel keeps every
 * ordinary cell pitch unchanged while making both boundary rings fully paintable. */
export function axisPaddingFor(cellWidth: number) {
  const selectionRadius = (markSizeFor(cellWidth) + 7) / 2 + 3;
  return Math.max(0, selectionRadius - cellWidth / 2 + 1);
}

/** Overview geometry, exported for its regression test (not part of the public
 *  API — it is not re-exported from the package index).
 *
 *  The invariant: every lane band must lie strictly inside
 *  [OVERVIEW_CHROME, OVERVIEW_HEIGHT - OVERVIEW_CHROME], the region the
 *  viewport-window outline never paints. Violating it is invisible in a unit
 *  test and shows up as whole lanes missing from the overview. */
export function overviewLaneGeometry(laneCount: number, overviewHeight = OVERVIEW_HEIGHT) {
  const chromeTop = OVERVIEW_CHROME;
  const chromeBottom = overviewHeight - OVERVIEW_CHROME;
  const band = (chromeBottom - chromeTop) / Math.max(1, laneCount);
  // Padding scales with the band so it cannot invert it, and the 1px floor on
  // height is absorbed by clamping the top — otherwise a large lane count
  // pushes the final band back out through the chrome it was moved in to avoid.
  const pad = Math.min(1, band / 4);
  const markHeight = Math.max(1, band - pad * 2);
  return {
    chromeTop,
    chromeBottom,
    band,
    markHeight,
    markTop: (row: number) =>
      Math.min(chromeTop + row * band + pad, chromeBottom - markHeight),
  };
}
const OVERSCAN_CELLS = 4;
/** Pixels either side of a hairline mark that still count as hitting it. */
const HIT_SLACK = 3;
/** A span label's size in CSS pixels: small enough to sit inside a box's top
 *  edge above the bars. */
const SPAN_LABEL_SIZE = 11;
/** How strongly one wheel step zooms: a typical notch of 100 changes the scale
 *  by about a fifth. */
const ZOOM_RATE = 0.0025;

/** Two views are the same view when they agree to about a millionth of their
 *  width, which absorbs the floating-point drift of a round trip. */
function viewKey(view: { start: number; end: number }) {
  const width = Math.abs(view.end - view.start) || 1;
  const step = width / 1e6;
  return `${Math.round(view.start / step)}:${Math.round(view.end / step)}:${step.toPrecision(3)}`;
}
const EMPTY_SPANS: readonly EventLaneSpan[] = [];
const EMPTY_LINKS: readonly EventLaneLink[] = [];

interface ValidatedData<K extends string> {
  events: EventLaneEvent<K>[];
  spans: EventLaneSpan[];
  links: EventLaneLink[];
  warnings: string[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidIndex(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function validateData<K extends string>(
  lanes: readonly EventLane[],
  events: readonly EventLaneEvent<K>[],
  spans: readonly EventLaneSpan[],
  palette: Record<K, EventToken>,
  positioned = false,
  links: readonly EventLaneLink[] = EMPTY_LINKS,
): ValidatedData<K> {
  const warnings: string[] = [];
  const laneIds = new Set<string>();
  for (const lane of lanes) {
    if (laneIds.has(lane.id)) warnings.push(`duplicate lane id "${lane.id}"`);
    laneIds.add(lane.id);
    if (lane.height !== undefined && !(isFiniteNumber(lane.height) && lane.height >= MIN_LANE_HEIGHT)) {
      warnings.push(`lane "${lane.id}" has a height under ${MIN_LANE_HEIGHT} pixels, the least a row can draw, and gets the default ${LANE_HEIGHT}`);
    }
    if (lane.gapBefore !== undefined && !(isFiniteNumber(lane.gapBefore) && lane.gapBefore >= 0)) {
      warnings.push(`lane "${lane.id}" has a gapBefore that is not a non-negative number, and gets none`);
    }
  }

  const indices = new Set<number>();
  const validEvents: EventLaneEvent<K>[] = [];
  for (const event of events) {
    if (!laneIds.has(event.lane)) {
      warnings.push(`event ${event.i} references unknown lane "${event.lane}"`);
      continue;
    }
    if (!isValidIndex(event.i)) {
      warnings.push(`event index ${event.i} is not a non-negative integer`);
      continue;
    }
    if (indices.has(event.i)) {
      warnings.push(`duplicate global event index ${event.i}`);
      continue;
    }
    if (positioned && !isFiniteNumber(event.position)) {
      warnings.push(`event ${event.i} has no position, which the positioned layout needs`);
      continue;
    }
    if (positioned && event.extent !== undefined && !(isFiniteNumber(event.extent) && event.extent >= 0)) {
      warnings.push(`event ${event.i} has an extent that is not a non-negative number`);
      continue;
    }
    if (!palette[event.kind]) warnings.push(`event kind "${event.kind}" has no palette token`);
    indices.add(event.i);
    validEvents.push(event);
  }
  validEvents.sort((a, b) => a.i - b.i);

  const validSpans: EventLaneSpan[] = [];
  for (const span of spans) {
    const endpoints = positioned
      ? isFiniteNumber(span.from) && isFiniteNumber(span.to) &&
        (span.trail === undefined || (isFiniteNumber(span.trail) && span.trail >= span.to))
      : isValidIndex(span.from) && isValidIndex(span.to);
    if (!laneIds.has(span.lane) || !endpoints || span.from > span.to) {
      warnings.push(`invalid span ${span.lane}:${span.from}-${span.to}`);
      continue;
    }
    validSpans.push(span);
  }

  const validLinks: EventLaneLink[] = [];
  for (const link of links) {
    if (!indices.has(link.from) || !indices.has(link.to)) {
      warnings.push(`link ${link.from}-${link.to} names an event that is not drawn`);
      continue;
    }
    validLinks.push(link);
  }

  return { events: validEvents, spans: validSpans, links: validLinks, warnings };
}

function resolveToken(styles: CSSStyleDeclaration, token: EventToken | undefined, fallback: string) {
  if (!token) return fallback;
  return styles.getPropertyValue(token).trim() || fallback;
}

/** The tile a hatched mark repeats: a diagonal line in the fill on the
 *  background, six CSS pixels on a side. It is drawn in device pixels and the
 *  pattern scaled back, so it stays crisp at any ratio. */
const HATCH_TILE = 6;

export function hatchPattern(
  context: CanvasRenderingContext2D,
  fill: string,
  background: string,
  ratio: number,
): CanvasPattern | null {
  if (typeof document === "undefined" || typeof context.createPattern !== "function") return null;
  const tile = document.createElement("canvas");
  tile.width = tile.height = Math.ceil(HATCH_TILE * ratio);
  const brush = tile.getContext("2d");
  if (!brush) return null;
  brush.scale(ratio, ratio);
  brush.fillStyle = background;
  brush.fillRect(0, 0, HATCH_TILE, HATCH_TILE);
  brush.strokeStyle = fill;
  brush.lineWidth = 1.5;
  brush.beginPath();
  // One line corner to corner, and its two halves at the opposite corners, so
  // the tiles join without a break.
  brush.moveTo(0, HATCH_TILE);
  brush.lineTo(HATCH_TILE, 0);
  brush.moveTo(-HATCH_TILE / 2, HATCH_TILE / 2);
  brush.lineTo(HATCH_TILE / 2, -HATCH_TILE / 2);
  brush.moveTo(HATCH_TILE / 2, HATCH_TILE * 1.5);
  brush.lineTo(HATCH_TILE * 1.5, HATCH_TILE / 2);
  brush.stroke();
  const pattern = context.createPattern(tile, "repeat");
  if (pattern && ratio !== 1 && typeof pattern.setTransform === "function" && typeof DOMMatrix !== "undefined") {
    pattern.setTransform(new DOMMatrix().scale(1 / ratio));
  }
  return pattern;
}

/** Fill and outline the current path as the shape asks: solid, a token
 *  outline on the background for either hollow shape, or the hatch inside a
 *  one-pixel outline. */
function paintShape(
  context: CanvasRenderingContext2D,
  shape: EventShape,
  fill: string,
  background: string,
  hatch: CanvasPattern | null | undefined,
) {
  if (shape === "hollow" || shape === "hollow-circle") {
    context.fillStyle = background;
    context.fill();
    context.strokeStyle = fill;
    context.lineWidth = 2;
    context.stroke();
  } else if (shape === "hatched") {
    context.fillStyle = hatch ?? fill;
    context.fill();
    context.strokeStyle = fill;
    context.lineWidth = 1;
    context.stroke();
  } else {
    context.fillStyle = fill;
    context.fill();
  }
}

export function drawMark(
  context: CanvasRenderingContext2D,
  shape: EventShape,
  x: number,
  y: number,
  size: number,
  fill: string,
  background: string,
  hatch?: CanvasPattern | null,
) {
  const half = size / 2;
  context.beginPath();
  if (shape === "circle" || shape === "hollow-circle") context.arc(x, y, half, 0, Math.PI * 2);
  else context.roundRect(x - half, y - half, size, size, 2);
  paintShape(context, shape, fill, background, hatch);
}

/** A bar, drawn as the lane's mark would be: filled, a token outline on the
 *  background for either hollow shape, or hatched. */
export function drawBar(
  context: CanvasRenderingContext2D,
  shape: EventShape,
  rect: Rect,
  fill: string,
  background: string,
  hatch?: CanvasPattern | null,
) {
  context.beginPath();
  context.roundRect(rect.x, rect.y, rect.width, rect.height, 2);
  paintShape(context, shape, fill, background, hatch);
}

/** The broken-bar notch: a background stripe cuts the bar just inside its far
 *  end, and a foreground cap sits just past it. It marks a value the axis
 *  stopped short of, the convention for a truncated scale. */
export function drawNotch(
  context: CanvasRenderingContext2D,
  rect: Rect,
  direction: "up" | "down",
  background: string,
  foreground: string,
) {
  const far = direction === "up" ? rect.y : rect.y + rect.height;
  const cut = direction === "up" ? far + 2.5 : far - 4;
  const cap = direction === "up" ? far - 2.5 : far + 1;
  context.fillStyle = background;
  context.fillRect(rect.x, cut, rect.width, 1.5);
  context.fillStyle = foreground;
  context.fillRect(rect.x, cap, rect.width, 1.5);
}

function drawRectHalo(context: CanvasRenderingContext2D, rect: Rect, grow: number, color: string, width: number) {
  const out = grow / 2 + width;
  context.beginPath();
  context.roundRect(rect.x - out, rect.y - out, rect.width + out * 2, rect.height + out * 2, 3);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
}

function drawHalo(
  context: CanvasRenderingContext2D,
  shape: EventShape,
  x: number,
  y: number,
  size: number,
  color: string,
  width: number,
) {
  const half = size / 2 + width;
  context.beginPath();
  if (shape === "circle" || shape === "hollow-circle") context.arc(x, y, half, 0, Math.PI * 2);
  else context.roundRect(x - half, y - half, half * 2, half * 2, 3);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
}

/** A span in the positioned layout: a box behind its timeline's marks, with a
 *  trailing segment along its bottom edge and a label inside its top edge. */
function drawSpanBox(
  context: CanvasRenderingContext2D,
  box: { x0: number; x1: number; trailEnd: number; top: number; bottom: number },
  selected: boolean,
  label: string | undefined,
  colors: { fill: string; selectedFill: string; border: string; link: string; trail: string; text: string; muted: string; font: string },
) {
  const width = Math.max(2, box.x1 - box.x0);
  const height = Math.max(2, box.bottom - box.top - 2);
  context.beginPath();
  context.roundRect(box.x0, box.top + 1, width, height, 3);
  context.fillStyle = selected ? colors.selectedFill : colors.fill;
  context.fill();
  context.strokeStyle = selected ? colors.link : colors.border;
  context.lineWidth = selected ? 2 : 1;
  context.stroke();
  if (box.trailEnd > box.x1) {
    context.fillStyle = colors.trail;
    context.fillRect(box.x1, box.bottom - 4, box.trailEnd - box.x1, 3);
  }
  // A label needs room for a few characters, or it is noise.
  if (label && width > 24) {
    context.save();
    context.beginPath();
    context.rect(box.x0 + 1, box.top + 1, width - 2, height);
    context.clip();
    context.font = colors.font;
    context.textBaseline = "top";
    context.fillStyle = selected ? colors.text : colors.muted;
    context.fillText(label, Math.max(box.x0, 0) + 4, box.top + 3);
    context.restore();
  }
}

/** Where a link leaves and enters its rows: the edges that face each other, or
 *  the top edge when both marks share a row. */
function linkEnds(fromRow: number, toRow: number, rows: { tops: number[]; heights: number[] }) {
  if (fromRow === toRow) return { from: rows.tops[fromRow], to: rows.tops[toRow] };
  return fromRow < toRow
    ? { from: rows.tops[fromRow] + rows.heights[fromRow], to: rows.tops[toRow] }
    : { from: rows.tops[fromRow], to: rows.tops[toRow] + rows.heights[toRow] };
}

/** A link between two marks, leaving and entering each row vertically. */
function drawLink(
  context: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  style: "solid" | "dashed",
  emphasized: boolean,
  colors: { muted: string; link: string },
) {
  const middle = (from.y + to.y) / 2;
  context.beginPath();
  context.moveTo(from.x, from.y);
  context.bezierCurveTo(from.x, middle, to.x, middle, to.x, to.y);
  context.setLineDash(style === "dashed" ? [4, 3] : []);
  context.strokeStyle = emphasized ? colors.link : colors.muted;
  context.lineWidth = emphasized ? 2 : 1;
  context.stroke();
  context.setLineDash([]);
}

function optionText<K extends string>(
  event: EventLaneEvent<K>,
  lane: EventLane | undefined,
  spans: readonly EventLaneSpan[],
  within: readonly EventLaneSpan[] = EMPTY_SPANS,
) {
  const details = [
    lane?.label ?? event.lane,
    ...(lane?.description ? [lane.description] : []),
    event.label,
    event.kind,
    `global index ${event.i}`,
    event.at,
  ];
  if (event.error) details.push("error");
  if (event.tick) details.push("boundary");
  if (event.marker) details.push(event.marker);
  for (const span of spans) {
    if (span.from === event.i || span.to === event.i) {
      details.push(`span from ${span.from} to ${span.to}`);
    }
  }
  // Positioned spans have no keyboard path of their own, so a mark names the
  // labelled spans it falls inside.
  for (const span of within) details.push(`in ${span.label}`);
  return details.join(", ");
}

function EventLanesImpl<K extends string = string>({
  lanes,
  events,
  spans = EMPTY_SPANS,
  palette,
  selected = null,
  linked,
  hiddenKinds,
  emphasis,
  cellWidth: requestedCellWidth = DEFAULT_CELL_WIDTH,
  layout: axisLayout = "index",
  view,
  onViewChange,
  wheelZoom = true,
  wheelScroll = true,
  links = EMPTY_LINKS,
  selectedSpan = null,
  onSelectSpan,
  overviewContent = "marks",
  overview = "auto",
  overviewHeight: requestedOverviewHeight,
  overviewPlacement = "below",
  scrollbar = "native",
  ruler,
  rulerLabel = "Index",
  renderTooltip,
  onSelect,
  onHover,
  "aria-label": ariaLabel = "Event timeline",
  id,
  className,
}: EventLanesProps<K>) {
  const generatedId = useId().replace(/:/g, "");
  const optionIdBase = `${id ?? `event-lanes-${generatedId}`}-option`;
  const tooltipId = `${id ?? `event-lanes-${generatedId}`}-tooltip`;
  const rootRef = useRef<HTMLDivElement>(null);
  const axisCellRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overviewRef = useRef<HTMLCanvasElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  // The scroller's own padding, which a consumer may add for room before the
  // axis. The viewport is the content box inside it, where the canvas already
  // sticks, and the overview begins under it.
  const [axisInset, setAxisInset] = useState({ left: 0, right: 0 });
  const [scrollLeft, setScrollLeft] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(selected);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Keyboard-derived focus, not focus in general. The tooltip falls back to the
  // active event whenever the pointer is away so a keyboard walk is narrated —
  // but a *click* also focuses the scroller, so plain focus left the highlighted
  // item's tooltip pinned on screen for the rest of the page's life once anyone
  // clicked a mark (OPEN.md §7.19). Modality is tracked directly rather than
  // through :focus-visible so the behaviour is the same under jsdom.
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const pointerFocusRef = useRef(false);
  // Whether the focus the scroller holds came from a pointer. A press focuses
  // it by script, which Chrome then matches with :focus-visible, so the ring
  // stayed after every click. The stylesheet hides it while this is set; the
  // next key press clears it, and the ring returns.
  const [pointerFocus, setPointerFocus] = useState(false);
  // Any press on the strip switches the modality to pointer. It cannot be left
  // to onFocus: a press on an already-focused scroller fires no focus event, so
  // a keyboard walk followed by a click would keep narrating the active event
  // after the pointer left.
  const notePointerInteraction = useCallback(() => {
    pointerFocusRef.current = true;
    setKeyboardFocus(false);
    setPointerFocus(true);
  }, []);
  const [themeRevision, setThemeRevision] = useState(0);
  const lastHoverRef = useRef<number | null>(null);

  const cellWidth = Number.isFinite(requestedCellWidth) && requestedCellWidth > 0
    ? requestedCellWidth
    : DEFAULT_CELL_WIDTH;
  const positioned = axisLayout === "position";
  const validated = useMemo(
    () => validateData(lanes, events, spans, palette, positioned, links),
    [events, lanes, links, palette, positioned, spans],
  );
  const hiddenLanes = useMemo(
    () => new Set(lanes.filter((lane) => lane.hidden).map((lane) => lane.id)),
    [lanes],
  );
  // A lane with no group is a timeline of its own. The prefix keeps a lane id
  // from colliding with a group name a consumer happens to share with it.
  const timelineOf = useMemo(() => {
    const groups = new Map(lanes.map((lane) => [lane.id, lane.group ?? `lane:${lane.id}`]));
    return (laneId: string) => groups.get(laneId) ?? `lane:${laneId}`;
  }, [lanes]);
  const eventByIndex = useMemo(
    () => new Map(validated.events.map((event) => [event.i, event])),
    [validated.events],
  );
  const laneIndex = useMemo(
    () => new Map(lanes.map((lane, index) => [lane.id, index])),
    [lanes],
  );
  const laneById = useMemo(
    () => new Map(lanes.map((lane) => [lane.id, lane])),
    [lanes],
  );
  const visibleEvents = useMemo(
    () => validated.events.filter((event) => !hiddenKinds?.has(event.kind) && !hiddenLanes.has(event.lane)),
    [hiddenKinds, hiddenLanes, validated.events],
  );
  const visibleByIndex = useMemo(
    () => new Map(visibleEvents.map((event) => [event.i, event])),
    [visibleEvents],
  );
  const visibleByCell = useMemo(
    () => new Map(visibleEvents.map((event) => [`${event.lane}:${event.i}`, event])),
    [visibleEvents],
  );
  const end = useMemo(() => {
    let extent = -1;
    for (const event of validated.events) extent = Math.max(extent, event.i);
    for (const span of validated.spans) extent = Math.max(extent, span.to);
    return extent;
  }, [validated.events, validated.spans]);
  const axisPadding = axisPaddingFor(cellWidth);
  const markSize = markSizeFor(cellWidth);

  // The positioned layout's model. Widths read every valid mark, hidden or not,
  // so filtering a kind or hiding a lane never moves the marks that remain.
  const positionModel = useMemo(() => {
    if (!positioned) return null;
    let origin = Infinity;
    let finish = -Infinity;
    const timelines = new Map<string, TimelineMark[]>();
    for (const event of validated.events) {
      const position = event.position as number;
      origin = Math.min(origin, position);
      finish = Math.max(finish, position + (event.extent ?? 0));
      // A lane sized by its own gaps is its own run for widths, and nothing else.
      const timeline = laneById.get(event.lane)?.widthBy === "lane" ? `width:${event.lane}` : timelineOf(event.lane);
      const marks = timelines.get(timeline);
      if (marks) marks.push({ i: event.i, position });
      else timelines.set(timeline, [{ i: event.i, position }]);
    }
    for (const span of validated.spans) {
      origin = Math.min(origin, span.from);
      finish = Math.max(finish, span.trail ?? span.to);
    }
    if (!Number.isFinite(origin)) return { origin: 0, finish: 0, empty: true, next: new Map<number, number>(), previous: new Map<number, number>(), smallestGap: undefined };
    return { origin, finish, empty: false, ...nextPositions(timelines.values()) };
  }, [laneById, positioned, timelineOf, validated.events, validated.spans]);

  // What the positioned layout draws and walks: each lane's visible marks in
  // position order, and each timeline's, for the arrow keys.
  const positionIndex = useMemo(() => {
    if (!positioned) return null;
    const byLane = new Map<string, { events: EventLaneEvent<K>[]; positions: Float64Array; reach: number }>();
    const byTimeline = new Map<string, EventLaneEvent<K>[]>();
    const inOrder = [...visibleEvents].sort(
      (a, b) => (a.position as number) - (b.position as number) || a.i - b.i,
    );
    const laneEvents = new Map<string, EventLaneEvent<K>[]>();
    for (const event of inOrder) {
      const list = laneEvents.get(event.lane);
      if (list) list.push(event);
      else laneEvents.set(event.lane, [event]);
      const timeline = timelineOf(event.lane);
      const walk = byTimeline.get(timeline);
      if (walk) walk.push(event);
      else byTimeline.set(timeline, [event]);
    }
    for (const [lane, list] of laneEvents) {
      let reach = 0;
      for (const event of list) reach = Math.max(reach, event.extent ?? 0);
      byLane.set(lane, { events: list, positions: Float64Array.from(list, (event) => event.position as number), reach });
    }
    const stepOf = new Map<number, number>();
    for (const walk of byTimeline.values()) walk.forEach((event, step) => stepOf.set(event.i, step));
    // Timelines in the order their first visible lane appears.
    const timelineOrder: string[] = [];
    for (const lane of lanes) {
      const timeline = timelineOf(lane.id);
      if (!lane.hidden && byTimeline.has(timeline) && !timelineOrder.includes(timeline)) timelineOrder.push(timeline);
    }
    return { byLane, byTimeline, stepOf, timelineOrder };
  }, [lanes, positioned, timelineOf, visibleEvents]);

  const [requestedScale, setRequestedScale] = useState<number | null>(null);
  const extentUnits = positionModel ? positionModel.finish - positionModel.origin : 0;
  // A positioned mark begins at its position and the last one in a timeline
  // draws a mark size to the right of it, so the axis keeps that much more
  // room after the last position than before the first. A mark anchored at
  // its end draws to the left instead, so when there is one the axis keeps
  // a mark size before the first position too.
  const trailingPadding = axisPadding + markSize;
  const leadingPadding = axisPadding + (positioned && validated.events.some((event) => event.anchor === "end") ? markSize : 0);
  const limits = positionModel
    ? scaleLimits(extentUnits, viewportWidth, leadingPadding + trailingPadding, positionModel.smallestGap, markSize)
    : null;
  // Until a page or a zoom asks for a scale, the whole extent fits.
  const scale = limits ? clampScale(requestedScale ?? limits.min, limits) : 1;
  const origin = positionModel?.origin ?? 0;
  const xOf = useCallback(
    (position: number) => xForPosition(position, origin, scale, leadingPadding),
    [leadingPadding, origin, scale],
  );
  // A mark reaches to the next mark in its run, or, anchored at its end,
  // back to the previous one: the gap on the side it draws into.
  const widthOf = useCallback(
    (event: EventLaneEvent<K>) => {
      const position = event.position as number;
      if (event.anchor === "end") {
        const previous = positionModel?.previous.get(event.i);
        return markWidth(previous ?? position, previous === undefined ? undefined : position, event.extent, scale, markSize);
      }
      return markWidth(position, positionModel?.next.get(event.i), event.extent, scale, markSize);
    },
    [markSize, positionModel, scale],
  );
  // Where a mark's left edge is in the scrolling content: at its position, or
  // a width before it for a mark anchored at its end.
  const leftOf = useCallback(
    (event: EventLaneEvent<K>) => xOf(event.position as number) - (event.anchor === "end" ? widthOf(event) : 0),
    [widthOf, xOf],
  );
  const axisWidth = positioned
    ? (positionModel && !positionModel.empty ? extentUnits * scale + leadingPadding + trailingPadding : 0)
    : end < 0 ? 0 : (end + 1) * cellWidth + axisPadding * 2;
  const layout = useMemo(() => laneLayout(lanes), [lanes]);
  // Each timeline's vertical extent over its visible lanes: where its boxes go.
  const timelineRows = useMemo(() => {
    const rows = new Map<string, { top: number; bottom: number }>();
    lanes.forEach((lane, row) => {
      if (lane.hidden) return;
      const top = layout.tops[row];
      const bottom = top + layout.heights[row];
      const timeline = timelineOf(lane.id);
      const current = rows.get(timeline);
      rows.set(timeline, current ? { top: Math.min(current.top, top), bottom: Math.max(current.bottom, bottom) } : { top, bottom });
    });
    return rows;
  }, [lanes, layout, timelineOf]);
  const canvasHeight = layout.total;
  const overviewHeight = validHeight(requestedOverviewHeight, MIN_OVERVIEW_HEIGHT, OVERVIEW_HEIGHT);
  const hasRuler = ruler != null;
  // The bands: one per run of neighbouring visible lanes that share a shade
  // with no gap between them, measured from the top of the rows.
  const bands = useMemo(() => {
    const runs: { top: number; bottom: number; token: EventToken }[] = [];
    lanes.forEach((lane, row) => {
      if (lane.hidden || !lane.shade) return;
      const top = layout.tops[row];
      const bottom = top + layout.heights[row];
      const last = runs[runs.length - 1];
      if (last && last.token === lane.shade && last.bottom === top) last.bottom = bottom;
      else runs.push({ top, bottom, token: lane.shade });
    });
    return runs;
  }, [lanes, layout]);
  const showOverview = overview === true || (overview === "auto" && axisWidth > viewportWidth + 1);

  const activeEvent = activeIndex == null ? undefined : visibleByIndex.get(activeIndex);
  const tooltipEvent = hoveredIndex == null
    ? (keyboardFocus ? activeEvent : undefined)
    : visibleByIndex.get(hoveredIndex);

  useEffect(() => {
    if (import.meta.env.DEV) {
      for (const warning of validated.warnings) console.warn(`[EventLanes] ${warning}`);
    }
  }, [validated.warnings]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => {
      const style = getComputedStyle(scroller);
      const left = parseFloat(style.paddingLeft) || 0;
      const right = parseFloat(style.paddingRight) || 0;
      setAxisInset((current) => current.left === left && current.right === right ? current : { left, right });
      setViewportWidth(Math.max(0, scroller.clientWidth - left - right));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setThemeRevision((revision) => revision + 1));
    observer.observe(root, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => observer.disconnect();
  }, []);

  const revealIndex = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const placed = positioned ? eventByIndex.get(index) : undefined;
    if (positioned && !placed) return;
    const start = placed
      ? leftOf(placed)
      : index === 0 ? 0 : axisPadding + index * cellWidth;
    const finish = placed
      ? leftOf(placed) + widthOf(placed)
      : index === end ? axisWidth : axisPadding + (index + 1) * cellWidth;
    let next = scroller.scrollLeft;
    if (start < next) next = start;
    else if (finish > next + scroller.clientWidth) next = finish - scroller.clientWidth;
    const maximum = Math.max(0, axisWidth - scroller.clientWidth);
    next = Math.max(0, Math.min(maximum, next));
    if (next !== scroller.scrollLeft) scroller.scrollLeft = next;
    setScrollLeft(next);
  }, [axisPadding, axisWidth, cellWidth, end, eventByIndex, leftOf, positioned, viewportWidth, widthOf]);

  // A zoom changes the axis width, and the scroll offset that holds the
  // anchored position still can only be applied once the new width is laid
  // out. The wheel and the view prop leave it here for the layout effect.
  const pendingScrollRef = useRef<number | null>(null);
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const pending = pendingScrollRef.current;
    if (!scroller || pending == null) return;
    pendingScrollRef.current = null;
    const next = Math.max(0, Math.min(Math.max(0, axisWidth - scroller.clientWidth), pending));
    scroller.scrollLeft = next;
    setScrollLeft(next);
  }, [axisWidth, scale]);

  // The latest scale for the wheel handler, which is registered once and can
  // fire several times between renders.
  const liveScaleRef = useRef(scale);
  liveScaleRef.current = scale;
  const zoomStateRef = useRef({ limits, origin, axisPadding: leadingPadding, inset: axisInset.left });
  zoomStateRef.current = { limits, origin, axisPadding: leadingPadding, inset: axisInset.left };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !positioned) return;
    const handleWheel = (wheel: WheelEvent) => {
      const { limits: bounds, origin: start, axisPadding: padding, inset } = zoomStateRef.current;
      if (!bounds) return;
      const unit = wheel.deltaMode === 1 ? 16 : wheel.deltaMode === 2 ? scroller.clientWidth : 1;
      if (wheel.ctrlKey || wheel.metaKey) {
        // A trackpad pinch arrives as a wheel with ctrlKey set.
        if (!wheelZoom) return;
        wheel.preventDefault();
        const current = liveScaleRef.current;
        const next = clampScale(current * Math.exp(-wheel.deltaY * unit * ZOOM_RATE), bounds);
        if (next === current) return;
        // The anchor is measured from the content edge: inside the border and the padding.
        const anchor = wheel.clientX - scroller.getBoundingClientRect().left - scroller.clientLeft - inset;
        const from = pendingScrollRef.current ?? scroller.scrollLeft;
        pendingScrollRef.current = zoomAbout(current, next, anchor, from, start, padding);
        liveScaleRef.current = next;
        setRequestedScale(next);
        return;
      }
      if (!wheelScroll || wheel.shiftKey || Math.abs(wheel.deltaY) <= Math.abs(wheel.deltaX)) return;
      // The vertical wheel scrolls the axis. Where the axis cannot move any
      // further the wheel is let through, so the page can still scroll past
      // the timeline. Whether it moved is read back rather than predicted:
      // scrollWidth less clientWidth can overstate how far it scrolls.
      const before = scroller.scrollLeft;
      scroller.scrollLeft = before + wheel.deltaY * unit;
      if (scroller.scrollLeft !== before) wheel.preventDefault();
    };
    scroller.addEventListener("wheel", handleWheel, { passive: false });
    return () => scroller.removeEventListener("wheel", handleWheel);
  }, [positioned, wheelScroll, wheelZoom]);

  // A requested view is applied each time the page passes a new one, once the
  // viewport has a width to fit it to. The range lands between the boundary
  // paddings, so a view of the whole extent is the fit the component opens
  // with, and the last mark stays inside the viewport. A page that writes every
  // reported view back into the prop hands over the view already shown, which
  // is left alone.
  const reportedViewRef = useRef<string | null>(null);
  const requestedViewRef = useRef<EventLanesView | null>(null);
  useLayoutEffect(() => {
    if (view) requestedViewRef.current = view;
  }, [view]);
  useLayoutEffect(() => {
    const wanted = requestedViewRef.current;
    if (!positioned || !wanted || !limits || viewportWidth <= 0) return;
    requestedViewRef.current = null;
    if (viewKey(wanted) === reportedViewRef.current) return;
    const span = wanted.end - wanted.start;
    if (!(span > 0) || !Number.isFinite(span)) return;
    const next = clampScale(Math.max(1, viewportWidth - leadingPadding - trailingPadding) / span, limits);
    const target = xForPosition(wanted.start, origin, next, leadingPadding) - leadingPadding;
    liveScaleRef.current = next;
    if (next !== scale) {
      pendingScrollRef.current = target;
      setRequestedScale(next);
      return;
    }
    // An unchanged scale lays out nothing new, so the scroll is applied here.
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const clamped = Math.max(0, Math.min(Math.max(0, axisWidth - scroller.clientWidth), target));
    scroller.scrollLeft = clamped;
    setScrollLeft(clamped);
  }, [axisWidth, leadingPadding, limits, origin, positioned, scale, trailingPadding, view, viewportWidth]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!positioned || !onViewChange || !scroller || viewportWidth <= 0 || pendingScrollRef.current != null) return;
    // Read from the scroller: during a zoom the state can trail the scroll the
    // layout effect has just applied. The range reported is the one between
    // the boundary paddings, as `view` asks for it, so a report handed back
    // as a request asks for what is already shown.
    const left = scroller.scrollLeft;
    const state = {
      start: positionForX(left + leadingPadding, origin, scale, leadingPadding),
      end: positionForX(left + viewportWidth - trailingPadding, origin, scale, leadingPadding),
      scale,
    };
    const key = viewKey(state);
    if (key === reportedViewRef.current) return;
    reportedViewRef.current = key;
    onViewChange(state);
  }, [leadingPadding, onViewChange, origin, positioned, scale, scrollLeft, trailingPadding, viewportWidth]);

  useEffect(() => {
    if (selected != null && visibleByIndex.has(selected)) {
      setActiveIndex(selected);
      revealIndex(selected);
    }
  }, [revealIndex, selected, visibleByIndex]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (current != null && visibleByIndex.has(current)) return current;
      if (visibleEvents.length === 0) return null;
      if (current == null) {
        return selected != null && visibleByIndex.has(selected) ? selected : visibleEvents[0].i;
      }
      return visibleEvents.find((event) => event.i > current)?.i
        ?? [...visibleEvents].reverse().find((event) => event.i < current)?.i
        ?? visibleEvents[0].i;
    });
  }, [selected, visibleByIndex, visibleEvents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    const width = Math.max(1, viewportWidth);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(canvasHeight * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${canvasHeight}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, canvasHeight);

    const styles = getComputedStyle(root);
    const background = styles.getPropertyValue("--bg").trim() || "transparent";
    const foreground = styles.getPropertyValue("--fg").trim() || "currentColor";
    const muted = styles.getPropertyValue("--muted").trim() || foreground;
    const link = styles.getPropertyValue("--color-link").trim() || foreground;
    const linkColor = link;
    const error = styles.getPropertyValue("--color-error").trim() || foreground;
    const accent = styles.getPropertyValue("--color-accent").trim() || foreground;
    // One hatch per fill colour per paint, made the first time a hatched mark asks.
    const hatches = new Map<string, CanvasPattern | null>();
    const hatchFor = (fill: string) => {
      let pattern = hatches.get(fill);
      if (pattern === undefined) {
        pattern = hatchPattern(context, fill, background, ratio);
        hatches.set(fill, pattern);
      }
      return pattern;
    };
    const markerColor = (event: EventLaneEvent<K>) => event.markerToken ? resolveToken(styles, event.markerToken, accent) : accent;

    if (positioned && positionIndex) {
      const from = positionForX(scrollLeft, origin, scale, leadingPadding);
      const to = positionForX(scrollLeft + width, origin, scale, leadingPadding);
      canvas.dataset.windowStart = String(from);
      canvas.dataset.windowEnd = String(to);
      const colors = {
        fill: styles.getPropertyValue("--color-bg-subtle").trim() || background,
        selectedFill: styles.getPropertyValue("--color-accent-bg").trim() || background,
        border: styles.getPropertyValue("--border").trim() || muted,
        link,
        trail: styles.getPropertyValue("--color-warning").trim() || accent,
        text: foreground,
        muted,
        font: `${SPAN_LABEL_SIZE}px ${styles.getPropertyValue("--font-family-sans").trim() || "sans-serif"}`,
      };

      for (const span of validated.spans) {
        const x0 = xOf(span.from) - scrollLeft;
        const x1 = xOf(span.to) - scrollLeft;
        const trailEnd = span.trail === undefined ? x1 : xOf(span.trail) - scrollLeft;
        if (Math.max(x1, trailEnd) < 0 || x0 > width) continue;
        const rows = timelineRows.get(timelineOf(span.lane));
        if (!rows) continue;
        const trailColor = span.trailToken ? resolveToken(styles, span.trailToken, colors.trail) : colors.trail;
        drawSpanBox(
          context,
          { x0, x1, trailEnd, top: rows.top, bottom: rows.bottom },
          selectedSpan != null && span.id === selectedSpan,
          span.label,
          { ...colors, trail: trailColor },
        );
      }

      const centreOf = (event: EventLaneEvent<K>) => leftOf(event) + widthOf(event) / 2 - scrollLeft;
      for (const connection of validated.links) {
        const start = visibleByIndex.get(connection.from);
        const finish = visibleByIndex.get(connection.to);
        const fromRow = start ? laneIndex.get(start.lane) : undefined;
        const toRow = finish ? laneIndex.get(finish.lane) : undefined;
        if (!start || !finish || fromRow == null || toRow == null) continue;
        const fromX = centreOf(start);
        const toX = centreOf(finish);
        if (Math.max(fromX, toX) < 0 || Math.min(fromX, toX) > width) continue;
        const ends = linkEnds(fromRow, toRow, layout);
        drawLink(context, { x: fromX, y: ends.from }, { x: toX, y: ends.to }, connection.style ?? "solid", connection.emphasized ?? false, { muted, link });
      }

      lanes.forEach((lane, row) => {
        const entry = positionIndex.byLane.get(lane.id);
        if (lane.hidden || !entry) return;
        const top = layout.tops[row];
        const laneHeight = layout.heights[row];
        // A mark anchored at its end reaches a mark size left of its position, so the window reaches that far right.
        const [first, last] = visibleSlice(entry.positions, from - markSize / scale, to + markSize / scale, entry.reach);
        for (let index = first; index < last; index += 1) {
          const event = entry.events[index];
          const markWidthPx = widthOf(event);
          const left = leftOf(event) - scrollLeft;
          const centre = left + markWidthPx / 2;
          const rect = lane.bars
            ? barRect(top, laneHeight, lane.bars, centre, markWidthPx, lane.barFloor ?? markSize, event.magnitude)
            : { x: left, y: top + laneHeight / 2 - markSize / 2, width: markWidthPx, height: markSize };
          const isSelected = selected === event.i;
          const isLinked = linked?.has(event.i) ?? false;
          const isEmphasized = emphasis === undefined || emphasis.has(event.i) || isSelected || isLinked;
          context.globalAlpha = isEmphasized ? 1 : 0.3;
          const fill = resolveToken(styles, palette[event.kind], muted);
          if (event.halo) drawRectHalo(context, rect, 3, resolveToken(styles, event.halo, muted), 2);
          if (isLinked) {
            drawRectHalo(context, rect, 5, link, 3);
            drawRectHalo(context, rect, 2, background, 2);
          }
          if (isSelected) {
            drawRectHalo(context, rect, 7, foreground, 3);
            drawRectHalo(context, rect, 3, background, 2);
          }
          // A circle with room for its full size draws round, as the legend
          // shows it; narrower, it is a column like any other mark.
          const round = !lane.bars && (event.shape === "circle" || event.shape === "hollow-circle") && markWidthPx >= markSize;
          if (round) drawMark(context, event.shape, centre, rect.y + rect.height / 2, markSize, fill, background);
          else drawBar(context, event.shape, rect, fill, background, event.shape === "hatched" ? hatchFor(fill) : undefined);
          if (event.clipped && lane.bars) drawNotch(context, rect, lane.bars, background, foreground);
          const centreY = rect.y + rect.height / 2;
          if (isSelected && isLinked) {
            context.beginPath();
            context.arc(centre, centreY, Math.max(1.5, markSize / 5), 0, Math.PI * 2);
            context.fillStyle = link;
            context.fill();
          }
          if (event.error) {
            // Sized to the column it marks, so a hairline is not lost under a
            // cross the mark size wide, with a floor that keeps it a cross.
            const offset = Math.max(3, Math.min(markSize / 2 + 2, markWidthPx / 2 + 2));
            context.beginPath();
            context.moveTo(centre - offset, centreY - offset);
            context.lineTo(centre + offset, centreY + offset);
            context.moveTo(centre + offset, centreY - offset);
            context.lineTo(centre - offset, centreY + offset);
            context.strokeStyle = error;
            context.lineWidth = 2;
            context.stroke();
          }
          if (event.tick) {
            const tickX = left + markWidthPx;
            context.beginPath();
            context.moveTo(tickX, top + laneHeight / 6);
            context.lineTo(tickX, top + (laneHeight * 5) / 6);
            context.strokeStyle = foreground;
            context.lineWidth = 2;
            context.stroke();
          }
          if (event.marker) {
            const markerY = lane.bars === "down"
              ? Math.min(top + laneHeight - 2, rect.y + rect.height + 4)
              : Math.max(top + 2, rect.y - 4);
            context.beginPath();
            context.arc(centre, markerY, 2, 0, Math.PI * 2);
            context.fillStyle = markerColor(event);
            context.fill();
          }
        }
      });
      context.globalAlpha = 1;
      return;
    }

    const visibleStart = Math.max(0, Math.floor((scrollLeft - axisPadding) / cellWidth) - OVERSCAN_CELLS);
    const visibleEnd = Math.min(end, Math.ceil((scrollLeft + width - axisPadding) / cellWidth) + OVERSCAN_CELLS);
    canvas.dataset.windowStart = String(visibleStart);
    canvas.dataset.windowEnd = String(visibleEnd);

    context.lineCap = "round";
    for (const span of validated.spans) {
      if (span.to < visibleStart || span.from > visibleEnd) continue;
      const row = laneIndex.get(span.lane);
      if (row == null) continue;
      const y = layout.tops[row] + layout.heights[row] / 2;
      const fromX = axisPadding + (span.from + 0.5) * cellWidth - scrollLeft;
      const toX = axisPadding + (span.to + 0.5) * cellWidth - scrollLeft;
      context.beginPath();
      context.moveTo(fromX, y);
      context.lineTo(toX, y);
      context.strokeStyle = background;
      context.lineWidth = 5;
      context.stroke();
      context.strokeStyle = foreground;
      context.lineWidth = 2;
      context.stroke();
    }

    for (const link of validated.links) {
      const from = visibleByIndex.get(link.from);
      const to = visibleByIndex.get(link.to);
      const fromRow = from ? laneIndex.get(from.lane) : undefined;
      const toRow = to ? laneIndex.get(to.lane) : undefined;
      if (!from || !to || fromRow == null || toRow == null) continue;
      const fromX = axisPadding + (from.i + 0.5) * cellWidth - scrollLeft;
      const toX = axisPadding + (to.i + 0.5) * cellWidth - scrollLeft;
      if (Math.max(fromX, toX) < 0 || Math.min(fromX, toX) > width) continue;
      const ends = linkEnds(fromRow, toRow, layout);
      drawLink(context, { x: fromX, y: ends.from }, { x: toX, y: ends.to }, link.style ?? "solid", link.emphasized ?? false, { muted, link: linkColor });
    }

    for (let index = visibleStart; index <= visibleEnd; index += 1) {
      const event = visibleByIndex.get(index);
      if (!event) continue;
      const row = laneIndex.get(event.lane);
      if (row == null) continue;
      const rawX = axisPadding + (event.i + 0.5) * cellWidth - scrollLeft;
      const laneHeight = layout.heights[row];
      const y = layout.tops[row] + laneHeight / 2;
      const size = markSizeFor(cellWidth);
      const boundaryRadius = (size + 7) / 2 + 3;
      const x = event.i === 0
        ? Math.max(Math.min(boundaryRadius + 1, width / 2), rawX)
        : event.i === end
          ? Math.min(Math.max(width - boundaryRadius - 1, width / 2), rawX)
          : rawX;
      const isSelected = selected === event.i;
      const isLinked = linked?.has(event.i) ?? false;
      const isEmphasized = emphasis === undefined || emphasis.has(event.i) || isSelected || isLinked;
      context.globalAlpha = isEmphasized ? 1 : 0.3;
      const fill = resolveToken(styles, palette[event.kind], muted);
      const lane = lanes[row];

      if (lane.bars) {
        // A bar lane draws the same states over a rectangle the magnitude sizes,
        // anchored to one edge of the row.
        const rect = barRect(layout.tops[row], laneHeight, lane.bars, x, size, lane.barFloor ?? size, event.magnitude);
        if (event.halo) drawRectHalo(context, rect, 3, resolveToken(styles, event.halo, muted), 2);
        if (isLinked) {
          drawRectHalo(context, rect, 5, link, 3);
          drawRectHalo(context, rect, 2, background, 2);
        }
        if (isSelected) {
          drawRectHalo(context, rect, 7, foreground, 3);
          drawRectHalo(context, rect, 3, background, 2);
        }
        drawBar(context, event.shape, rect, fill, background, event.shape === "hatched" ? hatchFor(fill) : undefined);
        if (event.clipped) drawNotch(context, rect, lane.bars, background, foreground);
        const centerY = rect.y + rect.height / 2;
        if (isSelected && isLinked) {
          context.beginPath();
          context.arc(x, centerY, Math.max(1.5, size / 5), 0, Math.PI * 2);
          context.fillStyle = link;
          context.fill();
        }
        if (event.error) {
          const offset = size / 2 + 2;
          context.beginPath();
          context.moveTo(x - offset, centerY - offset);
          context.lineTo(x + offset, centerY + offset);
          context.moveTo(x + offset, centerY - offset);
          context.lineTo(x - offset, centerY + offset);
          context.strokeStyle = error;
          context.lineWidth = 2;
          context.stroke();
        }
        if (event.tick) {
          const tickX = axisPadding + (event.i + 1) * cellWidth - scrollLeft - 1;
          context.beginPath();
          context.moveTo(tickX, y - laneHeight / 3);
          context.lineTo(tickX, y + laneHeight / 3);
          context.strokeStyle = foreground;
          context.lineWidth = 2;
          context.stroke();
        }
        if (event.marker) {
          const markerY = lane.bars === "up"
            ? Math.max(layout.tops[row] + 2, rect.y - 4)
            : Math.min(layout.tops[row] + laneHeight - 2, rect.y + rect.height + 4);
          context.beginPath();
          context.arc(x, markerY, 2, 0, Math.PI * 2);
          context.fillStyle = markerColor(event);
          context.fill();
        }
        continue;
      }

      if (event.halo) {
        drawHalo(
          context,
          event.shape,
          x,
          y,
          size + 3,
          resolveToken(styles, event.halo, muted),
          2,
        );
      }
      if (isLinked) {
        drawHalo(context, event.shape, x, y, size + 5, link, 3);
        drawHalo(context, event.shape, x, y, size + 2, background, 2);
      }
      if (isSelected) {
        drawHalo(context, event.shape, x, y, size + 7, foreground, 3);
        drawHalo(context, event.shape, x, y, size + 3, background, 2);
      }

      drawMark(context, event.shape, x, y, size, fill, background, event.shape === "hatched" ? hatchFor(fill) : undefined);

      if (isSelected && isLinked) {
        context.beginPath();
        context.arc(x, y, Math.max(1.5, size / 5), 0, Math.PI * 2);
        context.fillStyle = link;
        context.fill();
      }
      if (event.error) {
        const offset = size / 2 + 2;
        context.beginPath();
        context.moveTo(x - offset, y - offset);
        context.lineTo(x + offset, y + offset);
        context.moveTo(x + offset, y - offset);
        context.lineTo(x - offset, y + offset);
        context.strokeStyle = error;
        context.lineWidth = 2;
        context.stroke();
      }
      if (event.tick) {
        const tickX = axisPadding + (event.i + 1) * cellWidth - scrollLeft - 1;
        context.beginPath();
        context.moveTo(tickX, y - laneHeight / 3);
        context.lineTo(tickX, y + laneHeight / 3);
        context.strokeStyle = foreground;
        context.lineWidth = 2;
        context.stroke();
      }
      if (event.marker) {
        context.beginPath();
        context.arc(x, y - size / 2 - 4, 2, 0, Math.PI * 2);
        context.fillStyle = markerColor(event);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }, [
    axisWidth,
    axisPadding,
    leadingPadding,
    canvasHeight,
    cellWidth,
    emphasis,
    end,
    laneIndex,
    lanes,
    layout,
    linked,
    palette,
    scrollLeft,
    selected,
    themeRevision,
    validated.spans,
    viewportWidth,
    visibleByIndex,
    markSize,
    origin,
    positionIndex,
    positioned,
    scale,
    selectedSpan,
    timelineOf,
    timelineRows,
    validated.links,
    leftOf,
    widthOf,
    xOf,
  ]);

  useEffect(() => {
    const canvas = overviewRef.current;
    const root = rootRef.current;
    if (!canvas || !root || !showOverview) return;
    const width = Math.max(1, viewportWidth);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(overviewHeight * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${overviewHeight}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, overviewHeight);
    const styles = getComputedStyle(root);
    const foreground = styles.getPropertyValue("--fg").trim() || "currentColor";
    const muted = styles.getPropertyValue("--muted").trim() || foreground;
    const link = styles.getPropertyValue("--color-link").trim() || foreground;
    // Only the lanes the overview draws divide its height between them.
    const overviewRows = new Map<string, number>();
    for (const lane of lanes) if (lane.overview !== false && !lane.hidden) overviewRows.set(lane.id, overviewRows.size);
    const overview = overviewLaneGeometry(overviewRows.size, overviewHeight);
    const scale = width / Math.max(axisWidth, 1);

    if (overviewContent !== "marks") {
      // A span sits in its own lane's band, or in the first band its timeline
      // keeps when that lane is left out of the overview.
      const bandOf = (laneId: string) => {
        const own = overviewRows.get(laneId);
        if (own != null) return own;
        const timeline = timelineOf(laneId);
        for (const lane of lanes) {
          const row = overviewRows.get(lane.id);
          if (row != null && timelineOf(lane.id) === timeline) return row;
        }
        return undefined;
      };
      const structural = styles.getPropertyValue("--color-structural").trim() || muted;
      const warning = styles.getPropertyValue("--color-warning").trim() || foreground;
      for (const span of validated.spans) {
        const row = bandOf(span.lane);
        if (row == null) continue;
        const from = positioned ? xOf(span.from) : axisPadding + (span.from + 0.5) * cellWidth;
        const to = positioned ? xOf(span.to) : axisPadding + (span.to + 0.5) * cellWidth;
        const isSelected = selectedSpan != null && span.id === selectedSpan;
        context.fillStyle = isSelected ? link : structural;
        context.fillRect(from * scale, overview.markTop(row), Math.max(1, (to - from) * scale), overview.markHeight);
        if (positioned && span.trail !== undefined && span.trail > span.to) {
          context.fillStyle = span.trailToken ? resolveToken(styles, span.trailToken, warning) : warning;
          context.fillRect(to * scale, overview.markTop(row), Math.max(1, (xOf(span.trail) - to) * scale), overview.markHeight);
        }
      }
    }

    if (overviewContent !== "spans") {
      for (const event of visibleEvents) {
        const row = overviewRows.get(event.lane);
        if (row == null) continue;
        const isSelected = selected === event.i;
        const isLinked = linked?.has(event.i) ?? false;
        context.globalAlpha = emphasis === undefined || emphasis.has(event.i) || isSelected || isLinked ? 1 : 0.3;
        context.fillStyle = resolveToken(styles, palette[event.kind], muted);
        context.fillRect(
          positioned ? leftOf(event) * scale : (axisPadding + event.i * cellWidth) * scale,
          overview.markTop(row),
          Math.max(1, (positioned ? widthOf(event) : cellWidth) * scale),
          overview.markHeight,
        );
      }
    }
    context.globalAlpha = 1;
    const windowX = scrollLeft * scale;
    const windowWidth = Math.min(width, viewportWidth * scale);
    // Stroked inside the reserved chrome: a 2px line centred on y = CHROME/2
    // and y = HEIGHT - CHROME/2 covers exactly [0, CHROME] and
    // [HEIGHT - CHROME, HEIGHT], never the lane bands between them. The old
    // background halo is gone with the overlap it existed to survive.
    context.strokeStyle = link;
    context.lineWidth = OVERVIEW_CHROME;
    context.strokeRect(
      windowX,
      OVERVIEW_CHROME / 2,
      Math.max(2, windowWidth),
      overviewHeight - OVERVIEW_CHROME,
    );
  }, [
    axisWidth,
    axisPadding,
    cellWidth,
    emphasis,
    laneIndex,
    lanes.length,
    linked,
    overviewHeight,
    palette,
    scrollLeft,
    selected,
    showOverview,
    themeRevision,
    viewportWidth,
    visibleEvents,
    overviewContent,
    positioned,
    selectedSpan,
    timelineOf,
    validated.spans,
    leftOf,
    widthOf,
    xOf,
  ]);

  const updateHover = useCallback((event: EventLaneEvent<K> | null) => {
    const next = event?.i ?? null;
    setHoveredIndex(next);
    if (lastHoverRef.current !== next) {
      lastHoverRef.current = next;
      onHover?.(event);
    }
  }, [onHover]);

  const hitTest = useCallback((pointer: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const scroller = scrollerRef.current;
    if (!canvas || !scroller) return null;
    const bounds = canvas.getBoundingClientRect();
    const x = pointer.clientX - bounds.left + scroller.scrollLeft - axisPadding;
    const y = pointer.clientY - bounds.top;
    // The row whose own height holds y: a gap between lanes hits nothing.
    let row = -1;
    for (let index = 0; index < layout.tops.length; index += 1) {
      if (!lanes[index]?.hidden && y >= layout.tops[index] && y < layout.tops[index] + layout.heights[index]) row = index;
    }
    const lane = lanes[row];
    if (positioned) {
      const entry = lane ? positionIndex?.byLane.get(lane.id) : undefined;
      if (!entry) return null;
      // A hairline is hard to hit, so a mark narrower than the slack answers
      // from a little either side of it.
      const pointerX = x + axisPadding;
      const slack = HIT_SLACK / scale;
      const at = positionForX(pointerX, origin, scale, leadingPadding);
      let best: EventLaneEvent<K> | null = null;
      let bestDistance = Infinity;
      const first = lowerBound(entry.positions, at - entry.reach - markSize / scale - slack);
      const last = upperBound(entry.positions, at + markSize / scale + slack);
      for (let index = first; index < last; index += 1) {
        const event = entry.events[index];
        const left = leftOf(event);
        const markWidthPx = widthOf(event);
        const tolerance = markWidthPx < HIT_SLACK * 2 ? HIT_SLACK : 0;
        if (pointerX < left - tolerance || pointerX > left + markWidthPx + tolerance) continue;
        const distance = Math.abs(pointerX - (left + markWidthPx / 2));
        if (distance < bestDistance) {
          best = event;
          bestDistance = distance;
        }
      }
      return best;
    }
    const index = Math.floor(x / cellWidth);
    return lane ? visibleByCell.get(`${lane.id}:${index}`) ?? null : null;
  }, [axisPadding, cellWidth, lanes, layout, leadingPadding, leftOf, markSize, origin, positionIndex, positioned, scale, visibleByCell, widthOf]);

  /** The span whose box or trailing segment lies under the pointer, topmost first. */
  const spanHit = useCallback((pointer: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const scroller = scrollerRef.current;
    if (!canvas || !scroller || !positioned) return null;
    const bounds = canvas.getBoundingClientRect();
    const x = pointer.clientX - bounds.left + scroller.scrollLeft;
    const y = pointer.clientY - bounds.top;
    for (let index = validated.spans.length - 1; index >= 0; index -= 1) {
      const span = validated.spans[index];
      const rows = timelineRows.get(timelineOf(span.lane));
      if (!rows || y < rows.top || y > rows.bottom) continue;
      if (x >= xOf(span.from) && x <= xOf(Math.max(span.to, span.trail ?? span.to))) return span;
    }
    return null;
  }, [positioned, timelineOf, timelineRows, validated.spans, xOf]);

  const handlePointerMove = (pointer: ReactPointerEvent<HTMLCanvasElement>) => {
    updateHover(hitTest(pointer));
  };

  const handlePointerDown = (pointer: ReactPointerEvent<HTMLCanvasElement>) => {
    // Recorded before the hit test, and before focus moves: focus is taken from
    // inside this handler, which React dispatches ahead of the scroller's own
    // onPointerDown, so a pointer-driven focus would otherwise read as keyboard.
    notePointerInteraction();
    const event = hitTest(pointer);
    if (!event) {
      const span = onSelectSpan ? spanHit(pointer) : null;
      if (span) onSelectSpan?.(span);
      return;
    }
    scrollerRef.current?.focus();
    setActiveIndex(event.i);
    updateHover(event);
    onSelect?.(event);
  };

  const moveActive = useCallback((nextPosition: number) => {
    const next = visibleEvents[nextPosition];
    if (!next) return;
    setActiveIndex(next.i);
    revealIndex(next.i);
    onSelect?.(next);
  }, [onSelect, revealIndex, visibleEvents]);

  const moveToEvent = useCallback((next: EventLaneEvent<K>) => {
    setActiveIndex(next.i);
    revealIndex(next.i);
    onSelect?.(next);
  }, [onSelect, revealIndex]);

  /** The positioned layout's walk: along the focused mark's timeline by
   *  position, stopping at its ends, and to the nearest mark in the timeline
   *  above or below. Returns the next mark, or null for a key it leaves alone. */
  const positionedStep = (key: string, active: EventLaneEvent<K>) => {
    if (!positionIndex) return null;
    const timeline = timelineOf(active.lane);
    const walk = positionIndex.byTimeline.get(timeline) ?? [active];
    const step = positionIndex.stepOf.get(active.i) ?? 0;
    if (key === "ArrowRight") return walk[Math.min(walk.length - 1, step + 1)];
    if (key === "ArrowLeft") return walk[Math.max(0, step - 1)];
    if (key === "Home") return walk[0];
    if (key === "End") return walk[walk.length - 1];
    if (key !== "ArrowUp" && key !== "ArrowDown") return null;
    const order = positionIndex.timelineOrder;
    const direction = key === "ArrowDown" ? 1 : -1;
    const target = order[order.indexOf(timeline) + direction];
    const candidates = target ? positionIndex.byTimeline.get(target) : undefined;
    if (!candidates?.length) return null;
    const here = active.position as number;
    let nearest = candidates[0];
    for (const candidate of candidates) {
      if (Math.abs((candidate.position as number) - here) < Math.abs((nearest.position as number) - here)) nearest = candidate;
    }
    return nearest;
  };

  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLDivElement>) => {
    setPointerFocus(false);
    if (visibleEvents.length === 0) return;
    if (positioned) {
      const key = keyboardEvent.key;
      if (["ArrowRight", "ArrowLeft", "Home", "End", "ArrowUp", "ArrowDown"].includes(key)) setKeyboardFocus(true);
      if (key === "Escape") {
        setKeyboardFocus(false);
        return;
      }
      const active = (activeIndex == null ? undefined : visibleByIndex.get(activeIndex)) ?? visibleEvents[0];
      if (key === "Enter" || key === " ") {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        onSelect?.(active);
        return;
      }
      const next = positionedStep(key, active);
      if (!next) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      if (next.i !== active.i || key === "Home" || key === "End") moveToEvent(next);
      return;
    }
    // Navigating by key makes this a keyboard interaction even if focus
    // originally arrived by click.
    if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(keyboardEvent.key)) {
      setKeyboardFocus(true);
    }
    // Escape dismisses the narration tooltip. Walking the strip by key leaves
    // it up on purpose — that is how a keyboard user is told where they are —
    // but there was no way to put it away again without reaching for the
    // mouse, which is the wrong instrument to have to pick up. Carrying on
    // with the arrows brings it back. Escape is NOT consumed: it keeps
    // propagating, because consumers bind it — one clears its own selection
    // on Escape — and this only affects a tooltip.
    if (keyboardEvent.key === "Escape") {
      setKeyboardFocus(false);
    }
    const currentPosition = Math.max(0, visibleEvents.findIndex((event) => event.i === activeIndex));
    let nextPosition: number | null = null;
    if (keyboardEvent.key === "ArrowRight") nextPosition = Math.min(visibleEvents.length - 1, currentPosition + 1);
    else if (keyboardEvent.key === "ArrowLeft") nextPosition = Math.max(0, currentPosition - 1);
    else if (keyboardEvent.key === "Home") nextPosition = 0;
    else if (keyboardEvent.key === "End") nextPosition = visibleEvents.length - 1;
    else if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      const active = visibleEvents[currentPosition];
      if (active) onSelect?.(active);
      return;
    } else {
      // Escape, Tab, and all unhandled keys deliberately propagate.
      return;
    }

    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    if (nextPosition !== currentPosition || keyboardEvent.key === "Home" || keyboardEvent.key === "End") {
      moveActive(nextPosition);
    }
  };

  const scrollFromOverview = (pointer: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = overviewRef.current;
    const scroller = scrollerRef.current;
    if (!canvas || !scroller) return;
    const bounds = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (pointer.clientX - bounds.left) / Math.max(1, bounds.width)));
    const maximum = Math.max(0, axisWidth - scroller.clientWidth);
    const next = Math.max(0, Math.min(maximum, ratio * axisWidth - scroller.clientWidth / 2));
    scroller.scrollLeft = next;
    setScrollLeft(next);
  };

  const handleOverviewPointerDown = (pointer: ReactPointerEvent<HTMLCanvasElement>) => {
    pointer.currentTarget.setPointerCapture(pointer.pointerId);
    scrollFromOverview(pointer);
  };

  const handleOverviewPointerMove = (pointer: ReactPointerEvent<HTMLCanvasElement>) => {
    if (pointer.currentTarget.hasPointerCapture(pointer.pointerId)) scrollFromOverview(pointer);
  };

  const tooltipContent = tooltipEvent
    ? (renderTooltip
      ? renderTooltip(tooltipEvent)
      : (
        <div className="cs-component-event-lanes-tooltip-content">
          <strong>{tooltipEvent.label}</strong>
          <span>{tooltipEvent.kind} · {tooltipEvent.at}</span>
          {tooltipEvent.error && <span>Error</span>}
          {tooltipEvent.tick && <span>Boundary</span>}
          {tooltipEvent.marker && <span>{tooltipEvent.marker}</span>}
        </div>
      ))
    : null;
  const tooltipRow = tooltipEvent ? laneIndex.get(tooltipEvent.lane) ?? 0 : 0;
  const rawTooltipX = tooltipEvent
    ? (positioned
      ? leftOf(tooltipEvent) + widthOf(tooltipEvent) / 2 - scrollLeft
      : axisPadding + (tooltipEvent.i + 0.5) * cellWidth - scrollLeft)
    : 0;
  const tooltipX = Math.max(48, Math.min(Math.max(48, viewportWidth - 48), rawTooltipX));
  const tooltipRowTop = (hasRuler ? RULER_HEIGHT : 0) + (layout.tops[tooltipRow] ?? 0);
  const tooltipRowBottom = tooltipRowTop + (layout.heights[tooltipRow] ?? LANE_HEIGHT);
  // The tooltip is portalled to the body and placed in viewport coordinates, as
  // Tooltip is. Placed inside the component it was clipped by any ancestor that
  // hides overflow, such as a Card, and a tooltip near the right edge had so
  // little width left that it wrapped word by word into a column.
  const tooltipIndex = tooltipEvent?.i;
  const [tooltipPlace, setTooltipPlace] = useState<{ x: number; top: number; bottom: number } | null>(null);
  const [tooltipShift, setTooltipShift] = useState(0);
  const [tooltipBelow, setTooltipBelow] = useState(false);
  const [placeRevision, setPlaceRevision] = useState(0);
  useLayoutEffect(() => {
    const cell = axisCellRef.current;
    if (tooltipIndex == null || !cell) {
      setTooltipPlace(null);
      return;
    }
    const box = cell.getBoundingClientRect();
    setTooltipPlace({ x: box.left + tooltipX, top: box.top + tooltipRowTop, bottom: box.top + tooltipRowBottom });
    setTooltipShift(0);
    setTooltipBelow(false);
  }, [tooltipIndex, tooltipX, tooltipRowTop, tooltipRowBottom, placeRevision]);
  // Measured after it renders: shifted sideways back inside the window, and
  // moved below its row when there is no room above.
  useLayoutEffect(() => {
    const node = tooltipRef.current;
    if (!node || !tooltipPlace) return;
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const margin = 8;
    const correction = box.left < margin
      ? margin - box.left
      : box.right > window.innerWidth - margin
        ? window.innerWidth - margin - box.right
        : 0;
    if (Math.abs(correction) >= 0.5) setTooltipShift((current) => current + correction);
    if (!tooltipBelow && box.top < margin) setTooltipBelow(true);
  }, [tooltipPlace, tooltipShift, tooltipBelow]);
  useEffect(() => {
    if (tooltipIndex == null) return;
    const replace = () => setPlaceRevision((revision) => revision + 1);
    window.addEventListener("scroll", replace, true);
    window.addEventListener("resize", replace);
    return () => {
      window.removeEventListener("scroll", replace, true);
      window.removeEventListener("resize", replace);
    };
  }, [tooltipIndex]);

  const rulerContext: EventLanesRulerContext = {
    start: 0,
    end,
    cellWidth,
    width: axisWidth,
    xForIndex: (index) => {
      const placed = positioned ? eventByIndex.get(index) : undefined;
      return placed ? leftOf(placed) + widthOf(placed) / 2 : axisPadding + (index + 0.5) * cellWidth;
    },
    ...(positioned && positionModel
      ? {
        position: {
          scale,
          origin,
          end: positionModel.finish,
          visibleStart: positionForX(scrollLeft, origin, scale, leadingPadding),
          visibleEnd: positionForX(scrollLeft + viewportWidth, origin, scale, leadingPadding),
          xForPosition: xOf,
          positionForX: (x: number) => positionForX(x, origin, scale, leadingPadding),
        },
      }
      : {}),
  };
  // One hidden option per visible event. Nothing in it depends on the scroll
  // or the scale, so the list is rebuilt only when what it states changes:
  // re-rendering tens of thousands of options on every scroll step is what
  // limited a large timeline, not the drawing.
  const describedIndex = tooltipEvent && tooltipContent != null ? tooltipEvent.i : undefined;
  const censusOptions = useMemo(() => visibleEvents.map((event, position) => (
                  <div
                    key={event.i}
                    id={`${optionIdBase}-${event.i}`}
                    role="option"
                    aria-label={positioned
                      ? optionText(
                        event,
                        laneById.get(event.lane),
                        EMPTY_SPANS,
                        validated.spans.filter((span) => span.label
                          && timelineOf(span.lane) === timelineOf(event.lane)
                          && span.from <= (event.position as number)
                          && (event.position as number) <= span.to),
                      )
                      : optionText(
                        event,
                        laneById.get(event.lane),
                        validated.spans.filter((span) => span.lane === event.lane),
                      )}
                    aria-posinset={position + 1}
                    aria-setsize={visibleEvents.length}
                    aria-selected={selected === event.i}
                    aria-describedby={describedIndex === event.i ? tooltipId : undefined}
                    data-event-index={event.i}
                    data-event-kind={event.kind}
                    data-event-lane={event.lane}
                    data-event-linked={linked?.has(event.i) ? "true" : undefined}
                    data-event-emphasized={emphasis === undefined ? undefined : String(emphasis.has(event.i))}
                  />
                )), [describedIndex, emphasis, laneById, linked, optionIdBase, positioned, selected, timelineOf, tooltipId, validated.spans, visibleEvents]);
  const activeOptionId = activeEvent ? `${optionIdBase}-${activeEvent.i}` : undefined;
  const componentStyle = {
    "--event-lanes-ruler-height": `${RULER_HEIGHT / 16}rem`,
    "--event-lanes-lane-height": `${LANE_HEIGHT / 16}rem`,
    "--event-lanes-canvas-height": `${canvasHeight / 16}rem`,
    "--event-lanes-lane-count": Math.max(1, lanes.length),
  } as CSSProperties;

  const overviewRow = showOverview && (
    <div className="cs-component-event-lanes-overview-row">
      <div data-event-lanes-overview-label="" className="cs-component-event-lanes-overview-label" aria-hidden="true">Overview</div>
      <canvas
        ref={overviewRef}
        data-event-lanes-overview=""
        aria-hidden="true"
        className="cs-component-event-lanes-overview"
        style={axisInset.left ? { marginLeft: axisInset.left } : undefined}
        onPointerDown={handleOverviewPointerDown}
        onPointerMove={handleOverviewPointerMove}
      />
    </div>
  );
  const above = overviewPlacement === "above";

  return (
    <div
      ref={rootRef}
      id={id}
      data-component="EventLanes"
      data-overview-placement={above ? "above" : undefined}
      data-event-lanes-shaded={bands.length > 0 ? "" : undefined}
      className={cn("cs-component-event-lanes-root", className)}
      style={componentStyle}
    >
      {above && overviewRow}
      <div className="cs-component-event-lanes-main">
        {bands.map((band) => (
          <div
            key={`${band.top}-${band.token}`}
            data-event-lanes-band={band.token}
            className="cs-component-event-lanes-band"
            aria-hidden="true"
            style={{
              top: `calc(var(--event-lanes-band-inset, 0rem) + ${((hasRuler ? RULER_HEIGHT : 0) + band.top) / 16}rem)`,
              height: `${(band.bottom - band.top) / 16}rem`,
              background: `var(${band.token})`,
            }}
          />
        ))}
        <div data-event-lanes-labels="" className="cs-component-event-lanes-labels" aria-hidden="true">
          {hasRuler && <div className="cs-component-event-lanes-ruler-label">{rulerLabel}</div>}
          {(lanes.length > 0 ? lanes : [{ id: "empty", label: "Events" }]).filter((lane) => !("hidden" in lane && lane.hidden)).map((lane) => (
            <Tooltip key={lane.id} content={lane.title ?? ""} disabled={!lane.title}>
              <div
                data-event-lane-label={lane.id}
                data-event-lane-title={lane.title}
                data-event-lane-description={lane.description}
                className={cn("cs-component-event-lanes-label", "className" in lane && lane.className)}
                style={{
                  ...("height" in lane && lane.height !== undefined ? { height: `${validHeight(lane.height, MIN_LANE_HEIGHT, LANE_HEIGHT) / 16}rem` } : {}),
                  ...("gapBefore" in lane && validGap(lane.gapBefore) > 0 ? { marginTop: `${validGap(lane.gapBefore) / 16}rem` } : {}),
                }}
              >
                {lane.label}
              </div>
            </Tooltip>
          ))}
        </div>
        <div ref={axisCellRef} className="cs-component-event-lanes-axis-cell">
          <div
            ref={scrollerRef}
            role="listbox"
            tabIndex={0}
            aria-label={ariaLabel}
            aria-orientation="horizontal"
            aria-activedescendant={activeOptionId}
            aria-disabled={visibleEvents.length === 0 ? "true" : undefined}
            data-event-lanes-scroller=""
            data-scrollbar={scrollbar === "overview" && showOverview ? "overview" : undefined}
            data-event-count={visibleEvents.length}
            data-span-count={validated.spans.length}
            data-layout={positioned ? "position" : undefined}
            data-focus-source={pointerFocus ? "pointer" : undefined}
            className="cs-component-event-lanes-scroller"
            onKeyDown={handleKeyDown}
            onPointerDown={notePointerInteraction}
            onFocus={() => {
              setKeyboardFocus(!pointerFocusRef.current);
              setPointerFocus(pointerFocusRef.current);
              pointerFocusRef.current = false;
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setKeyboardFocus(false);
                setPointerFocus(false);
                pointerFocusRef.current = false;
              }
            }}
            onScroll={(event) => setScrollLeft(event.currentTarget.scrollLeft)}
          >
            <div
              className="cs-component-event-lanes-axis"
              style={{ width: Math.max(axisWidth, viewportWidth) }}
            >
              {hasRuler && (
                <div
                  role="presentation"
                  className="cs-component-event-lanes-ruler"
                  style={{ width: Math.max(axisWidth, viewportWidth) }}
                >
                  {typeof ruler === "function" ? ruler(rulerContext) : ruler}
                </div>
              )}
              <div className="cs-component-event-lanes-canvas-window">
                <canvas
                  ref={canvasRef}
                  data-event-lanes-canvas=""
                  aria-hidden="true"
                  onPointerMove={handlePointerMove}
                  onPointerDown={handlePointerDown}
                  onPointerLeave={() => updateHover(null)}
                />
              </div>
              <div role="presentation" data-event-lanes-census="" className="cs-component-event-lanes-census">
                {censusOptions}
                {validated.spans.map((span, index) => (
                  <span
                    key={`${span.lane}-${span.from}-${span.to}-${index}`}
                    data-span-lane={span.lane}
                    data-span-from={span.from}
                    data-span-to={span.to}
                    data-span-id={span.id}
                    data-span-label={span.label}
                    data-span-trail={span.trail}
                    data-span-selected={span.id != null && span.id === selectedSpan ? "true" : undefined}
                  />
                ))}
                {validated.links.map((link, index) => (
                  <span
                    key={`link-${link.from}-${link.to}-${index}`}
                    data-link-from={link.from}
                    data-link-to={link.to}
                    data-link-style={link.style ?? "solid"}
                    data-link-emphasized={link.emphasized ? "true" : undefined}
                  />
                ))}
                {visibleEvents.length === 0 && <span role="status">No visible events.</span>}
              </div>
            </div>
          </div>
          {tooltipEvent && tooltipContent != null && tooltipPlace && typeof document !== "undefined" && createPortal(
            <div id={tooltipId} className="cs-component-event-lanes-tooltip-layer">
              <ChartTooltip
                ref={tooltipRef}
                className="cs-component-event-lanes-tooltip"
                x={tooltipPlace.x + tooltipShift}
                y={tooltipBelow ? tooltipPlace.bottom : tooltipPlace.top}
                anchor={tooltipBelow ? "bottom" : "top"}
              >
                {tooltipContent}
              </ChartTooltip>
            </div>,
            document.body,
          )}
        </div>
      </div>
      {!above && overviewRow}
    </div>
  );
}

export const EventLanes = forwardRefToRoot<HTMLDivElement, EventLanesProps>(EventLanesImpl);
