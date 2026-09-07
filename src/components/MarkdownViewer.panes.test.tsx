import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MarkdownViewer } from "./MarkdownViewer";

const DOC = "# One\n\ntext\n\n## Two\n\nmore";
const KEY = "cs-test-viewer-panes";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("MarkdownViewer pane collapse", () => {
  it("reports the collapse and leaves the value to the parent when controlled", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MarkdownViewer
        content={DOC}
        outline
        minimap
        outlineCollapsed={false}
        onOutlineCollapsedChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Collapse outline" }));

    expect(onChange).toHaveBeenCalledWith(true);
    // Still open. Convention 7.2: the parent owns the value, and it has not
    // changed it yet.
    expect(screen.getByRole("button", { name: "Collapse outline" })).toBeInTheDocument();

    rerender(
      <MarkdownViewer
        content={DOC}
        outline
        minimap
        outlineCollapsed
        onOutlineCollapsedChange={onChange}
      />,
    );
    expect(screen.getByRole("button", { name: "Expand outline" })).toBeInTheDocument();
  });

  it("moves its own value, and still reports, when uncontrolled", async () => {
    const onChange = vi.fn();
    render(
      <MarkdownViewer content={DOC} outline minimap onOutlineCollapsedChange={onChange} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Collapse outline" }));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Expand outline" })).toBeInTheDocument();
  });

  it("starts where defaultOutlineCollapsed puts it", () => {
    render(<MarkdownViewer content={DOC} outline minimap defaultOutlineCollapsed />);

    expect(screen.getByRole("button", { name: "Expand outline" })).toBeInTheDocument();
  });

  it("remembers the arrangement across a remount under a storageKey", async () => {
    const { unmount } = render(
      <MarkdownViewer content={DOC} outline minimap storageKey={KEY} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Collapse minimap" }));
    expect(localStorage.getItem(KEY)).toBe('{"outline":false,"minimap":true}');

    // A viewer keyed per document remounts on every navigation, which is where
    // the arrangement used to be lost.
    unmount();
    render(<MarkdownViewer content={DOC} outline minimap storageKey={KEY} />);

    expect(screen.getByRole("button", { name: "Expand minimap" })).toBeInTheDocument();
  });

  it("keeps working when storage throws", async () => {
    const boom = () => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(boom);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(boom);

    render(<MarkdownViewer content={DOC} outline minimap storageKey={KEY} />);
    await userEvent.click(screen.getByRole("button", { name: "Collapse outline" }));

    expect(screen.getByRole("button", { name: "Expand outline" })).toBeInTheDocument();
  });
});
