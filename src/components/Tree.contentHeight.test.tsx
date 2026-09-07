import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../styles/tokens.css";
import "../styles/base.css";
import { Panel } from "./Panel";
import { Tree, type TreeNode } from "./Tree";

// Runs in the browser project. Every claim here is a measurement, because the
// failure it guards against is invisible without one: rows sit inside a box
// nothing scrolls, where scrollIntoView still reaches them and a mouse cannot.
const SIDEBAR = 200;

function rows(prefix: string, count: number): TreeNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}`,
    name: `${prefix} item ${i}`,
    type: "leaf" as const,
  }));
}

function lastRowIsReachable(sidebar: HTMLElement, text: string) {
  const bottom =
    screen.getByText(text).getBoundingClientRect().bottom -
    sidebar.getBoundingClientRect().top +
    sidebar.scrollTop;
  return bottom <= sidebar.scrollHeight;
}

describe("Tree scroll", () => {
  it("owns its own scrollbar by default", () => {
    const { container } = render(
      <div style={{ height: SIDEBAR }}>
        <Tree nodes={rows("guide", 20)} expandedIds={new Set()} />
      </div>,
    );

    const scroller = container.querySelector<HTMLElement>('[data-part="scroller"]')!;
    expect(getComputedStyle(scroller).overflowY).toBe("auto");
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
  });

  // Two bare trees stacked in one bounded scroller. This is the composition the
  // report came from, and the one the default clips: each tree is pinned to the
  // sidebar's height while its rows carry on past the bottom of it.
  it("sizes to its rows and lets an ancestor scroll when scroll is false", () => {
    const { container } = render(
      <div data-testid="sidebar" style={{ height: SIDEBAR, overflowY: "auto" }}>
        <Tree nodes={rows("guide", 20)} expandedIds={new Set()} scroll={false} />
        <Tree nodes={rows("ref", 20)} expandedIds={new Set()} scroll={false} />
      </div>,
    );

    const sidebar = screen.getByTestId("sidebar");
    const scrollers = [...container.querySelectorAll<HTMLElement>('[data-part="scroller"]')];
    expect(scrollers).toHaveLength(2);

    let rowHeight = 0;
    for (const scroller of scrollers) {
      expect(scroller.scrollHeight).toBe(scroller.clientHeight);
      expect(scroller.clientHeight).toBeGreaterThan(SIDEBAR);
      rowHeight += scroller.clientHeight;
    }

    // Every row counts toward the one scroller that owns them. Measured on the
    // default, this sidebar reports 400 for 1160 of tree.
    expect(sidebar.scrollHeight).toBeGreaterThanOrEqual(rowHeight);
    expect(lastRowIsReachable(sidebar, "ref item 19")).toBe(true);
  });

  it("keeps a Panel's tree inside the panel when the panel is bounded", () => {
    const { container } = render(
      <div style={{ height: SIDEBAR }}>
        <Panel title="Guides">
          <Tree nodes={rows("guide", 20)} expandedIds={new Set()} />
        </Panel>
      </div>,
    );

    const scroller = container.querySelector<HTMLElement>('[data-part="scroller"]')!;
    expect(scroller.scrollHeight).toBeGreaterThan(scroller.clientHeight);
  });
});

describe("Panel height", () => {
  // A panel sizing to its content resolves its child's percentage height to
  // auto as well, so a wrapped tree needs no `scroll` of its own.
  it("sizes to its content and hands the scrolling to an ancestor", () => {
    const { container } = render(
      <div data-testid="sidebar" style={{ height: SIDEBAR, overflowY: "auto" }}>
        <Panel title="Guides" height="auto">
          <Tree nodes={rows("guide", 20)} expandedIds={new Set()} />
        </Panel>
        <Panel title="Reference" height="auto">
          <Tree nodes={rows("ref", 20)} expandedIds={new Set()} />
        </Panel>
      </div>,
    );

    const sidebar = screen.getByTestId("sidebar");
    const panels = [...container.querySelectorAll<HTMLElement>('[data-component="Panel"]')];
    expect(panels).toHaveLength(2);

    let panelHeight = 0;
    for (const panel of panels) {
      const height = panel.getBoundingClientRect().height;
      expect(height).toBeGreaterThan(SIDEBAR);
      panelHeight += height;
    }

    expect(sidebar.scrollHeight).toBeGreaterThanOrEqual(panelHeight);
    expect(lastRowIsReachable(sidebar, "ref item 19")).toBe(true);
  });

  it("fills its container and scrolls its body when no height is given", () => {
    const { container } = render(
      <div style={{ height: SIDEBAR }}>
        <Panel title="Guides">
          <Tree nodes={rows("guide", 20)} expandedIds={new Set()} />
        </Panel>
      </div>,
    );

    const panel = container.querySelector<HTMLElement>('[data-component="Panel"]')!;
    expect(Math.round(panel.getBoundingClientRect().height)).toBe(SIDEBAR);
  });
});
