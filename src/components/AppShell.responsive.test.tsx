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

// Reach the links by `data-header-nav-link`, the hook components/AppShell.md
// names, rather than by position in the tree: a separator or a wrapper added
// between the nav and its links moves the position and keeps the hook. The row
// that wraps them is then the nav child holding a link, found the same way.
const navLinks = (nav: Element) => Array.from(nav.querySelectorAll("a[data-header-nav-link]"));
const navRow = (nav: Element) => navLinks(nav)[0].closest("nav > *")!;

describe("Header responsive layout", () => {
  it("stacks the header and wraps the nav below the breakpoint", async () => {
    render(<Header title="App" navItems={items} />);
    const nav = screen.getByRole("navigation");
    const inner = nav.parentElement!;
    const row = navRow(nav);

    await page.viewport(WIDE, HEIGHT);
    expect(getComputedStyle(inner).flexDirection).toBe("row");
    expect(getComputedStyle(row).flexWrap).toBe("wrap");

    await page.viewport(NARROW, HEIGHT);
    expect(getComputedStyle(inner).flexDirection).toBe("column");
    expect(getComputedStyle(inner).alignItems).toBe("flex-start");
    expect(getComputedStyle(row).flexWrap).toBe("wrap");
  });

  it("lets many nav items reach a second row instead of overflowing", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      label: `Section ${i + 1}`,
      href: `#s${i + 1}`,
    }));
    render(<Header title="App" navItems={many} />);
    const nav = screen.getByRole("navigation");

    await page.viewport(NARROW, HEIGHT);

    const rows = new Set(
      navLinks(nav).map((a) => Math.round(a.getBoundingClientRect().top)),
    );
    expect(rows.size).toBeGreaterThan(1);
    const row = navRow(nav);
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
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

    const links = navLinks(nav);
    expect(links).toHaveLength(20);
    const offscreen = links.filter((a) => a.getBoundingClientRect().right > window.innerWidth + 0.5);
    expect(offscreen).toHaveLength(0);
  });

  // Crowding is what used to break a label: a squeezed link wrapped at its
  // spaces and the row went ragged at several heights. A link now moves to the
  // next row instead of being squeezed, so every label keeps one line.
  it("keeps every label on one line when the row is crowded", async () => {
    render(
      <Header
        title="App"
        navItems={[
          { label: "What you can say", href: "#a" },
          { label: "Where do I start?", href: "#b" },
          { label: "The model", href: "#c" },
          { label: "How you can measure it", href: "#d" },
          { label: "How it is defined", href: "#e" },
          { label: "Reference", href: "#f" },
          { label: "Key findings", href: "#g" },
        ]}
        actions={<div style={{ width: 390, height: 34, flex: "0 0 390px" }} />}
      />,
    );
    const nav = screen.getByRole("navigation");

    await page.viewport(1100, HEIGHT);

    const heights = new Set(
      navLinks(nav).map((a) => Math.round(a.getBoundingClientRect().height)),
    );
    expect(heights.size).toBe(1);
  });

  // The row wrapping moves whole links and cannot shrink one, so a label wider
  // than the row on its own has to break. If it does not, it runs past the edge
  // and the shell clips it with no scrollbar to reach it, which is CUI-081.
  it("breaks a label too wide for the row rather than letting it escape", async () => {
    render(
      <Header
        title="App"
        navItems={[
          { label: "Short", href: "#s" },
          { label: "Betriebskostenabrechnung und Grundstuecksverwaltung Uebersicht", href: "#l" },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation");

    await page.viewport(390, HEIGHT);

    const links = navLinks(nav);
    const escaped = links.filter((a) => a.getBoundingClientRect().right > window.innerWidth + 0.5);
    expect(escaped).toHaveLength(0);
    // It broke rather than fitting by luck: the long one is taller than the short one.
    expect(links[1].getBoundingClientRect().height).toBeGreaterThan(
      links[0].getBoundingClientRect().height,
    );
  });
});
