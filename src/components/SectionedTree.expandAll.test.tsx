import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionedTree } from "./SectionedTree";

// SectionedTree renders two kinds of expand-all control that do different
// jobs. One above the sections expands and collapses whole sections; one
// inside each section expands and collapses that section's nodes.
//
// These leave `filterable` at its default, because the per-section control
// sits inside the same toolbar the filter box does and `filterable={false}`
// takes it away too. That coupling is CUI-063.
//
// They read
// the same until 0.3.0, and a test matching /expand all/i against them passed
// whether the prop worked or not. These assert counts against the DOM hooks.

const sections = ["one", "two"].map((key) => ({
  id: key,
  label: key,
  nodes: [{ id: `${key}-a`, name: "a", type: "leaf" as const }],
}));

const sectionsControls = () => document.querySelectorAll('[data-part="sections-expand-all"]');
const treeControls = () => document.querySelectorAll('[data-part="expand-all"]');

describe("SectionedTree expand-all controls", () => {
  it("renders both kinds by default", () => {
    render(<SectionedTree sections={sections} />);

    expect(sectionsControls()).toHaveLength(1);
    expect(treeControls()).toHaveLength(2);
  });

  it("removes both when the prop is false", () => {
    render(<SectionedTree sections={sections} expandAllControl={false} />);

    expect(sectionsControls()).toHaveLength(0);
    expect(treeControls()).toHaveLength(0);
  });

  it("keeps only the sections control", () => {
    render(<SectionedTree sections={sections} expandAllControl="sections" />);

    expect(sectionsControls()).toHaveLength(1);
    expect(treeControls()).toHaveLength(0);
  });

  it("keeps only the per-section controls", () => {
    render(<SectionedTree sections={sections} expandAllControl="trees" />);

    expect(sectionsControls()).toHaveLength(0);
    expect(treeControls()).toHaveLength(2);
  });

  it("gives the two kinds names a reader can tell apart", () => {
    render(<SectionedTree sections={sections} />);

    // The old labels were both "Collapse all", so a reader looking at the page
    // could not say which one the prop governed.
    expect(screen.getByRole("button", { name: "Collapse all sections" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Expand all" })).toHaveLength(2);
  });
});
