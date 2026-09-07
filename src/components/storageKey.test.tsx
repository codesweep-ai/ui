import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook } from "@testing-library/react";

import { useTheme } from "../lib/useTheme";
import { ThemeToggle } from "./ThemeToggle";
import { SplitPane } from "./SplitPane";

// DESIGN_SYSTEM_SPEC.md §7.3 says a storage failure degrades to in-memory
// rather than throwing. Private browsing and a full quota both throw from
// getItem and setItem, and a component that lets that escape takes a page down
// over a remembered pane width. Every component that takes `storageKey` is
// held to it here, because the convention was documented and never checked.
const KEY = "cs-test-arrangement";

function breakStorage() {
  const boom = () => {
    throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
  };
  const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(boom);
  const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(boom);
  return { getItem, setItem };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("data-theme");
});

describe("storageKey degrades to in-memory when storage throws", () => {
  it("keeps useTheme switching modes", () => {
    const spies = breakStorage();
    const { result } = renderHook(() => useTheme({ storageKey: KEY, urlParam: false }));

    act(() => result.current.setMode("dark"));

    expect(result.current.mode).toBe("dark");
    expect(result.current.resolved).toBe("dark");
    expect(spies.setItem).toHaveBeenCalled();
  });

  it("keeps ThemeToggle usable", async () => {
    breakStorage();
    // The radio variant so the assertion does not depend on where the cycle
    // starts: "system" resolves to light here, so cycling to light changes
    // nothing observable.
    render(<ThemeToggle variant="radio-group" storageKey={KEY} urlParam={false} />);

    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(screen.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("keeps SplitPane rendering its panes", () => {
    breakStorage();
    render(
      <SplitPane
        panes={[
          { id: "side", defaultWidth: 260, storageKey: KEY, children: <p>side</p> },
          { id: "main", children: <p>main</p> },
        ]}
      />,
    );

    expect(screen.getByText("side")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
  });
});
