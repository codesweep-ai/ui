import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PulseBadge } from "./PulseBadge";

describe("PulseBadge", () => {
  it("renders with default 'Live activity' aria-label", () => {
    render(<PulseBadge />);
    expect(screen.getByLabelText("Live activity")).toBeInTheDocument();
  });

  it("custom aria-label", () => {
    render(<PulseBadge aria-label="Searching" />);
    expect(screen.getByLabelText("Searching")).toBeInTheDocument();
  });

  it("applies cs-pulse class by default", () => {
    render(<PulseBadge />);
    expect(screen.getByLabelText("Live activity").className).toMatch(/cs-pulse/);
  });

  it("paused removes the animation class", () => {
    render(<PulseBadge paused />);
    expect(screen.getByLabelText("Live activity").className).not.toMatch(/cs-pulse/);
  });

  it("size sm applies smaller class", () => {
    render(<PulseBadge size="sm" />);
    expect(screen.getByLabelText("Live activity").className).toContain("cs-component-pulse-badge-9");
  });

  it("size lg applies larger class", () => {
    render(<PulseBadge size="lg" />);
    expect(screen.getByLabelText("Live activity").className).toContain("cs-component-pulse-badge-11");
  });

  it("custom color is applied via inline style", () => {
    render(<PulseBadge color="red" />);
    expect(screen.getByLabelText("Live activity").getAttribute("style")).toContain(
      "background: red",
    );
  });

  it("default color is the current accent token", () => {
    render(<PulseBadge />);
    expect(screen.getByLabelText("Live activity").getAttribute("style")).toContain(
      "var(--color-accent)",
    );
  });

  it("merges className", () => {
    render(<PulseBadge className="my-extra-class" />);
    expect(screen.getByLabelText("Live activity").className).toContain("my-extra-class");
  });

  it("has data-component='PulseBadge'", () => {
    const { container } = render(<PulseBadge />);
    expect(container.querySelector('[data-component="PulseBadge"]')).toBeInTheDocument();
  });
});
