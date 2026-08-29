import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renders an anchor and forwards its ref with asChild", () => {
    const ref = createRef<HTMLElement>();
    render(
      <Button asChild ref={ref}>
        <a href="/runs">View runs</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "View runs" })).toHaveAttribute("href", "/runs");
    expect(ref.current).toBe(screen.getByRole("link", { name: "View runs" }));
  });
  it("renders children and data-component", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: "Click me" });
    expect(btn).toHaveAttribute("data-component", "Button");
  });

  it("defaults to type='button' (not 'submit')", () => {
    render(<Button>x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("respects explicit type prop", () => {
    render(<Button type="submit">x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });

  it.each(["primary", "secondary", "danger", "ghost", "success", "warning"] as const)(
    "renders variant=%s without error",
    (variant) => {
      render(<Button variant={variant}>x</Button>);
      expect(screen.getByRole("button")).toBeInTheDocument();
    },
  );

  it.each(["sm", "md"] as const)("renders size=%s without error", (size) => {
    render(<Button size={size}>x</Button>);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("fires onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>x</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire onClick when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        x
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("disabled prop applies disabled attr", () => {
    render(<Button disabled>x</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("merges consumer className", () => {
    render(<Button className="my-extra">x</Button>);
    expect(screen.getByRole("button").className).toContain("my-extra");
  });

  it("forwards arbitrary HTML attrs to the button", () => {
    render(
      <Button aria-label="hidden label" data-testid="btn">
        x
      </Button>,
    );
    expect(screen.getByTestId("btn")).toHaveAttribute("aria-label", "hidden label");
  });
});
