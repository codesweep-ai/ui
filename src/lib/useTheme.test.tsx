import { describe, it, expect, beforeEach, vi } from "vitest";
import { Component, type ReactNode } from "react";
import { render, screen, act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { themeBootScript, useTheme } from "./useTheme";
import { useChartTheme } from "./chartTheme";
import { ThemeToggle } from "../components/ThemeToggle";

beforeEach(() => {
  localStorage.clear();
  // A visit outlives a component by design, so it outlives a test too.
  sessionStorage.clear();
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

  // CUI-092. The seed used to be re-read every time the store adopted, and it
  // adopts whenever it gains its first caller. So a route change, or strict
  // mode's mount-unmount-mount, put the seed back over a mode the reader had
  // chosen, while their choice sat in localStorage where setMode wrote it.
  describe("a seed the reader has answered", () => {
    function withSeed(seed: string, body: () => void) {
      window.history.replaceState(null, "", `?theme=${seed}`);
      try {
        body();
      } finally {
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

    it("yields to a choice made after it, across an unmount", () => {
      withSeed("dark", () => {
        const first = render(<Probe />);
        expect(screen.getByTestId("mode").textContent).toBe("dark");

        act(() => { screen.getByText("light").click(); });
        expect(screen.getByTestId("mode").textContent).toBe("light");
        first.unmount();

        render(<Probe />);
        expect(screen.getByTestId("mode").textContent).toBe("light");
      });
    });

    it("yields to it again on the next load of the same tab", () => {
      withSeed("dark", () => {
        const first = render(<Probe />);
        act(() => { screen.getByText("light").click(); });
        first.unmount();

        // What survives a reload is sessionStorage and localStorage; the
        // module-level stores do not, so drop the live one to stand in for it.
        act(() => { render(<Probe />).unmount(); });

        render(<Probe />);
        expect(screen.getByTestId("mode").textContent).toBe("light");
      });
    });

    it("still governs a load the reader has not answered", () => {
      localStorage.setItem("cs-theme", "light");
      withSeed("dark", () => {
        const first = render(<Probe />);
        expect(screen.getByTestId("mode").textContent).toBe("dark");
        first.unmount();

        render(<Probe />);
        expect(screen.getByTestId("mode").textContent).toBe("dark");
      });
    });

    it("pins again when the link carries a different theme", () => {
      withSeed("dark", () => {
        const first = render(<Probe />);
        act(() => { screen.getByText("light").click(); });
        first.unmount();
      });

      // A different value is a new instruction rather than the one declined.
      withSeed("system", () => {
        const second = render(<Probe />);
        expect(screen.getByTestId("mode").textContent).toBe("system");
        second.unmount();

        // And it holds, rather than falling back to the earlier choice.
        render(<Probe />);
        expect(screen.getByTestId("mode").textContent).toBe("system");
      });
    });

    it("leaves the boot script painting what the hook would read", () => {
      withSeed("dark", () => {
        const first = render(<Probe />);
        act(() => { screen.getByText("light").click(); });
        first.unmount();
        document.documentElement.removeAttribute("data-theme");

        (0, eval)(themeBootScript());

        expect(document.documentElement.getAttribute("data-theme")).toBe("light");
      });
    });

    it("paints the seed from the boot script before the reader has answered", () => {
      localStorage.setItem("cs-theme", "light");
      withSeed("dark", () => {
        document.documentElement.removeAttribute("data-theme");

        (0, eval)(themeBootScript());

        expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
      });
    });

    it("does not save the seed, so leaving the link behind restores the choice", () => {
      withSeed("dark", () => {
        render(<Probe />).unmount();
      });
      expect(localStorage.getItem("cs-theme")).toBeNull();
    });
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

// Every caller used to hold a private copy of the mode, so a toggle in the
// header and a chart in the page never heard each other. The chart kept the
// theme it mounted in and the effect that re-reads the CSS variables never ran
// again. That is CUI-085.
describe("one theme, shared by every caller", () => {
  it("moves a second useTheme when the first one sets a mode", async () => {
    function Two() {
      const a = useTheme();
      const b = useTheme();
      return (
        <div>
          <button onClick={() => a.setMode("dark")}>set from a</button>
          <span data-testid="b-mode">{b.mode}</span>
          <span data-testid="b-resolved">{b.resolved}</span>
        </div>
      );
    }
    render(<Two />);
    expect(screen.getByTestId("b-mode").textContent).toBe("system");

    await userEvent.click(screen.getByText("set from a"));

    expect(screen.getByTestId("b-mode").textContent).toBe("dark");
    expect(screen.getByTestId("b-resolved").textContent).toBe("dark");
  });

  it("re-renders a separate component's useTheme when a ThemeToggle flips", async () => {
    const seen: string[] = [];
    function Watcher() {
      seen.push(useTheme().resolved);
      return null;
    }
    render(
      <div>
        <ThemeToggle variant="radio-group" />
        <Watcher />
      </div>,
    );
    const before = seen.length;

    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(seen.length).toBeGreaterThan(before);
    expect(seen[seen.length - 1]).toBe("dark");
  });

  it("re-reads the chart colours when a toggle elsewhere flips the theme", async () => {
    // Identity rather than colour: jsdom resolves no custom properties, so the
    // question is whether the effect ran at all, and a fresh object says it did.
    const seen: unknown[] = [];
    function Chart() {
      seen.push(useChartTheme());
      return null;
    }
    render(
      <div>
        <ThemeToggle variant="radio-group" />
        <Chart />
      </div>,
    );
    const first = seen[seen.length - 1];

    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));

    expect(seen[seen.length - 1]).not.toBe(first);
  });

  it("drops the adopted mode once nothing is mounted, so a later mount asks again", async () => {
    const { unmount } = render(<Probe />);
    await userEvent.click(screen.getByText("dark"));
    expect(localStorage.getItem("cs-theme")).toBe("dark");
    unmount();

    localStorage.setItem("cs-theme", "light");
    render(<Probe />);

    expect(screen.getByTestId("mode").textContent).toBe("light");
  });
});

// A page that ships `themeBootScript` has the correct theme on the root element
// before React mounts. A hydrating render is handed the server snapshot, whose
// resolved theme is a placeholder, so writing that to the root would paint over
// the right answer and flash the wrong theme at the reader.
describe("hydration does not paint over the boot script", () => {
  it("never writes the placeholder theme while hydrating a stored light mode", async () => {
    localStorage.setItem("cs-theme", "light");
    document.documentElement.setAttribute("data-theme", "light");

    // Real server markup, so React hydrates it instead of discarding it and
    // client-rendering, which would never consult the server snapshot at all.
    const host = document.createElement("div");
    host.innerHTML = renderToString(<Probe />);
    document.body.appendChild(host);
    expect(host.querySelector('[data-testid="mode"]')?.textContent).toBe("system");

    const seen: (string | null)[] = [];
    const observer = new MutationObserver(() => {
      seen.push(document.documentElement.getAttribute("data-theme"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(host, <Probe />);
    });
    observer.disconnect();

    expect(seen).not.toContain("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    // Unmount rather than only removing the node. A root left mounted stays
    // subscribed, so the shared store never drops what it adopted and every
    // later test in this file reads a mode this one chose.
    await act(async () => {
      root?.unmount();
    });
    host.remove();
  });
});

// `getSnapshot` has to be a read. It used to adopt the store — set `live`, pull
// the URL and localStorage into `mode` — and React is free to call it during a
// render it then throws away. Nothing subscribes from a render that never
// commits, so nothing ever drops that adoption, and the next real mount is
// answered out of a session that never happened.
describe("getSnapshot does not adopt the store", () => {
  class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
      return { failed: true };
    }
    render() {
      return this.state.failed ? <span data-testid="failed" /> : this.props.children;
    }
  }

  it("leaves the store unadopted when the render never commits", () => {
    // Its own key, so a failure here does not leak into the default store and
    // take unrelated tests down with it.
    const key = "cs-discarded-render";
    localStorage.setItem(key, "dark");

    // `never` rather than an inferred `void`, which is not a JSX element type.
    function Boom(): never {
      useTheme({ storageKey: key });
      throw new Error("this render is thrown away");
    }

    // The boundary catching the throw is the point of the test, so React's
    // report of it, and jsdom's, are noise.
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const swallow = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", swallow);
    try {
      render(
        <Boundary>
          <Boom />
        </Boundary>,
      );
    } finally {
      window.removeEventListener("error", swallow);
      errors.mockRestore();
    }
    expect(screen.getByTestId("failed")).toBeInTheDocument();

    // Nothing committed, so nothing subscribed and nothing will ever
    // unsubscribe. A later mount must still read the store of record rather
    // than the mode the discarded render left behind.
    localStorage.setItem(key, "light");
    function Later() {
      const { mode } = useTheme({ storageKey: key });
      return <span data-testid="later">{mode}</span>;
    }
    render(<Later />);

    expect(screen.getByTestId("later").textContent).toBe("light");
  });
});

// One storage key is one theme: one `data-theme` attribute, one persisted
// value, one answer. So a caller that honours `?theme=` and a caller of the
// same key that does not cannot both be served, and the first to mount settles
// it. That much is deliberate and documented on `UseThemeOptions`. What was
// wrong is that it was settled in silence, with the answer depending on mount
// order, after every call used to hold its own options privately.
describe("two callers, one storage key, different options", () => {
  it("warns when callers of one key disagree about urlParam", () => {
    const key = "cs-mixed-urlparam";
    window.history.replaceState(null, "", "?theme=dark");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      function Pair() {
        const honours = useTheme({ storageKey: key });
        const ignores = useTheme({ storageKey: key, urlParam: false });
        return (
          <span data-testid="pair">
            {honours.mode}/{ignores.mode}
          </span>
        );
      }
      render(<Pair />);

      // Shared, as documented: both answer with the first caller's reading of
      // the URL, including the one that asked for no URL at all...
      expect(screen.getByTestId("pair").textContent).toBe("dark/dark");
      // ...and that is said out loud instead of being discovered in the wild.
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).toContain("urlParam");
      expect(String(warn.mock.calls[0]?.[0])).toContain(key);
    } finally {
      warn.mockRestore();
      window.history.replaceState(null, "", window.location.pathname);
    }
  });

  it("says nothing when callers of one key agree", () => {
    const key = "cs-agreeing-urlparam";
    window.history.replaceState(null, "", "?theme=dark");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      function Pair() {
        const a = useTheme({ storageKey: key, urlParam: false });
        const b = useTheme({ storageKey: key, urlParam: false });
        return (
          <span data-testid="agree">
            {a.mode}/{b.mode}
          </span>
        );
      }
      render(<Pair />);

      expect(screen.getByTestId("agree").textContent).toBe("system/system");
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      window.history.replaceState(null, "", window.location.pathname);
    }
  });
});

