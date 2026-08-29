import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SectionedTree, type TreeSection } from "./SectionedTree";
import type { TreeNode } from "./Tree";

const sections: TreeSection<TreeNode>[] = [
  {
    id: "core",
    label: "Core",
    nodes: [
      { id: "a", name: "Alpha", type: "leaf" },
      { id: "b", name: "Beta", type: "leaf" },
    ],
  },
  {
    id: "utils",
    label: "Utils",
    nodes: [{ id: "c", name: "Cn", type: "leaf" }],
  },
];

describe("SectionedTree", () => {
  it("renders all section labels", () => {
    render(<SectionedTree sections={sections} />);
    expect(screen.getByText("Core")).toBeInTheDocument();
    expect(screen.getByText("Utils")).toBeInTheDocument();
  });

  it("renders nodes within each section by default (sections start expanded)", () => {
    render(<SectionedTree sections={sections} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Cn")).toBeInTheDocument();
  });

  it("makes each expanded inner tree Tab-reachable", async () => {
    render(<SectionedTree sections={sections} />);
    await waitFor(() => {
      const trees = screen.getAllByRole("tree");
      expect(trees[0].querySelector('[tabindex="0"]')).not.toBeNull();
      expect(trees[1].querySelector('[tabindex="0"]')).not.toBeNull();
    });
  });

  it("clicking a section header collapses just that section's nodes", async () => {
    render(<SectionedTree sections={sections} />);
    // Click the Core section header
    await userEvent.click(screen.getByRole("button", { name: /^Core/ }));
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    // Utils stays expanded
    expect(screen.getByText("Cn")).toBeInTheDocument();
  });

  it("onSelect fires when a leaf is clicked", async () => {
    const onSelect = vi.fn();
    render(<SectionedTree sections={sections} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("Alpha"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a", name: "Alpha" }),
    );
  });
});
