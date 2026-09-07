import { describe, it, expect, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { page } from "vitest/browser";

import { DashboardDemo } from "../../preview/src/pages/patterns/DashboardDemo";

// Runs in the browser project. The question is geometry, so jsdom cannot answer
// it: the charts used to be fixed-width SVGs that overflowed a narrow card, and
// 31px of the widest one sat outside a page that does not scroll sideways.
const WIDE = 1440;
const NARROW = 430;
const HEIGHT = 900;

afterEach(async () => {
  await page.viewport(WIDE, HEIGHT);
});

describe("Dashboard charts at a narrow viewport", () => {
  it("keeps every chart inside the card that holds it", async () => {
    const { container } = render(<DashboardDemo />);

    await page.viewport(NARROW, HEIGHT);

    // Measured against the Card, not the chart's own box. A fixed-width SVG
    // fits its own container and still hangs out of the card around it, and
    // nothing scrolls sideways to reach the part that is cut off.
    // Wider than any icon on the page, which is what separates the three
    // charts from the checkbox ticks and the maximize buttons around them.
    const charts = [...container.querySelectorAll("svg")].filter(
      (svg) => svg.getBoundingClientRect().width > 100,
    );
    expect(charts).toHaveLength(3);

    for (const svg of charts) {
      const card = svg.closest('[data-component="Card"]')!;
      expect(svg.getBoundingClientRect().right).toBeLessThanOrEqual(
        card.getBoundingClientRect().right + 1,
      );
    }
  });

  it("draws each chart at its own size when the card is wide enough", async () => {
    const { container } = render(<DashboardDemo />);

    await page.viewport(WIDE, HEIGHT);

    // The line chart lays out in a 460 unit coordinate space and never grows
    // past it, so a wide card renders it at 1:1.
    const svg = container.querySelector('[data-component="ChartFrame"] svg');
    expect(svg).not.toBeNull();
    expect(Math.round((svg as SVGElement).getBoundingClientRect().width)).toBe(460);
  });
});
