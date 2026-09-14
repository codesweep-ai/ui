import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { FormGroup } from "./FormGroup";
import { Input } from "./Input";
import { Dropdown } from "./Dropdown";
import { CheckboxGroup } from "./CheckboxGroup";
import { useFormGroupField } from "../lib/formGroupField";

const OPTIONS = [{ value: "a", label: "A" }, { value: "b", label: "B" }];

/** The element the message is actually announced through, or null. */
function describedControl(c: HTMLElement): HTMLElement | null {
  const message = c.querySelector('[id$="-helper"], [id$="-error"]');
  if (!message) return null;
  for (const el of c.querySelectorAll<HTMLElement>("[aria-describedby]"))
    if (el.getAttribute("aria-describedby")?.split(/\s+/).includes(message.id)) return el;
  return null;
}

describe("FormGroup wiring", () => {
  it("describes a Dropdown's helper through the select, not the wrapper it sits in", () => {
    const { container } = render(
      <Dropdown label="Plan" helper="Switch any time" options={OPTIONS} value="a" onChange={() => {}} />,
    );

    expect(describedControl(container)?.tagName).toBe("SELECT");
  });

  it("keeps required off Dropdown's wrapper, where it is not a valid attribute", () => {
    const { container } = render(
      <Dropdown label="Plan" required options={OPTIONS} value="a" onChange={() => {}} />,
    );

    const required = [...container.querySelectorAll("[required]")].map((e) => e.tagName);
    expect(required).toEqual(["SELECT"]);
    expect(container.querySelector("div[aria-invalid]")).toBeNull();
  });

  it("describes a CheckboxGroup's error through a real group", () => {
    const { container } = render(
      <CheckboxGroup label="Regions" error="Pick at least one" options={OPTIONS}
        selected={new Set<string>()} onChange={() => {}} />,
    );
    const described = describedControl(container);

    expect(described?.getAttribute("role")).toBe("group");
    expect(described?.getAttribute("aria-label")).toBe("Regions");
    expect(described?.getAttribute("aria-invalid")).toBe("true");
  });

  it("wires an element the author has declared a group", () => {
    const { container } = render(
      <FormGroup label="Regions" helper="Pick one">
        <div role="group" aria-label="Regions" />
      </FormGroup>,
    );

    expect(describedControl(container)?.getAttribute("role")).toBe("group");
  });

  it("leaves a plain wrapper alone rather than describing a message to it", () => {
    // The defect this replaced: any single element child was cloned, so the
    // message was referenced by something that cannot announce it.
    const { container } = render(
      <FormGroup label="Email" helper="never shared">
        <div data-testid="wrapper"><input /></div>
      </FormGroup>,
    );

    expect(screen.getByTestId("wrapper")).not.toHaveAttribute("aria-describedby");
    expect(describedControl(container)).toBeNull();
  });

  it("still wires a bare native control, which is the common case", () => {
    const { container } = render(
      <FormGroup label="Email" htmlFor="email" required helper="never shared">
        <input id="email" />
      </FormGroup>,
    );
    const input = container.querySelector("input")!;

    expect(describedControl(container)).toBe(input);
    expect(input).toBeRequired();
  });

  it("wires an Input, which renders a wrapper of its own, through the context", () => {
    const { container } = render(
      <FormGroup label="Email" error="Required"><Input /></FormGroup>,
    );
    const input = container.querySelector("input")!;

    expect(describedControl(container)).toBe(input);
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("hands a consumer's own control the same wiring", () => {
    function CustomField() {
      const field = useFormGroupField();
      return (
        <div className="wrapper">
          <input
            id={field?.controlId}
            aria-describedby={field?.describedBy}
            aria-invalid={field?.invalid || undefined}
            required={field?.required || undefined}
          />
        </div>
      );
    }
    const { container } = render(
      <FormGroup label="Email" htmlFor="email" required error="Required"><CustomField /></FormGroup>,
    );
    const input = container.querySelector("input")!;

    expect(describedControl(container)).toBe(input);
    expect(input.id).toBe("email");
    expect(input).toBeRequired();
  });

  it("gives a control outside any FormGroup nothing to read", () => {
    let seen: unknown = "unset";
    function Probe() {
      seen = useFormGroupField();
      return null;
    }
    render(<Probe />);

    expect(seen).toBeNull();
  });
});
