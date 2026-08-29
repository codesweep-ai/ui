import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl, type SegmentedControlOption } from "./SegmentedControl";

const options: SegmentedControlOption[] = [
  { value: "rendered", label: "Rendered" },
  { value: "raw", label: "Raw" },
  { value: "disabled", label: "Disabled", disabled: true },
];

function Example() {
  const [value, setValue] = useState("rendered");
  return <SegmentedControl aria-label="Content view" options={options} value={value} onChange={setValue} />;
}

describe("SegmentedControl browser", () => {
  it("renders an exclusive named radiogroup", () => {
    render(<Example />);
    expect(screen.getByRole("radiogroup", { name: "Content view" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Rendered" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Rendered" })).toHaveAttribute("data-segmented-option", "rendered");
    expect(screen.getByRole("radio", { name: "Rendered" })).toHaveAttribute("data-segmented-active", "");
    expect(screen.getByRole("radio", { name: "Raw" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Disabled" })).toBeDisabled();
  });

  it("selects with click and arrow keys while skipping disabled options", async () => {
    render(<Example />);
    const rendered = screen.getByRole("radio", { name: "Rendered" });
    const raw = screen.getByRole("radio", { name: "Raw" });
    await userEvent.click(raw);
    expect(raw).toHaveAttribute("aria-checked", "true");
    expect(raw).toHaveAttribute("data-segmented-active", "");
    expect(rendered).not.toHaveAttribute("data-segmented-active");
    raw.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(rendered).toHaveAttribute("aria-checked", "true");
    expect(document.activeElement).toBe(rendered);
  });
});
