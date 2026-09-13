import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { page } from "vitest/browser";
import "../styles/tokens.css";
import "../styles/base.css";
import { Header } from "./AppShell";

// Runs in the browser project: a media query needs a viewport to match against,
// and jsdom has none. 48rem is the breakpoint app-shell.css declares.
const WIDE = 1440;
const NARROW = 700;
const HEIGHT = 900;

const items = [
  { label: "Components", href: "#c" },
  { label: "Tokens", href: "#t" },
];

afterEach(async () => {
  await page.viewport(WIDE, HEIGHT);
});

describe("Header responsive layout", () => {
  it("stacks the header and wraps the nav below the breakpoint", async () => {
    render(<Header title="App" navItems={items} />);
    const nav = screen.getByRole("navigation");
    const inner = nav.parentElement!;
    const links = nav.firstElementChild!;

    await page.viewport(WIDE, HEIGHT);
    expect(getComputedStyle(inner).flexDirection).toBe("row");
    expect(getComputedStyle(links).flexWrap).toBe("wrap");

    await page.viewport(NARROW, HEIGHT);
    expect(getComputedStyle(inner).flexDirection).toBe("column");
    expect(getComputedStyle(inner).alignItems).toBe("flex-start");
    expect(getComputedStyle(links).flexWrap).toBe("wrap");
  });

  it("lets many nav items reach a second row instead of overflowing", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      label: `Section ${i + 1}`,
      href: `#s${i + 1}`,
    }));
    render(<Header title="App" navItems={many} />);
    const nav = screen.getByRole("navigation");
    const links = nav.firstElementChild!;

    await page.viewport(NARROW, HEIGHT);

    const rows = new Set(
      Array.from(links.children, (child) => Math.round(child.getBoundingClientRect().top)),
    );
    expect(rows.size).toBeGreaterThan(1);
    expect(links.scrollWidth).toBeLessThanOrEqual(links.clientWidth);
  });
  // Above the breakpoint the row used to be `nowrap`, so a crowded nav ran past
  // the right edge. The shell root sets `overflow: hidden`, so those links were
  // clipped rather than scrolled to, and no scrollbar offered a way to them.
  it("keeps every nav item on screen when the nav is crowded at desktop width", async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      label: `Section ${i + 1}`,
      href: `#s${i + 1}`,
    }));
    render(<Header title="App" navItems={many} />);
    const nav = screen.getByRole("navigation");

    await page.viewport(1000, HEIGHT);

    const links = Array.from(nav.querySelectorAll("a[data-header-nav-link]"));
    expect(links).toHaveLength(20);
    const offscreen = links.filter((a) => a.getBoundingClientRect().right > window.innerWidth + 0.5);
    expect(offscreen).toHaveLength(0);
  });

  // A label free to break at its spaces stacks into a column of words, which
  // leaves the row ragged at several heights. The row wraps instead.
  it("never breaks a nav label across lines", async () => {
    render(
      <Header
        title="App"
        navItems={[
          { label: "One", href: "#one" },
          { label: "A rather long multi word label", href: "#long" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation");
    const [short, long] = Array.from(nav.querySelectorAll("a[data-header-nav-link]"));

    await page.viewport(420, HEIGHT);

    expect(getComputedStyle(long).whiteSpace).toBe("nowrap");
    expect(long.getBoundingClientRect().height).toBeCloseTo(
      short.getBoundingClientRect().height,
      1,
    );
  });
});
