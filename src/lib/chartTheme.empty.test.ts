import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * A module nothing has warned through yet, with the renderer imported beside it.
 *
 * The warning fires once per family for the life of the module, which is right
 * on a page of twenty charts and wrong in a test file, where a later test would
 * assert on silence it had not earned. Re-importing the renderer too keeps one
 * React in the graph: a hook from a fresh module rendered by a renderer holding
 * the previous one is an invalid hook call.
 */
async function fresh() {
  vi.resetModules();
  const { renderHook } = await import("@testing-library/react");
  const { useChartTheme } = await import("./chartTheme");
  return { renderHook, useChartTheme };
}

function setTokens() {
  const root = document.documentElement;
  for (let i = 1; i <= 10; i++) root.style.setProperty(`--color-cat-${i}`, `#00000${i % 10}`);
  for (let i = 1; i <= 8; i++) root.style.setProperty(`--color-graph-${i}`, `#4444d${i}`);
}

afterEach(() => {
  document.documentElement.removeAttribute("style");
  vi.restoreAllMocks();
});

describe("a palette that resolves to nothing", () => {
  it("stays quiet when the tokens are on the page", async () => {
    setTokens();
    const { renderHook, useChartTheme } = await fresh();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderHook(() => useChartTheme());

    expect(warn).not.toHaveBeenCalled();
  });

  it("says so when the graph ramp is missing, rather than letting marks paint black", async () => {
    const { renderHook, useChartTheme } = await fresh();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { result } = renderHook(() => useChartTheme());

    // The state the consumer actually shipped: every slot an empty string.
    expect(result.current.graph.every((c) => c === "")).toBe(true);
    const said = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(said).toMatch(/every graph colour resolved to nothing/);
    expect(said).toMatch(/--color-graph-1/);
    expect(said).toMatch(/core\.css/);
  });

  it("says so for the categorical ramp under its own name", async () => {
    const { renderHook, useChartTheme } = await fresh();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderHook(() => useChartTheme());

    const said = warn.mock.calls.map((c) => String(c[0])).join("\n");
    expect(said).toMatch(/every categorical colour resolved to nothing/);
    expect(said).toMatch(/--color-cat-1/);
  });

  it("warns once per family, not once per chart on the page", async () => {
    const { renderHook, useChartTheme } = await fresh();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderHook(() => useChartTheme());
    renderHook(() => useChartTheme());
    renderHook(() => useChartTheme());

    // Two families, three charts.
    expect(warn.mock.calls.length).toBe(2);
  });

  it("does not mistake a half-defined palette for an empty one", async () => {
    // One token is enough to mean the sheet is there; a gap is a different fault.
    document.documentElement.style.setProperty("--color-graph-1", "#e85d90");
    document.documentElement.style.setProperty("--color-cat-1", "#6d89c2");
    const { renderHook, useChartTheme } = await fresh();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderHook(() => useChartTheme());

    expect(warn).not.toHaveBeenCalled();
  });
});
