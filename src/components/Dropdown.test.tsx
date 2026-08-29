import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dropdown } from "./Dropdown";

const opts = [
  { value: "x", label: "Ex" },
  { value: "y", label: "Why" },
  { value: "z", label: "Zee", disabled: true },
];

describe("Dropdown", () => {
  it("renders a select with all options", () => {
    render(<Dropdown value="x" onChange={() => {}} options={opts} />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ex" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Why" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Zee" })).toBeInTheDocument();
  });

  it("respects controlled value prop", () => {
    render(<Dropdown value="y" onChange={() => {}} options={opts} />);
    expect(screen.getByRole("combobox")).toHaveValue("y");
  });

  it("calls onChange with the selected value", async () => {
    const onChange = vi.fn();
    render(<Dropdown value="x" onChange={onChange} options={opts} />);
    await userEvent.selectOptions(screen.getByRole("combobox"), "y");
    expect(onChange).toHaveBeenCalledWith("y");
  });

  it("renders placeholder option when placeholder provided", () => {
    render(
      <Dropdown
        value=""
        onChange={() => {}}
        options={opts}
        placeholder="-- pick one --"
      />,
    );
    const placeholder = screen.getByRole("option", { name: "-- pick one --" });
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toBeDisabled();
  });

  it("disabled prop disables the select", () => {
    render(<Dropdown value="x" onChange={() => {}} options={opts} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("per-option disabled is respected", () => {
    render(<Dropdown value="x" onChange={() => {}} options={opts} />);
    expect(screen.getByRole("option", { name: "Zee" })).toBeDisabled();
    expect(screen.getByRole("option", { name: "Ex" })).not.toBeDisabled();
  });

  it("renders data-component on the wrapper", () => {
    const { container } = render(
      <Dropdown value="x" onChange={() => {}} options={opts} />,
    );
    expect(container.querySelector('[data-component="Dropdown"]')).not.toBeNull();
  });

  it("generates an id and binds its visible label", () => {
    render(<Dropdown label="Choice" value="x" onChange={() => {}} options={opts} />);
    const select = screen.getByRole("combobox", { name: "Choice" });
    expect(select.id).not.toBe("");
    expect(screen.getByText("Choice")).toHaveAttribute("for", select.id);
  });

  it("spreads select props including aria-label", () => {
    render(<Dropdown aria-label="Sort order" data-extra="yes" value="x" onChange={() => {}} options={opts} />);
    expect(screen.getByRole("combobox", { name: "Sort order" })).toHaveAttribute("data-extra", "yes");
  });
});
