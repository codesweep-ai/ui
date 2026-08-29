import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toast } from "./Toast";
import type { ToastItem, ToastVariant } from "../lib/toast";

const make = (variant: ToastVariant, message = "msg"): ToastItem => ({
  id: "t1",
  variant,
  message,
  duration: 4000,
  important: false,
});

describe("Toast", () => {
  it("renders the message and the dismiss button", () => {
    const onDismiss = vi.fn();
    render(<Toast item={make("success", "Saved")} onDismiss={onDismiss} />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument();
  });

  it.each([
    ["success", "status", "polite"],
    ["info", "status", "polite"],
    ["warning", "alert", "assertive"],
    ["error", "alert", "assertive"],
  ] as const)("variant %s → role=%s aria-live=%s", (variant, role, live) => {
    render(<Toast item={make(variant)} onDismiss={() => {}} />);
    const node = screen.getByRole(role);
    expect(node).toHaveAttribute("aria-live", live);
    expect(node).toHaveAttribute("data-variant", variant);
  });

  it("clicking dismiss calls onDismiss", () => {
    const onDismiss = vi.fn();
    render(<Toast item={make("info")} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
