import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { ToastContainer } from "./ToastContainer";
import { toast } from "../lib/toast";

describe("ToastContainer", () => {
  beforeEach(() => {
    toast.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    toast.clear();
  });

  it("renders toasts as they're added (subscribes on mount)", () => {
    render(<ToastContainer />);
    act(() => {
      toast.success("Saved");
    });
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "success");
  });

  it("auto-dismisses after the default 4s duration", () => {
    render(<ToastContainer />);
    act(() => {
      toast.info("hi");
    });
    expect(screen.getByText("hi")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("hi")).not.toBeInTheDocument();
  });

  it("important: true keeps the toast until manually dismissed", () => {
    render(<ToastContainer />);
    act(() => {
      toast.error("Stay", { important: true });
    });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("Stay")).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    });
    expect(screen.queryByText("Stay")).not.toBeInTheDocument();
  });

  it("stacks multiple toasts and the dismiss button removes the right one", () => {
    render(<ToastContainer />);
    act(() => {
      toast.success("first");
      toast.warning("second");
    });
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
    // dismiss the first (status role)
    act(() => {
      fireEvent.click(screen.getByRole("status").querySelector("button")!);
    });
    expect(screen.queryByText("first")).not.toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
  });
});
