import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../styles/tokens.css";
import "../styles/base.css";
import { Panel } from "./Panel";

// Runs in the browser project. The whole question is whether anything is left
// on screen to click, and a zero-width box is only zero-width with real layout.
describe("Panel collapseTo", () => {
  it("folds the whole panel away by default", () => {
    render(
      <Panel title="Files" width={240} collapsed onCollapse={() => {}}>
        <p>tree</p>
      </Panel>,
    );

    const root = screen.getByRole("group", { name: "Files" });
    const box = root.getBoundingClientRect();
    expect(box.width).toBe(0);
    expect(screen.queryByText("tree")).toBeNull();

    // The toggle is still in the DOM and sits past the panel's right edge,
    // where `overflow: hidden` clips it. That is the problem this mode has:
    // nothing on screen brings the panel back.
    const toggle = screen.getByRole("button", { name: "Expand Files panel" });
    expect(toggle.getBoundingClientRect().left).toBeGreaterThanOrEqual(box.right);
  });

  it("keeps the header and its toggle when collapsing to the header", async () => {
    const onCollapse = vi.fn();
    render(
      <Panel
        title="Files"
        width={240}
        collapsed
        collapseTo="header"
        onCollapse={onCollapse}
      >
        <p>tree</p>
      </Panel>,
    );

    const root = screen.getByRole("group", { name: "Files" });
    expect(root.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(screen.getByText("Files")).toBeVisible();

    // The point of the mode: something is still there to bring it back.
    const toggle = screen.getByRole("button", { name: "Expand Files panel" });
    expect(toggle.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(toggle);
    expect(onCollapse).toHaveBeenCalledTimes(1);

    // The body still goes. Only the header is spared.
    expect(screen.queryByText("tree")).toBeNull();
  });

  it("leaves an expanded panel identical in both modes", () => {
    const { unmount } = render(
      <Panel title="Files" width={240}>
        <p>tree</p>
      </Panel>,
    );
    const edge = screen.getByRole("group", { name: "Files" }).getBoundingClientRect().width;
    unmount();

    render(
      <Panel title="Files" width={240} collapseTo="header">
        <p>tree</p>
      </Panel>,
    );
    const header = screen.getByRole("group", { name: "Files" }).getBoundingClientRect().width;

    expect(header).toBe(edge);
    expect(screen.getByText("tree")).toBeVisible();
  });
});
