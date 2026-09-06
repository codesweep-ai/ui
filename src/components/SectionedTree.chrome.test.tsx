import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionedTree, type TreeSection } from "./SectionedTree";

const sections: TreeSection[] = [
  { id: "one", label: "One", nodes: [{ id: "a", name: "a.tsx", type: "leaf" }] },
  { id: "two", label: "Two", nodes: [{ id: "b", name: "b.tsx", type: "leaf" }] },
];

describe("SectionedTree chrome", () => {
  it("keeps a filter box per section by default", () => {
    render(<SectionedTree sections={sections} />);
    expect(screen.getAllByPlaceholderText("Filter...")).toHaveLength(2);
  });

  it("drops every filter box when asked", () => {
    render(<SectionedTree sections={sections} filterable={false} />);
    expect(screen.queryByPlaceholderText("Filter...")).toBeNull();
  });

  it("lets one section keep its filter while the others lose it", () => {
    const mixed: TreeSection[] = [
      { ...sections[0], filterable: true },
      { ...sections[1] },
    ];
    render(<SectionedTree sections={mixed} filterable={false} />);
    expect(screen.getAllByPlaceholderText("Filter...")).toHaveLength(1);
  });

  it("drops the expand-all control when asked", () => {
    const { rerender } = render(<SectionedTree sections={sections} />);
    const before = screen.getAllByRole("button", { name: /expand all|collapse all/i }).length;

    rerender(<SectionedTree sections={sections} expandAllControl={false} />);
    const after = screen.getAllByRole("button", { name: /expand all|collapse all/i }).length;

    // The component's own top-level control stays; the per-section ones go.
    expect(after).toBeLessThan(before);
  });

  it("carries part hooks a consumer can style without a generated class name", () => {
    const { container } = render(<SectionedTree sections={sections} />);
    expect(container.querySelectorAll('[data-part="section"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-part="header"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-part="body"]')).toHaveLength(2);
  });

  it("passes the label overflow mode down to every section", () => {
    const { container } = render(<SectionedTree sections={sections} labelOverflow="wrap" />);
    const trees = container.querySelectorAll('[data-component="Tree"]');
    expect(trees).toHaveLength(2);
    trees.forEach((tree) => expect(tree).toHaveAttribute("data-label-overflow", "wrap"));
  });
});
