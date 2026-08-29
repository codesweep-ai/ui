import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChartTheme, styleAxis, assignSeriesColors, type ChartTheme } from "./chartTheme";

function setVars() {
  const root = document.documentElement;
  root.style.setProperty("--bg", "#0a0a0a");
  root.style.setProperty("--card", "#111");
  root.style.setProperty("--border", "rgba(255,255,255,0.08)");
  root.style.setProperty("--fg", "#fafafa");
  root.style.setProperty("--muted", "#999");
  root.style.setProperty("--color-accent", "#1ee0ca");
  root.style.setProperty("--color-accent-bg-strong", "rgba(30,224,202,0.15)");
  root.style.setProperty("--color-success", "#34d399");
  root.style.setProperty("--color-warning", "#f59e0b");
  root.style.setProperty("--color-error", "#f87171");
  for (let i = 1; i <= 10; i++) {
    root.style.setProperty(`--color-cat-${i}`, `#00000${i % 10}`);
    root.style.setProperty(`--color-cat-${i}-light`, `#11111${i % 10}`);
    root.style.setProperty(`--color-cat-${i}-mid`, `#22222${i % 10}`);
    root.style.setProperty(`--color-cat-${i}-dark`, `#33333${i % 10}`);
  }
}

function clearVars() {
  document.documentElement.removeAttribute("style");
}

describe("useChartTheme", () => {
  beforeEach(setVars);
  afterEach(clearVars);

  it("reads core tokens into the theme object", () => {
    const { result } = renderHook(() => useChartTheme());
    expect(result.current.bg).toBe("#0a0a0a");
    expect(result.current.fg).toBe("#fafafa");
    expect(result.current.accent).toBe("#1ee0ca");
    expect(result.current.error).toBe("#f87171");
  });

  it("axisLabel + gridLine alias muted + border", () => {
    const { result } = renderHook(() => useChartTheme());
    expect(result.current.axisLabel).toBe(result.current.muted);
    expect(result.current.gridLine).toBe(result.current.border);
  });

  it("categorical arrays each have 10 entries", () => {
    const { result } = renderHook(() => useChartTheme());
    expect(result.current.categorical).toHaveLength(10);
    expect(result.current.categoricalLight).toHaveLength(10);
    expect(result.current.categoricalMid).toHaveLength(10);
    expect(result.current.categoricalDark).toHaveLength(10);
  });

  it("categorical sub-series read the right token suffixes", () => {
    const { result } = renderHook(() => useChartTheme());
    expect(result.current.categorical[0]).toBe("#000001");
    expect(result.current.categoricalLight[0]).toBe("#111111");
    expect(result.current.categoricalMid[0]).toBe("#222221");
    expect(result.current.categoricalDark[0]).toBe("#333331");
  });
});

describe("styleAxis", () => {
  it("applies fill/font to text and stroke to lines/paths", () => {
    const textSel = { style: vi.fn().mockReturnThis() };
    const lineSel = { style: vi.fn().mockReturnThis() };
    const selection = {
      selectAll: vi.fn((s: string) => (s === "text" ? textSel : lineSel)),
    };
    const theme = { axisLabel: "#999", gridLine: "#222" } as ChartTheme;
    styleAxis(selection, theme);
    expect(selection.selectAll).toHaveBeenCalledWith("text");
    expect(selection.selectAll).toHaveBeenCalledWith("line, path");
    expect(textSel.style).toHaveBeenCalledWith("fill", "#999");
    expect(lineSel.style).toHaveBeenCalledWith("stroke", "#222");
  });
});

describe("assignSeriesColors", () => {
  const theme = {
    categorical: ["c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"],
  } as ChartTheme;

  it("assigns colors by sorted key order (stable across arrival order)", () => {
    const a = assignSeriesColors(["zeta", "alpha", "mu"], theme);
    const b = assignSeriesColors(["mu", "zeta", "alpha"], theme);
    expect(a).toEqual(b);
    // sorted: alpha, mu, zeta
    expect(a.alpha).toBe("c0");
    expect(a.mu).toBe("c1");
    expect(a.zeta).toBe("c2");
  });

  it("wraps around the palette when more keys than colors", () => {
    const keys = Array.from({ length: 12 }, (_, i) => `k${String(i).padStart(2, "0")}`);
    const map = assignSeriesColors(keys, theme);
    expect(map.k00).toBe("c0");
    expect(map.k10).toBe("c0"); // 10 % 10 = 0
    expect(map.k11).toBe("c1");
  });
});
