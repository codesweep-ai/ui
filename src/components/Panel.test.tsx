import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Panel } from "./Panel";

describe("Panel", () => {
  it("renders title + children + role=group", () => {
    render(<Panel title="My panel">body</Panel>);
    expect(screen.getByText("My panel")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "My panel" })).toBeInTheDocument();
  });

  it("does not put aria-expanded on its group", () => {
    render(<Panel title="t">x</Panel>);
    expect(screen.getByRole("group")).not.toHaveAttribute("aria-expanded");
  });

  it("unmounts children when collapsed", () => {
    render(
      <Panel title="t" collapsed>
        x
      </Panel>,
    );
    expect(screen.getByRole("group")).not.toHaveAttribute("aria-expanded");
    expect(screen.queryByText("x")).not.toBeInTheDocument();
  });

  it("does NOT render collapse button when onCollapse is not provided", () => {
    render(<Panel title="t">x</Panel>);
    expect(screen.queryByRole("button", { name: /collapse|expand/i })).not.toBeInTheDocument();
  });

  it("renders collapse button + fires onCollapse", async () => {
    const onCollapse = vi.fn();
    render(
      <Panel title="My panel" onCollapse={onCollapse}>
        x
      </Panel>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Collapse My panel panel" }),
    );
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it("collapsed: button label switches to 'Expand'", () => {
    render(
      <Panel title="My panel" collapsed onCollapse={() => {}}>
        x
      </Panel>,
    );
    expect(
      screen.getByRole("button", { name: "Expand My panel panel" }),
    ).toBeInTheDocument();
  });

  it("renders actions slot", () => {
    render(
      <Panel title="t" actions={<button>Refresh</button>}>
        x
      </Panel>,
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("accepts a CSS length width", () => {
    render(<Panel title="t" width="22rem">x</Panel>);
    expect(screen.getByRole("group")).toHaveStyle({ width: "22rem" });
  });
});
