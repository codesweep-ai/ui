import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./ThemeToggle";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeToggle — icon-cycle variant (default)", () => {
  it("renders a single button with the current mode in the aria-label", () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-component", "ThemeToggle");
    expect(btn.getAttribute("aria-label")).toMatch(/Current: (light|dark|system)/);
  });

  it("clicking cycles mode and persists to localStorage", async () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole("button");
    const initial = btn.getAttribute("aria-label");
    await userEvent.click(btn);
    const next = screen.getByRole("button").getAttribute("aria-label");
    expect(next).not.toEqual(initial);
    expect(localStorage.getItem("cs-theme")).toMatch(/^(light|dark|system)$/);
  });

  it("clicking writes data-theme to <html>", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme")).toMatch(/^(light|dark)$/);
  });
});

describe("ThemeToggle — radio-group variant", () => {
  it("renders three radio buttons (Light, Dark, System)", () => {
    render(<ThemeToggle variant="radio-group" />);
    expect(screen.getByRole("radio", { name: /^Light$/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^Dark$/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^System/ })).toBeInTheDocument();
  });

  it("selecting Dark marks it aria-checked and updates data-theme", async () => {
    render(<ThemeToggle variant="radio-group" />);
    await userEvent.click(screen.getByRole("radio", { name: /^Dark$/ }));
    expect(screen.getByRole("radio", { name: /^Dark$/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("cs-theme")).toBe("dark");
  });

  it("group has role=radiogroup with aria-label", () => {
    render(<ThemeToggle variant="radio-group" />);
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
  });
});
