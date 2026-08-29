import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card — loading state", () => {
  it("loading=true replaces body with skeleton lines (with header)", () => {
    render(
      <Card header="My header" loading>
        actual body
      </Card>,
    );
    expect(screen.getByText("My header")).toBeInTheDocument();
    expect(screen.queryByText("actual body")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-loading")).toBeInTheDocument();
  });

  it("loading=true on header-less card still renders skeleton inside padded body", () => {
    render(<Card loading>actual body</Card>);
    expect(screen.queryByText("actual body")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-loading")).toBeInTheDocument();
  });

  it("skeleton has 3 lines of varying widths", () => {
    render(<Card loading>x</Card>);
    expect(screen.getAllByLabelText("Loading")).toHaveLength(3);
  });

  it("loading=false renders children normally", () => {
    render(<Card>real body</Card>);
    expect(screen.getByText("real body")).toBeInTheDocument();
    expect(screen.queryByTestId("card-loading")).not.toBeInTheDocument();
  });
});
