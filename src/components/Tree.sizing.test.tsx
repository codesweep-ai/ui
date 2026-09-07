import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Panel } from "./Panel";
import { SectionedTree } from "./SectionedTree";
import { Tree } from "./Tree";

// Browser mode, because every number here is a layout measurement and jsdom
// reports zero for all of them.
//
// One question has three answers: how do I stop this column scrolling inside
// itself, so the page scrolls once? Which answer applies depends on what sits
// between the tree and the scroller, and a consumer cannot tell them apart by
// reading. These measurements are what the decision table in
// DESIGN_SYSTEM_SPEC.md is built from, so they live here rather than in a
// paragraph nothing checks.

const COLUMN = 200;

const nodes = (prefix: string) =>
  Array.from({ length: 20 }, (_, i) => ({
    id: `${prefix}-${i}`,
    name: `${prefix} item ${i}`,
    type: "leaf" as const,
  }));

/** A bounded column that owns the scroll, which is the composition in question. */
function measure(ui: React.ReactElement) {
  const host = document.createElement("div");
  host.style.height = `${COLUMN}px`;
  host.style.width = "260px";
  host.style.overflowY = "auto";
  document.body.appendChild(host);
  render(ui, { container: host });
  return host.scrollHeight;
}

const bareTrees = (scroll?: boolean) => (
  <>
    {["one", "two"].map((key) => (
      <Tree key={key} nodes={nodes(key)} expandedIds={new Set()} scroll={scroll} filterable={false} />
    ))}
  </>
);

const panelledTrees = (scroll?: boolean) => (
  <>
    {["one", "two"].map((key) => (
      <Panel key={key} title={key} height="auto">
        <Tree nodes={nodes(key)} expandedIds={new Set()} scroll={scroll} filterable={false} />
      </Panel>
    ))}
  </>
);

describe("sizing a tree to its content inside a scrolling column", () => {
  it("clamps a bare tree at the default, so rows land in a box nothing scrolls", () => {
    const clamped = measure(bareTrees());
    const released = measure(bareTrees(false));

    // Each tree takes the column's height rather than its own content's, so
    // the column has almost nothing to scroll and the rows below are reachable
    // by scrollIntoView and by nothing a user does.
    expect(clamped).toBeLessThan(released / 2);
    expect(released).toBeGreaterThan(COLUMN * 3);
  });

  it("needs no scroll of its own inside a panel sized to its content", () => {
    const byDefault = measure(panelledTrees());
    const explicit = measure(panelledTrees(false));

    // `Panel height="auto"` leaves its own height indefinite, so the tree's
    // percentage height resolves to auto and `scroll` changes nothing.
    expect(byDefault).toBe(explicit);
    expect(byDefault).toBeGreaterThan(COLUMN * 3);
  });

  it("needs nothing at all from SectionedTree, which has no scroll prop", () => {
    const sections = ["one", "two"].map((key) => ({ id: key, label: key, nodes: nodes(key) }));
    const measured = measure(
      <SectionedTree sections={sections} filterable={false} expandAllControl={false} />,
    );

    expect(measured).toBeGreaterThan(COLUMN * 3);
  });
});
