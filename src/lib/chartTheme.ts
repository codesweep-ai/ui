"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./useTheme";
import { accentCustomProperty } from "./accentToken";

export interface ChartTheme {
  bg: string;
  card: string;
  border: string;
  gridLine: string;
  fg: string;
  muted: string;
  axisLabel: string;
  accent: string;
  accentSoft: string;
  success: string;
  warning: string;
  error: string;
  categorical: string[];
  categoricalLight: string[];
  categoricalMid: string[];
  categoricalDark: string[];

  // ── Typography ──────────────────────────────────────────────────────────
  // Colour is not the only thing a drawing consumer cannot take from a CSS
  // custom property. `ctx.font` will not accept a `var()` string, and nothing
  // can be laid out around a label whose width is unknown, so a chart that
  // draws a legend chip or a truncated tick has to measure text before it
  // draws. Without these three a consumer hard-codes a per-character estimate,
  // which is a design token copied into a magic number.

  /** Resolved font stack for chart text: the mono stack `styleAxis` applies. */
  fontFamily: string;
  /** Resolved axis label size, in pixels rather than a CSS length. */
  fontSizeAxis: number;
  /**
   * Rendered width of `text` in pixels, in the chart's own font. Pass `font` to
   * measure in a different one, in the shorthand `ctx.font` takes.
   *
   * Returns 0 where there is no canvas to measure with, which is server-side
   * rendering and nowhere a chart draws.
   */
  measureText: (text: string, font?: string) => number;
}

const CATEGORICAL_COUNT = 10;

// One canvas for the life of the page. A chart that lays out around its text
// measures once per label per redraw, so allocating a context per call is the
// difference between a helper and a bottleneck. `undefined` means not yet
// asked; `null` means asked and unavailable.
let measuringContext: CanvasRenderingContext2D | null | undefined;

function textContext(): CanvasRenderingContext2D | null {
  if (measuringContext !== undefined) return measuringContext;
  try {
    measuringContext = document.createElement("canvas").getContext("2d");
  } catch {
    measuringContext = null;
  }
  return measuringContext;
}

function measurer(font: string) {
  return (text: string, override?: string) => {
    const ctx = textContext();
    // jsdom's canvas has no measureText, and a browser can refuse a context.
    if (!ctx || typeof ctx.measureText !== "function") return 0;
    ctx.font = override ?? font;
    return ctx.measureText(text).width;
  };
}

// The token is a CSS length and both a canvas font string and a layout
// calculation need pixels, so a rem value is resolved rather than passed
// through as a number that would silently mean something else.
function pixels(value: string): number {
  const match = /^(-?[\d.]+)(px|rem|em)?$/.exec(value.trim());
  if (!match) return 0;
  const size = Number.parseFloat(match[1]);
  if (match[2] !== "rem" && match[2] !== "em") return size;
  const rootSize = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return size * (Number.isFinite(rootSize) ? rootSize : 16);
}

function readVars(): ChartTheme {
  // SSR / non-DOM guard — return empty strings rather than throwing.
  if (typeof document === "undefined" || !document.documentElement) {
    const empty = Array.from({ length: CATEGORICAL_COUNT }, () => "");
    return {
      bg: "", card: "", border: "", gridLine: "", fg: "", muted: "",
      axisLabel: "", accent: "", accentSoft: "", success: "", warning: "",
      error: "", categorical: empty, categoricalLight: [...empty],
      categoricalMid: [...empty], categoricalDark: [...empty],
      fontFamily: "", fontSizeAxis: 0, measureText: () => 0,
    };
  }

  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  const series = (suffix = "") =>
    Array.from({ length: CATEGORICAL_COUNT }, (_, i) =>
      v(`--color-cat-${i + 1}${suffix}`),
    );

  const fontFamily = v("--font-family-mono");
  const fontSizeAxis = pixels(v("--font-size-chart-axis"));

  return {
    bg: v("--bg"),
    card: v("--card"),
    border: v("--border"),
    gridLine: v("--border"),
    fg: v("--fg"),
    muted: v("--muted"),
    axisLabel: v("--muted"),
    accent: v(accentCustomProperty()),
    accentSoft: v(accentCustomProperty("-bg-strong")),
    success: v("--color-success"),
    warning: v("--color-warning"),
    error: v("--color-error"),
    categorical: series(),
    categoricalLight: series("-light"),
    categoricalMid: series("-mid"),
    categoricalDark: series("-dark"),
    fontFamily,
    fontSizeAxis,
    measureText: measurer(`${fontSizeAxis}px ${fontFamily}`),
  };
}

/**
 * Resolve the current theme's chart colors as concrete JS values (d3 and most
 * chart libraries want resolved values, not CSS custom properties). Re-reads
 * the CSS variables whenever the resolved theme flips, so charts restyle on
 * light/dark toggle. See patterns/Chart.md.
 */
export function useChartTheme(): ChartTheme {
  const { resolved } = useTheme();
  const [theme, setTheme] = useState<ChartTheme>(readVars);

  useEffect(() => {
    setTheme(readVars());
  }, [resolved]);

  // A web font that arrives after the first paint measures differently from the
  // fallback it replaced, so a chart laid out around the fallback's widths is
  // wrong until it redraws. Nothing is waited for when the fonts already
  // settled, which is every page whose stacks are the system ones this kit
  // ships, so the common case costs one status read and no extra render.
  useEffect(() => {
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    if (!fonts?.ready || fonts.status === "loaded") return;
    let live = true;
    void fonts.ready.then(() => {
      if (live) setTheme(readVars());
    });
    return () => {
      live = false;
    };
  }, []);

  return theme;
}

/** Minimal structural shape of a d3 selection — keeps this lib d3-free. */
interface StylableSelection {
  style: (prop: string, value: string) => StylableSelection;
}
interface AxisSelection {
  selectAll: (selector: string) => StylableSelection;
}

/**
 * Style a d3 axis selection with theme-driven colors. Kept loosely typed so
 * this library doesn't take a hard dependency on d3.
 */
export function styleAxis(selection: AxisSelection, theme: ChartTheme): void {
  selection
    .selectAll("text")
    .style("fill", theme.axisLabel)
    .style("font-family", "var(--font-family-mono)")
    .style("font-size", "var(--font-size-chart-axis)");
  selection.selectAll("line, path").style("stroke", theme.gridLine);
}

/**
 * Stable color assignment by key. Keys are sorted before assignment so the
 * same series name ("auth") always maps to the same categorical color across
 * different pages, regardless of arrival order.
 */
export function assignSeriesColors(
  keys: string[],
  theme: ChartTheme,
): Record<string, string> {
  const sorted = [...keys].sort();
  return Object.fromEntries(
    sorted.map((k, i) => [
      k,
      theme.categorical[i % theme.categorical.length],
    ]),
  );
}
