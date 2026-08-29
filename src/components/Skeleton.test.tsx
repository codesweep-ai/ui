import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("renders with default text variant + 100% width + 1em height", () => {
    render(<Skeleton />);
    const el = screen.getByLabelText("Loading");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("data-component", "Skeleton");
    expect(el).toHaveAttribute("role", "status");
    expect(el).toHaveAttribute("aria-busy", "true");
    expect(el).toHaveStyle({ width: "100%", height: "1em" });
  });

  it("converts numeric width/height to px", () => {
    render(<Skeleton width={120} height={20} />);
    const el = screen.getByLabelText("Loading");
    expect(el).toHaveStyle({ width: "120px", height: "20px" });
  });

  it("accepts string width/height as-is", () => {
    render(<Skeleton width="50%" height="2rem" />);
    const el = screen.getByLabelText("Loading");
    expect(el).toHaveStyle({ width: "50%", height: "2rem" });
  });

  it("circle variant gets 50% border-radius and the modifier class", () => {
    render(<Skeleton variant="circle" width={40} height={40} />);
    const el = screen.getByLabelText("Loading");
    expect(el).toHaveStyle({ borderRadius: "50%" });
    expect(el.className).toContain("cs-skeleton--circle");
  });

  it("rect variant defaults height to 100%", () => {
    render(<Skeleton variant="rect" />);
    const el = screen.getByLabelText("Loading");
    expect(el).toHaveStyle({ height: "100%" });
  });

  it("merges consumer className", () => {
    render(<Skeleton className="my-custom-class" />);
    const el = screen.getByLabelText("Loading");
    expect(el.className).toContain("my-custom-class");
    expect(el.className).toContain("cs-skeleton");
  });
});
