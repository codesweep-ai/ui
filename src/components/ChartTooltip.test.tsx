import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChartTooltip } from "./ChartTooltip";

describe("ChartTooltip", () => {
  it("renders children when visible", () => {
    render(
      <ChartTooltip x={10} y={20}>
        <div>auth: 412</div>
      </ChartTooltip>,
    );
    expect(screen.getByText("auth: 412")).toBeInTheDocument();
  });

  it("renders nothing when visible=false", () => {
    const { container } = render(
      <ChartTooltip x={10} y={20} visible={false}>
        <div>hidden</div>
      </ChartTooltip>,
    );
    expect(container.querySelector('[data-component="ChartTooltip"]')).not.toBeInTheDocument();
  });

  it("has role=tooltip", () => {
    render(
      <ChartTooltip x={0} y={0}>
        x
      </ChartTooltip>,
    );
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("positions via left/top inline style", () => {
    render(
      <ChartTooltip x={120} y={48}>
        x
      </ChartTooltip>,
    );
    const el = screen.getByRole("tooltip");
    expect(el.style.left).toBe("120px");
    expect(el.style.top).toBe("48px");
  });

  it("default anchor 'top' centers horizontally above the point", () => {
    render(
      <ChartTooltip x={0} y={0}>
        x
      </ChartTooltip>,
    );
    expect(screen.getByRole("tooltip").style.transform).toContain("-50%");
  });

  it("anchor 'right' offsets to the right", () => {
    render(
      <ChartTooltip x={0} y={0} anchor="right">
        x
      </ChartTooltip>,
    );
    expect(screen.getByRole("tooltip").style.transform).toContain("8px");
  });

  it("merges className", () => {
    render(
      <ChartTooltip x={0} y={0} className="custom-tt">
        x
      </ChartTooltip>,
    );
    expect(screen.getByRole("tooltip").className).toContain("custom-tt");
  });

  it("data-component=ChartTooltip", () => {
    const { container } = render(
      <ChartTooltip x={0} y={0}>
        x
      </ChartTooltip>,
    );
    expect(container.querySelector('[data-component="ChartTooltip"]')).toBeInTheDocument();
  });
});
