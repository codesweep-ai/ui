import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormGroup } from "./FormGroup";
import { Input } from "./Input";
import { Dropdown } from "./Dropdown";

describe("FormGroup", () => {
  it("renders label above the control", () => {
    render(
      <FormGroup label="Name" htmlFor="name">
        <Input placeholder="name" />
      </FormGroup>,
    );
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("required shows an asterisk and forwards required to control", () => {
    render(
      <FormGroup label="Name" htmlFor="name" required>
        <input id="name" placeholder="name" />
      </FormGroup>,
    );
    expect(screen.getByText("*")).toBeInTheDocument();
    expect((screen.getByPlaceholderText("name") as HTMLInputElement).required).toBe(true);
  });

  it("renders helper text when no error", () => {
    render(
      <FormGroup label="Email" htmlFor="email" helper="We'll never share it">
        <input id="email" placeholder="email" />
      </FormGroup>,
    );
    expect(screen.getByText("We'll never share it")).toBeInTheDocument();
  });

  it("renders error and hides helper when error is set", () => {
    render(
      <FormGroup
        label="Email"
        htmlFor="email"
        helper="Helper text"
        error="Invalid email"
      >
        <input id="email" placeholder="email" />
      </FormGroup>,
    );
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
    expect(screen.queryByText("Helper text")).not.toBeInTheDocument();
  });

  it("error message has role=alert", () => {
    render(
      <FormGroup label="x" htmlFor="x" error="bad">
        <input id="x" />
      </FormGroup>,
    );
    expect(screen.getByRole("alert").textContent).toBe("bad");
  });

  it("auto-generates a stable id when htmlFor is omitted", () => {
    render(
      <FormGroup label="Auto">
        <Input placeholder="auto" />
      </FormGroup>,
    );
    const el = screen.getByPlaceholderText("auto") as HTMLInputElement;
    expect(el.id).toMatch(/^formgroup-/);
  });

  it("forwards aria-describedby pointing at helper", () => {
    render(
      <FormGroup label="x" htmlFor="x" helper="hint">
        <input id="x" placeholder="x" />
      </FormGroup>,
    );
    const input = screen.getByPlaceholderText("x") as HTMLInputElement;
    const helperId = input.getAttribute("aria-describedby");
    expect(helperId).toBeTruthy();
    expect(document.getElementById(helperId!)?.textContent).toBe("hint");
  });

  it("forwards aria-describedby pointing at error (overrides helper)", () => {
    render(
      <FormGroup label="x" htmlFor="x" helper="hint" error="bad">
        <input id="x" placeholder="x" />
      </FormGroup>,
    );
    const input = screen.getByPlaceholderText("x") as HTMLInputElement;
    const errId = input.getAttribute("aria-describedby");
    expect(errId).toBeTruthy();
    expect(document.getElementById(errId!)?.textContent).toBe("bad");
  });

  it("forwards aria-invalid when error is set", () => {
    render(
      <FormGroup label="x" htmlFor="x" error="bad">
        <input id="x" placeholder="x" />
      </FormGroup>,
    );
    expect(screen.getByPlaceholderText("x").getAttribute("aria-invalid")).toBe("true");
  });

  it("an Input in an errored group paints its error border", () => {
    const { container } = render(
      <FormGroup label="x" htmlFor="x" error="bad">
        <Input placeholder="x" />
      </FormGroup>,
    );
    const wrapper = container.querySelector('[data-component="Input"]')!;
    expect(wrapper.className).toContain("cs-component-input-24");
  });

  // Dropdown declares `error` as the message string and renders its own
  // FormGroup when it is set. While FormGroup forwarded a boolean `error`, a
  // Dropdown inside an errored group read `true` as a message, wrapped itself
  // in a second group, and rendered an alert containing nothing.
  it("a Dropdown in an errored group paints its border and nests no second group", () => {
    const { container } = render(
      <FormGroup label="Plan" htmlFor="plan" error="Pick a plan.">
        <Dropdown value="" onChange={() => {}} options={[{ value: "a", label: "A" }]} />
      </FormGroup>,
    );

    expect(container.querySelectorAll('[data-component="FormGroup"]')).toHaveLength(1);

    const alerts = [...container.querySelectorAll('[role="alert"]')];
    expect(alerts).toHaveLength(1);
    expect(alerts[0].textContent).toBe("Pick a plan.");

    const select = container.querySelector("select")!;
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(select.className).toContain("cs-component-dropdown-15");
  });

  it("label's htmlFor is set only when consumer provides htmlFor", () => {
    render(
      <FormGroup label="A" htmlFor="my-id">
        <input id="my-id" />
      </FormGroup>,
    );
    const label = screen.getByText("A").closest("label")!;
    expect(label.htmlFor).toBe("my-id");
  });

  it("label has no htmlFor when consumer omits htmlFor", () => {
    render(
      <FormGroup label="A">
        <Input placeholder="a" />
      </FormGroup>,
    );
    const label = screen.getByText("A").closest("label")!;
    expect(label.htmlFor).toBe("");
  });

  it("merges className on wrapper", () => {
    const { container } = render(
      <FormGroup label="A" className="custom-y">
        <Input placeholder="a" />
      </FormGroup>,
    );
    expect(container.querySelector('[data-component="FormGroup"]')!.className).toContain("custom-y");
  });

  it("has data-component=FormGroup on root", () => {
    const { container } = render(
      <FormGroup label="A">
        <input />
      </FormGroup>,
    );
    expect(container.querySelector('[data-component="FormGroup"]')).toBeInTheDocument();
  });

  it("preserves consumer-supplied id on child (does not overwrite)", () => {
    render(
      <FormGroup label="x" htmlFor="auto-x">
        <input id="my-own-id" placeholder="x" />
      </FormGroup>,
    );
    expect((screen.getByPlaceholderText("x") as HTMLInputElement).id).toBe("my-own-id");
  });

  it("preserves consumer-supplied aria-describedby (does not overwrite)", () => {
    render(
      <FormGroup label="x" htmlFor="x" helper="hint">
        <input id="x" aria-describedby="consumer-desc" placeholder="x" />
      </FormGroup>,
    );
    expect(screen.getByPlaceholderText("x").getAttribute("aria-describedby")).toBe("consumer-desc");
  });
});
