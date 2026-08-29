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
}

const CATEGORICAL_COUNT = 10;

function readVars(): ChartTheme {
  // SSR / non-DOM guard — return empty strings rather than throwing.
  if (typeof document === "undefined" || !document.documentElement) {
    const empty = Array.from({ length: CATEGORICAL_COUNT }, () => "");
    return {
      bg: "", card: "", border: "", gridLine: "", fg: "", muted: "",
      axisLabel: "", accent: "", accentSoft: "", success: "", warning: "",
      error: "", categorical: empty, categoricalLight: [...empty],
      categoricalMid: [...empty], categoricalDark: [...empty],
    };
  }

  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  const series = (suffix = "") =>
    Array.from({ length: CATEGORICAL_COUNT }, (_, i) =>
      v(`--color-cat-${i + 1}${suffix}`),
    );

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
