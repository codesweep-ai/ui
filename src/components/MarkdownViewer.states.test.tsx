import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MarkdownViewer } from "./MarkdownViewer";

describe("MarkdownViewer — loading state", () => {
  it("renders skeleton lines when loading=true", () => {
    render(<MarkdownViewer content="# Title" loading />);
    expect(screen.getByTestId("markdownviewer-loading")).toBeInTheDocument();
    // Multiple Skeleton primitives (each aria-label='Loading')
    expect(screen.getAllByLabelText("Loading").length).toBeGreaterThan(5);
  });

  it("loading hides the rendered markdown", () => {
    render(<MarkdownViewer content="# Title" loading />);
    expect(screen.queryByRole("heading", { name: "Title" })).not.toBeInTheDocument();
  });

  it("loading wins over error and empty", () => {
    render(<MarkdownViewer content="" loading error="boom" />);
    expect(screen.getByTestId("markdownviewer-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("markdownviewer-error")).not.toBeInTheDocument();
    expect(screen.queryByTestId("markdownviewer-empty")).not.toBeInTheDocument();
  });
});

describe("MarkdownViewer — error state", () => {
  it("renders error block with default message", () => {
    render(<MarkdownViewer content="" error={new Error("network")} />);
    expect(screen.getByTestId("markdownviewer-error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("network")).toBeInTheDocument();
  });

  it("string error renders as secondary text", () => {
    render(<MarkdownViewer content="" error="bad" />);
    expect(screen.getByText("bad")).toBeInTheDocument();
  });

  it("errorMessage overrides primary text", () => {
    render(
      <MarkdownViewer
        content=""
        error="x"
        errorMessage="Couldn't load doc"
      />,
    );
    expect(screen.getByText("Couldn't load doc")).toBeInTheDocument();
  });

  it("Retry button fires onRetry", async () => {
    const onRetry = vi.fn();
    render(<MarkdownViewer content="" error="x" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("error wins over empty", () => {
    render(<MarkdownViewer content="" error="x" />);
    expect(screen.getByTestId("markdownviewer-error")).toBeInTheDocument();
    expect(screen.queryByTestId("markdownviewer-empty")).not.toBeInTheDocument();
  });
});

describe("MarkdownViewer — empty state", () => {
  it("empty content renders empty block with default 'No content.'", () => {
    render(<MarkdownViewer content="" />);
    expect(screen.getByTestId("markdownviewer-empty")).toBeInTheDocument();
    expect(screen.getByText("No content.")).toBeInTheDocument();
  });

  it("whitespace-only content also renders empty block", () => {
    render(<MarkdownViewer content={"    \n\n   "} />);
    expect(screen.getByTestId("markdownviewer-empty")).toBeInTheDocument();
  });

  it("emptyMessage / emptyHint / emptyAction wired", async () => {
    const onClick = vi.fn();
    render(
      <MarkdownViewer
        content=""
        emptyMessage="Pick a doc"
        emptyHint="Browse the tree on the left"
        emptyAction={{ label: "Open first", onClick }}
      />,
    );
    expect(screen.getByText("Pick a doc")).toBeInTheDocument();
    expect(screen.getByText("Browse the tree on the left")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open first" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("empty NOT rendered when content has text", () => {
    render(<MarkdownViewer content="some text" />);
    expect(screen.queryByTestId("markdownviewer-empty")).not.toBeInTheDocument();
  });
});
