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
    expect(getComputedStyle(links).flexWrap).toBe("nowrap");

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
});
