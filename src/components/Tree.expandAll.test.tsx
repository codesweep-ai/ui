import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Tree } from "./Tree";

// The expand-all control shares a toolbar with the filter box. Until 0.3.0 the
// whole toolbar was gated on `filterable`, which defaults to false on Tree, so
// passing `onToggleExpandAll` rendered nothing and said nothing. Each half is
// gated by the thing it belongs to now.

const nodes = [
  { id: "src", name: "src", type: "branch" as const, children: [{ id: "a", name: "a.ts", type: "leaf" as const }] },
];

const expandAll = () => document.querySelectorAll('[data-part="expand-all"]');
const filterBox = () => screen.queryByLabelText("Filter tree");

describe("Tree's expand-all control and its filter box", () => {
  it("renders the control on its own, with filterable left at its default", () => {
    render(<Tree nodes={nodes} expandedIds={new Set()} allExpanded={false} onToggleExpandAll={() => {}} />);

    expect(expandAll()).toHaveLength(1);
    expect(filterBox()).toBeNull();
  });

  it("renders the filter box on its own", () => {
    render(<Tree nodes={nodes} expandedIds={new Set()} filterable />);

    expect(filterBox()).not.toBeNull();
    expect(expandAll()).toHaveLength(0);
  });

  it("renders neither when neither is asked for", () => {
    render(<Tree nodes={nodes} expandedIds={new Set()} />);

    expect(filterBox()).toBeNull();
    expect(expandAll()).toHaveLength(0);
  });
});
