import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { themeBootScript, useTheme } from "./useTheme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

function Probe() {
  const { mode, resolved, setMode, cycle } = useTheme();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={() => setMode("dark")}>dark</button>
      <button onClick={() => setMode("light")}>light</button>
      <button onClick={() => setMode("system")}>system</button>
      <button onClick={cycle}>cycle</button>
    </div>
  );
}

describe("useTheme", () => {
  it("defaults to 'system' mode when nothing stored", () => {
    render(<Probe />);
    expect(screen.getByTestId("mode").textContent).toBe("system");
  });

  it("reads stored mode from localStorage on mount", () => {
    localStorage.setItem("cs-theme", "dark");
    render(<Probe />);
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });

  it("setMode updates mode, persists to localStorage, and writes data-theme to <html>", async () => {
    render(<Probe />);
    await userEvent.click(screen.getByText("dark"));
    expect(screen.getByTestId("mode").textContent).toBe("dark");
    expect(localStorage.getItem("cs-theme")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("resolved is identical to mode for 'light' and 'dark'", async () => {
    render(<Probe />);
    await userEvent.click(screen.getByText("dark"));
    expect(screen.getByTestId("resolved").textContent).toBe("dark");
    await userEvent.click(screen.getByText("light"));
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });

  it("system mode resolves via matchMedia (mocked to matches=false → light)", async () => {
    render(<Probe />);
    // Default mode is already 'system'; click the button anyway to exercise the path
    await userEvent.click(screen.getByRole("button", { name: "system" }));
    expect(screen.getByTestId("mode").textContent).toBe("system");
    // setup.ts's matchMedia mock returns matches=false → 'light'
    expect(screen.getByTestId("resolved").textContent).toBe("light");
  });

  it("cycle goes system → light → dark → system", async () => {
    render(<Probe />);
    // start at system (default)
    expect(screen.getByTestId("mode").textContent).toBe("system");
    await userEvent.click(screen.getByText("cycle"));
    expect(screen.getByTestId("mode").textContent).toBe("light");
    await userEvent.click(screen.getByText("cycle"));
    expect(screen.getByTestId("mode").textContent).toBe("dark");
    await userEvent.click(screen.getByText("cycle"));
    expect(screen.getByTestId("mode").textContent).toBe("system");
  });

  it("invalid stored value falls back to 'system'", () => {
    localStorage.setItem("cs-theme", "puce");
    render(<Probe />);
    expect(screen.getByTestId("mode").textContent).toBe("system");
  });

  it("handles localStorage throwing on getItem (falls back to system)", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("denied");
    };
    render(<Probe />);
    expect(screen.getByTestId("mode").textContent).toBe("system");
    Storage.prototype.getItem = original;
  });

  it("act wrapper around setMode produces stable mode after click", async () => {
    render(<Probe />);
    await act(async () => {
      await userEvent.click(screen.getByText("dark"));
    });
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });
});

describe("useTheme options", () => {
  it("persists under the neutral default key", async () => {
    render(<Probe />);
    await userEvent.click(screen.getByText("dark"));
    expect(localStorage.getItem("cs-theme")).toBe("dark");
    expect(localStorage.getItem("preview-theme")).toBeNull();
  });

  it("persists under a custom storageKey", async () => {
    function Custom() {
      const { mode, setMode } = useTheme({ storageKey: "my-tool-theme" });
      return <button onClick={() => setMode("light")}>{mode}</button>;
    }
    render(<Custom />);
    await userEvent.click(screen.getByRole("button"));
    expect(localStorage.getItem("my-tool-theme")).toBe("light");
    expect(localStorage.getItem("cs-theme")).toBeNull();
  });

  it("honours ?theme= for this load without saving it", () => {
    localStorage.setItem("cs-theme", "light");
    window.history.replaceState(null, "", "?theme=dark");
    try {
      render(<Probe />);
      expect(screen.getByTestId("mode").textContent).toBe("dark");
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      expect(localStorage.getItem("cs-theme")).toBe("light");
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

  it("ignores the URL when urlParam is false", () => {
    window.history.replaceState(null, "", "?theme=dark");
    try {
      function NoUrl() {
        const { mode } = useTheme({ urlParam: false });
        return <span data-testid="m">{mode}</span>;
      }
      render(<NoUrl />);
      expect(screen.getByTestId("m").textContent).toBe("system");
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });
});

describe("themeBootScript", () => {
  it("applies a URL override before React mounts without persisting it", () => {
    localStorage.setItem("tool-theme", "light");
    window.history.replaceState(null, "", "?appearance=dark");
    try {
      (0, eval)(themeBootScript({ storageKey: "tool-theme", urlParam: "appearance" }));
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
      expect(localStorage.getItem("tool-theme")).toBe("light");
    } finally {
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

  it("resolves a stored system mode through matchMedia", () => {
    localStorage.setItem("cs-theme", "system");
    (0, eval)(themeBootScript());
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});
