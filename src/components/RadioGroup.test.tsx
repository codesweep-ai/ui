import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioGroup, type RadioOption } from "./RadioGroup";

const options: RadioOption[] = [
  { value: "light", label: "Lightweight", description: "166,136 B raw" },
  { value: "diagrams", label: "Diagrams" },
  { value: "highlight", label: "Highlighting" },
  { value: "rich", label: "Full parser" },
  { value: "plugins", label: "Plugins" },
  { value: "off", label: "Unavailable", disabled: true },
];

function Example({ initial = "light" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return <RadioGroup aria-label="Parser" options={options} value={value} onChange={setValue} />;
}

describe("RadioGroup", () => {
  it("renders an exclusive named radiogroup with its documented hooks", () => {
    render(<Example />);
    const group = screen.getByRole("radiogroup", { name: "Parser" });
    expect(group).toHaveAttribute("data-component", "RadioGroup");
    expect(group).toHaveAttribute("data-radio-orientation", "vertical");

    const selected = screen.getByRole("radio", { name: /Lightweight/ });
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(selected).toHaveAttribute("data-radio-option", "light");
    expect(selected).toHaveAttribute("data-radio-active", "");
    expect(screen.getByRole("radio", { name: "Diagrams" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: "Unavailable" })).toBeDisabled();
  });

  it("takes more options than SegmentedControl allows", () => {
    render(<Example />);
    // The reason this component exists: SegmentedControl throws above five.
    expect(screen.getAllByRole("radio")).toHaveLength(6);
  });

  it("renders a description under the label", () => {
    render(<Example />);
    const description = screen
      .getByRole("radio", { name: /Lightweight/ })
      .querySelector("[data-radio-description]");
    expect(description).toHaveTextContent("166,136 B raw");
  });

  it("exposes a single tab stop, on the selected option", () => {
    render(<Example initial="rich" />);
    expect(screen.getByRole("radio", { name: "Full parser" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: /Lightweight/ })).toHaveAttribute("tabindex", "-1");
  });

  it("moves and selects with the arrow keys, skipping disabled options", async () => {
    render(<Example initial="plugins" />);
    await userEvent.click(screen.getByRole("radio", { name: "Plugins" }));
    // "Unavailable" is disabled, so ArrowDown wraps past it to the first option.
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /Lightweight/ })).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: "Plugins" })).toHaveAttribute("aria-checked", "true");
  });

  it("jumps to the first and last enabled option with Home and End", async () => {
    render(<Example />);
    await userEvent.click(screen.getByRole("radio", { name: "Diagrams" }));
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Plugins" })).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: /Lightweight/ })).toHaveAttribute("aria-checked", "true");
  });

  it("throws below two options rather than rendering a meaningless group", () => {
    expect(() =>
      render(
        <RadioGroup
          aria-label="One"
          value="only"
          onChange={() => {}}
          options={[{ value: "only", label: "Only" }]}
        />,
      ),
    ).toThrow(/at least 2 options/);
  });
});
