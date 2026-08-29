import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Legend, type LegendItem } from "./Legend";

const items: LegendItem[] = [
  { id: "llm", label: "LLM", color: "--color-cat-1" },
  { id: "tool", label: "Tool", color: "--color-cat-3" },
];

function InteractiveLegend() {
  const [selected, setSelected] = useState(new Set(items.map((item) => item.id)));
  return <Legend items={items} selected={selected} onChange={setSelected} extras={<span>2 kinds</span>} />;
}

describe("Legend browser", () => {
  it("renders static swatches without buttons", () => {
    const { container } = render(<Legend items={items} />);
    expect(screen.getByText("LLM")).toBeInTheDocument();
    expect(screen.getByText("LLM")).toHaveAttribute("data-legend-label", "llm");
    expect(container.querySelector('[data-legend-swatch="llm"]')).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect((container.querySelector('[aria-hidden="true"]') as HTMLElement).style.backgroundColor).toBe("var(--color-cat-1)");
  });

  it("toggles aria-pressed items and renders extras", async () => {
    render(<InteractiveLegend />);
    const llm = screen.getByRole("button", { name: "LLM" });
    expect(llm.querySelector('[data-legend-label="llm"]')).toBeInTheDocument();
    expect(llm.querySelector('[data-legend-swatch="llm"]')).toBeInTheDocument();
    expect(llm).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(llm);
    expect(llm).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("2 kinds")).toBeInTheDocument();
  });
});
