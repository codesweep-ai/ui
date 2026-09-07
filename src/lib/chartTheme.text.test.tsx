import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../styles/tokens.css";
import "../styles/base.css";
import { useChartTheme } from "../lib/chartTheme";

// Runs in the browser project. The whole point of these three fields is that a
// chart can measure real rendered text, and jsdom has no text to measure.
const LABEL = "Cache Write";

function Probe() {
  const theme = useChartTheme();
  return (
    <div>
      <span data-testid="family">{theme.fontFamily}</span>
      <span data-testid="size">{theme.fontSizeAxis}</span>
      <span data-testid="width">{theme.measureText(LABEL)}</span>
      <span data-testid="double">
        {theme.measureText(LABEL, `22px ${theme.fontFamily}`)}
      </span>
    </div>
  );
}

function tokenValue(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// What a consumer would otherwise do: lay the string out in the DOM and read
// its box back. The bridge has to agree with this, or it is not measuring the
// font the chart draws in.
function domWidth(text: string, font: string) {
  const probe = document.createElement("span");
  probe.style.font = font;
  probe.style.whiteSpace = "pre";
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.textContent = text;
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

describe("useChartTheme typography", () => {
  it("resolves the font stack and the axis size the chart draws in", () => {
    render(<Probe />);

    const family = screen.getByTestId("family").textContent!;
    expect(family).not.toBe("");
    expect(family).toBe(tokenValue("--font-family-mono"));
    expect(Number(screen.getByTestId("size").textContent)).toBe(11);
  });

  it("measures a label against the same width the DOM lays it out at", () => {
    render(<Probe />);

    const measured = Number(screen.getByTestId("width").textContent);
    const family = screen.getByTestId("family").textContent!;
    const laid = domWidth(LABEL, `11px ${family}`);

    expect(measured).toBeGreaterThan(0);
    expect(Math.abs(measured - laid)).toBeLessThanOrEqual(1);
  });

  it("measures in whatever font it is handed", () => {
    render(<Probe />);

    // A chart drawing a title beside its axis labels needs the other size, and
    // doubling the size doubles the advance in a monospace stack.
    const measured = Number(screen.getByTestId("width").textContent);
    const doubled = Number(screen.getByTestId("double").textContent);

    expect(doubled / measured).toBeGreaterThan(1.9);
    expect(doubled / measured).toBeLessThan(2.1);
  });
});
