import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SectionedTree, type TreeSection } from "./SectionedTree";
import type { TreeNode } from "./Tree";

const sample: TreeSection<TreeNode>[] = [
  {
    id: "s1",
    label: "Section 1",
    nodes: [{ id: "a", name: "Alpha", type: "leaf" }],
  },
];

describe("SectionedTree — loading state", () => {
  it("renders skeleton sections when loading=true", () => {
    render(<SectionedTree sections={sample} loading />);
    expect(screen.getByTestId("sectionedtree-loading")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Loading").length).toBeGreaterThan(0);
  });

  it("loading hides the real section labels", () => {
    render(<SectionedTree sections={sample} loading />);
    expect(screen.queryByText("Section 1")).not.toBeInTheDocument();
  });
});

describe("SectionedTree — error state", () => {
  it("renders error block + retry button", async () => {
    const onRetry = vi.fn();
    render(
      <SectionedTree
        sections={[]}
        error={new Error("nope")}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByTestId("sectionedtree-error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("nope")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("errorMessage override", () => {
    render(
      <SectionedTree
        sections={[]}
        error="x"
        errorMessage="Custom err"
      />,
    );
    expect(screen.getByText("Custom err")).toBeInTheDocument();
  });
});

describe("SectionedTree — empty state", () => {
  it("renders empty block when sections=[]", () => {
    render(<SectionedTree sections={[]} />);
    expect(screen.getByTestId("sectionedtree-empty")).toBeInTheDocument();
    expect(screen.getByText("No sections.")).toBeInTheDocument();
  });

  it("emptyMessage / emptyHint / emptyAction wired", async () => {
    const onClick = vi.fn();
    render(
      <SectionedTree
        sections={[]}
        emptyMessage="No data"
        emptyHint="Try refreshing"
        emptyAction={{ label: "Refresh", onClick }}
      />,
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.getByText("Try refreshing")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("empty is NOT rendered when sections has items", () => {
    render(<SectionedTree sections={sample} />);
    expect(screen.queryByTestId("sectionedtree-empty")).not.toBeInTheDocument();
  });
});
