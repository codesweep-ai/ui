import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chip } from "./Chip";

describe("Chip browser", () => {
  it("exposes pressed state and requests its inverse", async () => {
    const onPressedChange = vi.fn();
    render(<Chip pressed count={12} onPressedChange={onPressedChange}>Open</Chip>);
    const chip = screen.getByRole("button", { name: "Open 12" });
    expect(chip.querySelector("[data-chip-label]")).toHaveTextContent("Open");
    expect(chip).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(chip);
    expect(onPressedChange).toHaveBeenCalledWith(false);
  });

  it("uses native disabled behavior", async () => {
    const onPressedChange = vi.fn();
    render(<Chip disabled onPressedChange={onPressedChange}>Closed</Chip>);
    const chip = screen.getByRole("button", { name: "Closed" });
    expect(chip).toBeDisabled();
    await userEvent.click(chip);
    expect(onPressedChange).not.toHaveBeenCalled();
  });
});
