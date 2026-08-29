import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders label and exposes status via aria-label", () => {
    render(<StatusBadge label="Healthy" status="success" />);
    const el = screen.getByText("Healthy");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("data-status-badge-label", "");
    const root = el.closest('[data-component="StatusBadge"]');
    expect(root).toHaveAttribute("aria-label", "Healthy: success");
    expect(root).toHaveAttribute("role", "img");
  });

  it("only becomes a polite live region when announce is set", () => {
    render(<StatusBadge label="Deploying" status="info" announce />);
    const root = screen.getByText("Deploying").closest('[data-component="StatusBadge"]');
    expect(root).toHaveAttribute("role", "status");
    expect(root).toHaveAttribute("aria-live", "polite");
  });

  it.each(["success", "info", "warning", "error", "severe", "neutral"] as const)(
    "renders status=%s",
    (status) => {
      render(<StatusBadge label="x" status={status} />);
      expect(screen.getByText("x")).toBeInTheDocument();
    },
  );

  it("full=true applies the full-width style", () => {
    render(<StatusBadge label="x" status="neutral" full />);
    const root = screen.getByText("x").closest('[data-component="StatusBadge"]');
    expect(root?.className).toContain("cs-component-status-badge-18");
  });

  it("dot is decorative (aria-hidden)", () => {
    const { container } = render(<StatusBadge label="x" status="error" />);
    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).not.toBeNull();
  });

  it("merges consumer className", () => {
    render(<StatusBadge label="x" status="neutral" className="custom-x" />);
    const root = screen.getByText("x").closest('[data-component="StatusBadge"]');
    expect(root?.className).toContain("custom-x");
  });

  it("supports custom colour, sizes, and ring emphasis", () => {
    render(<StatusBadge label="critical" status="severe" color="rebeccapurple" size="lg" emphasis="ring" />);
    const root = screen.getByText("critical").closest('[data-component="StatusBadge"]')!;
    expect((root as HTMLElement).style.getPropertyValue("--status-badge-color")).toBe("rebeccapurple");
    expect(root.className).toContain("status-badge-23");
    expect(root.className).toContain("status-badge-24");
  });

  it.each([
    ["error", "var(--color-error-text)"],
    ["severe", "var(--color-severe)"],
  ] as const)("uses the accessible %s label token with label emphasis", (status, token) => {
    render(<StatusBadge label={status} status={status} emphasis="label" />);
    const root = screen.getByText(status).closest('[data-component="StatusBadge"]') as HTMLElement;
    expect(root.className).toContain("status-badge-25");
    expect(root.style.getPropertyValue("--status-badge-label-color")).toBe(token);
  });

  it("keeps lower-severity label emphasis muted", () => {
    render(<StatusBadge label="warning" status="warning" emphasis="label" />);
    const root = screen.getByText("warning").closest('[data-component="StatusBadge"]') as HTMLElement;
    expect(root.style.getPropertyValue("--status-badge-label-color")).toBe("var(--muted)");
  });
});
