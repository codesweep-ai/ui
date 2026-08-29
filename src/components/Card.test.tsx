import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Card } from "./Card";
import { CardGroup } from "./CardGroup";

describe("Card — standalone", () => {
  it("renders children + data-component", () => {
    render(<Card>body</Card>);
    expect(screen.getByText("body")).toBeInTheDocument();
    expect(screen.getByText("body").closest('[data-component="Card"]')).not.toBeNull();
  });

  it("renders header when provided", () => {
    render(<Card header="My header">body</Card>);
    expect(screen.getByText("My header")).toBeInTheDocument();
    expect(screen.getByText("My header").closest("[data-card-header]")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it.each(["default", "muted", "success", "warning", "danger", "tight"] as const)(
    "renders variant=%s without error",
    (variant) => {
      render(<Card variant={variant}>x</Card>);
      expect(screen.getByText("x")).toBeInTheDocument();
    },
  );

  it("merges consumer className", () => {
    const { container } = render(<Card className="custom-cls">x</Card>);
    expect(container.querySelector('[data-component="Card"]')?.className).toContain(
      "custom-cls",
    );
  });

  it("does NOT render the maximize button outside a CardGroup", () => {
    render(
      <Card header="h" id="a" maximizable>
        body
      </Card>,
    );
    expect(screen.queryByRole("button", { name: /maximize/i })).not.toBeInTheDocument();
  });

  it("passes id, element type, and rest props to the root", () => {
    render(<Card as="article" id="record-a" data-kind="record">body</Card>);
    const root = screen.getByText("body").closest("article");
    expect(root).toHaveAttribute("id", "record-a");
    expect(root).toHaveAttribute("data-kind", "record");
  });

  it("activates an interactive card with click, Enter, and Space", async () => {
    const onActivate = vi.fn();
    render(<Card interactive onActivate={onActivate}>body</Card>);
    const card = screen.getByRole("button", { name: "body" });
    await userEvent.click(card);
    card.focus();
    await userEvent.keyboard("{Enter} ");
    expect(onActivate).toHaveBeenCalledTimes(3);
  });

  it("collapses content and exposes aria-expanded on its toggle", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<Card header="Details" collapsible collapsed={false} onToggle={onToggle}>body</Card>);
    const toggle = screen.getByRole("button", { name: "Collapse" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<Card header="Details" collapsible collapsed onToggle={onToggle}>body</Card>);
    expect(screen.queryByText("body")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand" })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Card — inside CardGroup (maximize behavior)", () => {
  it("renders a self-describing solo button when maximizable + id, inside group", () => {
    render(
      <CardGroup>
        <Card header="h" id="a" maximizable>
          body
        </Card>
      </CardGroup>,
    );
    expect(screen.getByRole("button", { name: "Show only this card" })).toBeInTheDocument();
  });

  it("clicking the maximize button toggles to Minimize", async () => {
    render(
      <CardGroup>
        <Card header="h" id="a" maximizable>
          body
        </Card>
      </CardGroup>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show only this card" }));
    expect(screen.getByRole("button", { name: "Show all cards" })).toBeInTheDocument();
  });

  it("hides sibling cards when one is maximized", async () => {
    const { container } = render(
      <CardGroup>
        <Card header="A" id="a" maximizable>
          A body
        </Card>
        <Card header="B" id="b" maximizable>
          B body
        </Card>
      </CardGroup>,
    );
    // both visible initially
    expect(screen.getByText("A body")).toBeInTheDocument();
    expect(screen.getByText("B body")).toBeInTheDocument();

    // solo A — the first such button in DOM order belongs to card A
    const maximizeButtons = screen.getAllByRole("button", { name: "Show only this card" });
    await userEvent.click(maximizeButtons[0]);

    // B is hidden via .hidden class
    expect(screen.queryByText("B body")).not.toBeInTheDocument();
    // and an empty placeholder is rendered for B
    expect(
      container.querySelectorAll('[data-component="Card"]'),
    ).toHaveLength(2);
  });

  it("controlled mode: emits onMaximizedChange and respects maximizedId prop", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <CardGroup maximizedId={null} onMaximizedChange={onChange}>
        <Card header="h" id="a" maximizable>
          body
        </Card>
      </CardGroup>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Show only this card" }));
    expect(onChange).toHaveBeenCalledWith("a");

    // Parent flips the prop
    rerender(
      <CardGroup maximizedId="a" onMaximizedChange={onChange}>
        <Card header="h" id="a" maximizable>
          body
        </Card>
      </CardGroup>,
    );
    expect(screen.getByRole("button", { name: "Show all cards" })).toBeInTheDocument();
  });
});
