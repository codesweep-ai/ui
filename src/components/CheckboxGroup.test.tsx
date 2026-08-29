import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckboxGroup, type CheckboxOption } from "./CheckboxGroup";

const flat: CheckboxOption[] = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
];

const grouped: CheckboxOption[] = [
  { value: "a", label: "Alpha", group: "G1" },
  { value: "b", label: "Beta", group: "G1" },
  { value: "c", label: "Gamma", group: "G2" },
];

describe("CheckboxGroup — flat layout", () => {
  it("renders all option labels", () => {
    render(<CheckboxGroup options={flat} selected={new Set()} onChange={() => {}} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("renders the group label when provided", () => {
    render(
      <CheckboxGroup
        options={flat}
        selected={new Set()}
        onChange={() => {}}
        label="Filters"
      />,
    );
    expect(screen.getByText("Filters")).toBeInTheDocument();
  });

  it("toggling a checkbox calls onChange with the new selected Set", async () => {
    const onChange = vi.fn();
    render(<CheckboxGroup options={flat} selected={new Set()} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Alpha"));
    expect(onChange).toHaveBeenCalledWith(new Set(["a"]));
  });

  it("All button selects all visible options", async () => {
    const onChange = vi.fn();
    render(<CheckboxGroup options={flat} selected={new Set()} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(onChange).toHaveBeenCalledWith(new Set(["a", "b", "c"]));
  });

  it("None button deselects all visible options", async () => {
    const onChange = vi.fn();
    render(
      <CheckboxGroup
        options={flat}
        selected={new Set(["a", "b", "c"])}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "None" }));
    expect(onChange).toHaveBeenCalledWith(new Set());
  });

  it("All button is disabled when all already selected", () => {
    render(
      <CheckboxGroup
        options={flat}
        selected={new Set(["a", "b", "c"])}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "All" })).toBeDisabled();
  });

  it("None button is disabled when none selected", () => {
    render(<CheckboxGroup options={flat} selected={new Set()} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "None" })).toBeDisabled();
  });
});

describe("CheckboxGroup — filterable", () => {
  it("filter input appears only when filterable=true", () => {
    const { rerender } = render(
      <CheckboxGroup options={flat} selected={new Set()} onChange={() => {}} />,
    );
    expect(screen.queryByPlaceholderText("Filter...")).not.toBeInTheDocument();

    rerender(
      <CheckboxGroup
        options={flat}
        selected={new Set()}
        onChange={() => {}}
        filterable
      />,
    );
    expect(screen.getByPlaceholderText("Filter...")).toBeInTheDocument();
  });

  it("filtering narrows visible options", async () => {
    render(
      <CheckboxGroup
        options={flat}
        selected={new Set()}
        onChange={() => {}}
        filterable
      />,
    );
    await userEvent.type(screen.getByPlaceholderText("Filter..."), "alp");
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument();
  });

  it("filter with no matches renders 'No matches' fallback", async () => {
    render(
      <CheckboxGroup
        options={flat}
        selected={new Set()}
        onChange={() => {}}
        filterable
      />,
    );
    await userEvent.type(screen.getByPlaceholderText("Filter..."), "zzzz");
    expect(screen.getByText("No matches")).toBeInTheDocument();
  });

  it("clear-filter button appears when filter has value + clears it", async () => {
    render(
      <CheckboxGroup
        options={flat}
        selected={new Set()}
        onChange={() => {}}
        filterable
      />,
    );
    const input = screen.getByPlaceholderText("Filter...");
    await userEvent.type(input, "alp");
    const clear = screen.getByRole("button", { name: "Clear filter" });
    await userEvent.click(clear);
    expect(input).toHaveValue("");
  });
});

describe("CheckboxGroup — grouped layout", () => {
  it("renders section headers when any option has a group", () => {
    render(<CheckboxGroup options={grouped} selected={new Set()} onChange={() => {}} />);
    expect(screen.getByText("G1")).toBeInTheDocument();
    expect(screen.getByText("G2")).toBeInTheDocument();
  });

  it("section header click collapses the section", async () => {
    render(<CheckboxGroup options={grouped} selected={new Set()} onChange={() => {}} />);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /G1\s*0\/2/ }));
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    // G2 stays expanded
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("Expand all / Collapse all toggles all sections", async () => {
    render(<CheckboxGroup options={grouped} selected={new Set()} onChange={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });
});

describe("CheckboxGroup — disabled state", () => {
  it("disabled prop applies the disabled root style", () => {
    const { container } = render(
      <CheckboxGroup options={flat} selected={new Set()} onChange={() => {}} disabled />,
    );
    const root = container.querySelector('[data-component="CheckboxGroup"]');
    expect(root?.className).toContain("cs-component-checkbox-group-41");
  });
});
