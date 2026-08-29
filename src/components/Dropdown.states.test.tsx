import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dropdown } from "./Dropdown";

describe("Dropdown — empty options state", () => {
  it("renders default 'No options available.' as the sole disabled option when options=[]", () => {
    render(<Dropdown value="" onChange={() => {}} options={[]} />);
    const opt = screen.getByRole("option", { name: "No options available." });
    expect(opt).toBeInTheDocument();
    expect(opt).toBeDisabled();
  });

  it("custom emptyMessage", () => {
    render(
      <Dropdown
        value=""
        onChange={() => {}}
        options={[]}
        emptyMessage="No categories yet"
      />,
    );
    expect(
      screen.getByRole("option", { name: "No categories yet" }),
    ).toBeInTheDocument();
  });

  it("select itself is disabled when options=[]", () => {
    render(<Dropdown value="" onChange={() => {}} options={[]} />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("data-testid='dropdown-empty' set when options empty", () => {
    render(<Dropdown value="" onChange={() => {}} options={[]} />);
    expect(screen.getByTestId("dropdown-empty")).toBeInTheDocument();
  });

  it("data-testid NOT set when options has items", () => {
    render(
      <Dropdown
        value="x"
        onChange={() => {}}
        options={[{ value: "x", label: "X" }]}
      />,
    );
    expect(screen.queryByTestId("dropdown-empty")).not.toBeInTheDocument();
  });

  it("placeholder is IGNORED when options=[]", () => {
    render(
      <Dropdown
        value=""
        onChange={() => {}}
        options={[]}
        placeholder="-- pick --"
      />,
    );
    expect(screen.queryByRole("option", { name: "-- pick --" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "No options available." }),
    ).toBeInTheDocument();
  });
});
