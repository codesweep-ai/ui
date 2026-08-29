"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "../lib/cn";
import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { ChartTooltip } from "./ChartTooltip";

export type EventShape = "square" | "circle" | "hollow" | "hollow-circle";
export type EventToken = `--${string}`;

export interface EventLane {
  /** Stable lane key referenced by events and spans. */
  id: string;
  /** Visible label and accessible lane name. */
  label: string;
  /** Optional native tooltip for the visible lane label. */
  title?: string;
  /** Optional context included in event option announcements. */
  description?: string;
  /** Optional presentation hook for this lane's visible label. */
  className?: string;
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
  /** Permanent token-coloured ring, painted below linked and selected halos. */
  halo?: EventToken;
}

export interface EventLaneSpan {
  lane: string;
  from: number;
  to: number;
}

export interface EventLanesRulerContext {
  start: 0;
  end: number;
  cellWidth: number;
  width: number;
  xForIndex: (i: number) => number;
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
  overview?: "auto" | boolean;
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
export function overviewLaneGeometry(laneCount: number) {
  const chromeTop = OVERVIEW_CHROME;
  const chromeBottom = OVERVIEW_HEIGHT - OVERVIEW_CHROME;
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
const EMPTY_SPANS: readonly EventLaneSpan[] = [];

interface ValidatedData<K extends string> {
  events: EventLaneEvent<K>[];
  spans: EventLaneSpan[];
  warnings: string[];
}

function isValidIndex(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function validateData<K extends string>(
  lanes: readonly EventLane[],
  events: readonly EventLaneEvent<K>[],
  spans: readonly EventLaneSpan[],
  palette: Record<K, EventToken>,
): ValidatedData<K> {
  const warnings: string[] = [];
  const laneIds = new Set<string>();
  for (const lane of lanes) {
    if (laneIds.has(lane.id)) warnings.push(`duplicate lane id "${lane.id}"`);
    laneIds.add(lane.id);
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
    if (!palette[event.kind]) warnings.push(`event kind "${event.kind}" has no palette token`);
    indices.add(event.i);
    validEvents.push(event);
  }
  validEvents.sort((a, b) => a.i - b.i);

  const validSpans: EventLaneSpan[] = [];
  for (const span of spans) {
    if (
      !laneIds.has(span.lane) ||
      !isValidIndex(span.from) ||
      !isValidIndex(span.to) ||
      span.from > span.to
    ) {
      warnings.push(`invalid span ${span.lane}:${span.from}-${span.to}`);
      continue;
    }
    validSpans.push(span);
  }

  return { events: validEvents, spans: validSpans, warnings };
}

function resolveToken(styles: CSSStyleDeclaration, token: EventToken | undefined, fallback: string) {
  if (!token) return fallback;
  return styles.getPropertyValue(token).trim() || fallback;
}

export function drawMark(
  context: CanvasRenderingContext2D,
  shape: EventShape,
  x: number,
  y: number,
  size: number,
  fill: string,
  background: string,
) {
  const half = size / 2;
  context.beginPath();
  if (shape === "circle" || shape === "hollow-circle") context.arc(x, y, half, 0, Math.PI * 2);
  else context.roundRect(x - half, y - half, size, size, 2);

  if (shape === "hollow" || shape === "hollow-circle") {
    context.fillStyle = background;
    context.fill();
    context.strokeStyle = fill;
    context.lineWidth = 2;
    context.stroke();
  } else {
    context.fillStyle = fill;
    context.fill();
  }
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

function optionText<K extends string>(
  event: EventLaneEvent<K>,
  lane: EventLane | undefined,
  spans: readonly EventLaneSpan[],
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
  overview = "auto",
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overviewRef = useRef<HTMLCanvasElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
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
  // Any press on the strip switches the modality to pointer. It cannot be left
  // to onFocus: a press on an already-focused scroller fires no focus event, so
  // a keyboard walk followed by a click would keep narrating the active event
  // after the pointer left.
  const notePointerInteraction = useCallback(() => {
    pointerFocusRef.current = true;
    setKeyboardFocus(false);
  }, []);
  const [themeRevision, setThemeRevision] = useState(0);
  const lastHoverRef = useRef<number | null>(null);

  const cellWidth = Number.isFinite(requestedCellWidth) && requestedCellWidth > 0
    ? requestedCellWidth
    : DEFAULT_CELL_WIDTH;
  const validated = useMemo(
    () => validateData(lanes, events, spans, palette),
    [events, lanes, palette, spans],
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
    () => validated.events.filter((event) => !hiddenKinds?.has(event.kind)),
    [hiddenKinds, validated.events],
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
  const axisWidth = end < 0 ? 0 : (end + 1) * cellWidth + axisPadding * 2;
  const canvasHeight = Math.max(LANE_HEIGHT, lanes.length * LANE_HEIGHT);
  const hasRuler = ruler != null;
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
    const measure = () => setViewportWidth(scroller.clientWidth);
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
    const start = index === 0 ? 0 : axisPadding + index * cellWidth;
    const finish = index === end ? axisWidth : axisPadding + (index + 1) * cellWidth;
    let next = scroller.scrollLeft;
    if (start < next) next = start;
    else if (finish > next + scroller.clientWidth) next = finish - scroller.clientWidth;
    const maximum = Math.max(0, axisWidth - scroller.clientWidth);
    next = Math.max(0, Math.min(maximum, next));
    if (next !== scroller.scrollLeft) scroller.scrollLeft = next;
    setScrollLeft(next);
  }, [axisPadding, axisWidth, cellWidth, end, viewportWidth]);

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
    const error = styles.getPropertyValue("--color-error").trim() || foreground;
    const accent = styles.getPropertyValue("--color-accent").trim() || foreground;
    const visibleStart = Math.max(0, Math.floor((scrollLeft - axisPadding) / cellWidth) - OVERSCAN_CELLS);
    const visibleEnd = Math.min(end, Math.ceil((scrollLeft + width - axisPadding) / cellWidth) + OVERSCAN_CELLS);
    canvas.dataset.windowStart = String(visibleStart);
    canvas.dataset.windowEnd = String(visibleEnd);

    context.lineCap = "round";
    for (const span of validated.spans) {
      if (span.to < visibleStart || span.from > visibleEnd) continue;
      const row = laneIndex.get(span.lane);
      if (row == null) continue;
      const y = row * LANE_HEIGHT + LANE_HEIGHT / 2;
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

    for (let index = visibleStart; index <= visibleEnd; index += 1) {
      const event = visibleByIndex.get(index);
      if (!event) continue;
      const row = laneIndex.get(event.lane);
      if (row == null) continue;
      const rawX = axisPadding + (event.i + 0.5) * cellWidth - scrollLeft;
      const y = row * LANE_HEIGHT + LANE_HEIGHT / 2;
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

      const fill = resolveToken(styles, palette[event.kind], muted);
      drawMark(context, event.shape, x, y, size, fill, background);

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
        context.moveTo(tickX, y - LANE_HEIGHT / 3);
        context.lineTo(tickX, y + LANE_HEIGHT / 3);
        context.strokeStyle = foreground;
        context.lineWidth = 2;
        context.stroke();
      }
      if (event.marker) {
        context.beginPath();
        context.arc(x, y - size / 2 - 4, 2, 0, Math.PI * 2);
        context.fillStyle = accent;
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }, [
    axisWidth,
    axisPadding,
    canvasHeight,
    cellWidth,
    emphasis,
    end,
    laneIndex,
    linked,
    palette,
    scrollLeft,
    selected,
    themeRevision,
    validated.spans,
    viewportWidth,
    visibleByIndex,
  ]);

  useEffect(() => {
    const canvas = overviewRef.current;
    const root = rootRef.current;
    if (!canvas || !root || !showOverview) return;
    const width = Math.max(1, viewportWidth);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(OVERVIEW_HEIGHT * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${OVERVIEW_HEIGHT}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, OVERVIEW_HEIGHT);
    const styles = getComputedStyle(root);
    const foreground = styles.getPropertyValue("--fg").trim() || "currentColor";
    const muted = styles.getPropertyValue("--muted").trim() || foreground;
    const link = styles.getPropertyValue("--color-link").trim() || foreground;
    const overview = overviewLaneGeometry(lanes.length);
    const scale = width / Math.max(axisWidth, 1);

    for (const event of visibleEvents) {
      const row = laneIndex.get(event.lane);
      if (row == null) continue;
      const isSelected = selected === event.i;
      const isLinked = linked?.has(event.i) ?? false;
      context.globalAlpha = emphasis === undefined || emphasis.has(event.i) || isSelected || isLinked ? 1 : 0.3;
      context.fillStyle = resolveToken(styles, palette[event.kind], muted);
      context.fillRect(
        (axisPadding + event.i * cellWidth) * scale,
        overview.markTop(row),
        Math.max(1, cellWidth * scale),
        overview.markHeight,
      );
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
      OVERVIEW_HEIGHT - OVERVIEW_CHROME,
    );
  }, [
    axisWidth,
    axisPadding,
    cellWidth,
    emphasis,
    laneIndex,
    lanes.length,
    linked,
    palette,
    scrollLeft,
    selected,
    showOverview,
    themeRevision,
    viewportWidth,
    visibleEvents,
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
    const row = Math.floor(y / LANE_HEIGHT);
    const lane = lanes[row];
    const index = Math.floor(x / cellWidth);
    return lane ? visibleByCell.get(`${lane.id}:${index}`) ?? null : null;
  }, [axisPadding, cellWidth, lanes, visibleByCell]);

  const handlePointerMove = (pointer: ReactPointerEvent<HTMLCanvasElement>) => {
    updateHover(hitTest(pointer));
  };

  const handlePointerDown = (pointer: ReactPointerEvent<HTMLCanvasElement>) => {
    // Recorded before the hit test, and before focus moves: focus is taken from
    // inside this handler, which React dispatches ahead of the scroller's own
    // onPointerDown, so a pointer-driven focus would otherwise read as keyboard.
    notePointerInteraction();
    const event = hitTest(pointer);
    if (!event) return;
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

  const handleKeyDown = (keyboardEvent: KeyboardEvent<HTMLDivElement>) => {
    if (visibleEvents.length === 0) return;
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
  const rawTooltipX = tooltipEvent ? axisPadding + (tooltipEvent.i + 0.5) * cellWidth - scrollLeft : 0;
  const tooltipX = Math.max(48, Math.min(Math.max(48, viewportWidth - 48), rawTooltipX));
  const tooltipY = (hasRuler ? RULER_HEIGHT : 0) + tooltipRow * LANE_HEIGHT + LANE_HEIGHT / 2;
  const rulerContext: EventLanesRulerContext = {
    start: 0,
    end,
    cellWidth,
    width: axisWidth,
    xForIndex: (index) => axisPadding + (index + 0.5) * cellWidth,
  };
  const activeOptionId = activeEvent ? `${optionIdBase}-${activeEvent.i}` : undefined;
  const componentStyle = {
    "--event-lanes-ruler-height": `${RULER_HEIGHT / 16}rem`,
    "--event-lanes-lane-height": `${LANE_HEIGHT / 16}rem`,
    "--event-lanes-lane-count": Math.max(1, lanes.length),
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      id={id}
      data-component="EventLanes"
      className={cn("cs-component-event-lanes-root", className)}
      style={componentStyle}
    >
      <div className="cs-component-event-lanes-main">
        <div data-event-lanes-labels="" className="cs-component-event-lanes-labels" aria-hidden="true">
          {hasRuler && <div className="cs-component-event-lanes-ruler-label">{rulerLabel}</div>}
          {(lanes.length > 0 ? lanes : [{ id: "empty", label: "Events" }]).map((lane) => (
            <div
              key={lane.id}
              data-event-lane-label={lane.id}
              data-event-lane-title={lane.title}
              data-event-lane-description={lane.description}
              title={lane.title}
              className={cn("cs-component-event-lanes-label", "className" in lane && lane.className)}
            >
              {lane.label}
            </div>
          ))}
        </div>
        <div className="cs-component-event-lanes-axis-cell">
          <div
            ref={scrollerRef}
            role="listbox"
            tabIndex={0}
            aria-label={ariaLabel}
            aria-orientation="horizontal"
            aria-activedescendant={activeOptionId}
            aria-disabled={visibleEvents.length === 0 ? "true" : undefined}
            data-event-lanes-scroller=""
            data-event-count={visibleEvents.length}
            data-span-count={validated.spans.length}
            className="cs-component-event-lanes-scroller"
            onKeyDown={handleKeyDown}
            onPointerDown={notePointerInteraction}
            onFocus={() => {
              setKeyboardFocus(!pointerFocusRef.current);
              pointerFocusRef.current = false;
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setKeyboardFocus(false);
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
                {visibleEvents.map((event, position) => (
                  <div
                    key={event.i}
                    id={`${optionIdBase}-${event.i}`}
                    role="option"
                    aria-label={optionText(
                      event,
                      laneById.get(event.lane),
                      validated.spans.filter((span) => span.lane === event.lane),
                    )}
                    aria-posinset={position + 1}
                    aria-setsize={visibleEvents.length}
                    aria-selected={selected === event.i}
                    aria-describedby={tooltipEvent?.i === event.i && tooltipContent != null ? tooltipId : undefined}
                    data-event-index={event.i}
                    data-event-kind={event.kind}
                    data-event-lane={event.lane}
                    data-event-linked={linked?.has(event.i) ? "true" : undefined}
                    data-event-emphasized={emphasis === undefined ? undefined : String(emphasis.has(event.i))}
                  />
                ))}
                {validated.spans.map((span, index) => (
                  <span
                    key={`${span.lane}-${span.from}-${span.to}-${index}`}
                    data-span-lane={span.lane}
                    data-span-from={span.from}
                    data-span-to={span.to}
                  />
                ))}
                {visibleEvents.length === 0 && <span role="status">No visible events.</span>}
              </div>
            </div>
          </div>
          {tooltipEvent && tooltipContent != null && (
            <div id={tooltipId} className="cs-component-event-lanes-tooltip-layer">
              <ChartTooltip x={tooltipX} y={tooltipY} anchor={tooltipY < 64 ? "bottom" : "top"}>
                {tooltipContent}
              </ChartTooltip>
            </div>
          )}
        </div>
      </div>
      {showOverview && (
        <div className="cs-component-event-lanes-overview-row">
          <div data-event-lanes-overview-label="" className="cs-component-event-lanes-overview-label" aria-hidden="true">Overview</div>
          <canvas
            ref={overviewRef}
            data-event-lanes-overview=""
            aria-hidden="true"
            className="cs-component-event-lanes-overview"
            onPointerDown={handleOverviewPointerDown}
            onPointerMove={handleOverviewPointerMove}
          />
        </div>
      )}
    </div>
  );
}

export const EventLanes = forwardRefToRoot<HTMLDivElement, EventLanesProps>(EventLanesImpl);
