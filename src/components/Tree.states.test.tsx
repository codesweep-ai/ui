import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tree, type TreeNode } from "./Tree";

const sample: TreeNode[] = [
  { id: "a", name: "Alpha", type: "leaf" },
  { id: "b", name: "Beta", type: "leaf" },
];

describe("Tree — loading state", () => {
  it("renders 6 skeleton rows when loading=true", () => {
    render(<Tree nodes={sample} expandedIds={new Set()} loading />);
    expect(screen.getByTestId("tree-loading")).toBeInTheDocument();
    // Skeleton primitives use aria-label="Loading"
    expect(screen.getAllByLabelText("Loading")).toHaveLength(6);
  });

  it("loading hides the actual node names", () => {
    render(<Tree nodes={sample} expandedIds={new Set()} loading />);
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("loading wins over error", () => {
    render(
      <Tree nodes={[]} expandedIds={new Set()} loading error="boom" />,
    );
    expect(screen.getByTestId("tree-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("tree-error")).not.toBeInTheDocument();
  });
});

describe("Tree — error state", () => {
  it("renders error block with default message", () => {
    render(
      <Tree nodes={[]} expandedIds={new Set()} error={new Error("oops")} />,
    );
    expect(screen.getByTestId("tree-error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("oops")).toBeInTheDocument();
  });

  it("string error renders as secondary message", () => {
    render(<Tree nodes={[]} expandedIds={new Set()} error="bad thing" />);
    expect(screen.getByText("bad thing")).toBeInTheDocument();
  });

  it("errorMessage overrides default primary text", () => {
    render(
      <Tree
        nodes={[]}
        expandedIds={new Set()}
        error="x"
        errorMessage="Couldn't load tree"
      />,
    );
    expect(screen.getByText("Couldn't load tree")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("Retry button fires onRetry when provided", async () => {
    const onRetry = vi.fn();
    render(
      <Tree nodes={[]} expandedIds={new Set()} error="x" onRetry={onRetry} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("no Retry button when onRetry absent", () => {
    render(<Tree nodes={[]} expandedIds={new Set()} error="x" />);
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("error wins over empty", () => {
    render(<Tree nodes={[]} expandedIds={new Set()} error="x" />);
    expect(screen.getByTestId("tree-error")).toBeInTheDocument();
    expect(screen.queryByTestId("tree-empty")).not.toBeInTheDocument();
  });
});

describe("Tree — empty state", () => {
  it("renders empty block with default message when nodes=[]", () => {
    render(<Tree nodes={[]} expandedIds={new Set()} />);
    expect(screen.getByTestId("tree-empty")).toBeInTheDocument();
    expect(screen.getByText("No nodes.")).toBeInTheDocument();
  });

  it("emptyMessage / emptyHint / emptyAction all wired", async () => {
    const onClick = vi.fn();
    render(
      <Tree
        nodes={[]}
        expandedIds={new Set()}
        emptyMessage="Add a node"
        emptyHint="Drag a file here"
        emptyAction={{ label: "Add first", onClick }}
      />,
    );
    expect(screen.getByText("Add a node")).toBeInTheDocument();
    expect(screen.getByText("Drag a file here")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add first" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("empty is NOT rendered when nodes has items", () => {
    render(<Tree nodes={sample} expandedIds={new Set()} />);
    expect(screen.queryByTestId("tree-empty")).not.toBeInTheDocument();
  });
});
