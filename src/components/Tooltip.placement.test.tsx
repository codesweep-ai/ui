import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { page } from "vitest/browser";
import "../styles/tokens.css";
import "../styles/base.css";
import { Tooltip } from "./Tooltip";

// Runs in the browser project. A bubble is `position: fixed` and its own size
// depends on where it sits, so none of this is answerable without real layout.
const WIDE = 1440;
const TALL = 900;
const LABEL = "Show only this card — its siblings are hidden";
const MARGIN = 8;

afterEach(async () => {
  await page.viewport(WIDE, TALL);
});

async function openAt(justify: "flex-start" | "center" | "flex-end", top: number) {
  const view = render(
    <div style={{ position: "fixed", inset: 0, display: "flex", justifyContent: justify }}>
      <div style={{ position: "absolute", top }}>
        <Tooltip content={LABEL}>
          <button type="button">trigger</button>
        </Tooltip>
      </div>
    </div>,
  );

  const button = screen.getByRole("button", { name: "trigger" });
  // Focus reveals with no delay, which is what a keyboard user gets.
  button.focus();
  await waitFor(() => expect(document.querySelector(".cs-tooltip")).not.toBeNull());

  return {
    bubble: document.querySelector<HTMLElement>(".cs-tooltip")!,
    trigger: button.getBoundingClientRect(),
    unmount: view.unmount,
  };
}

describe("Tooltip placement", () => {
  it("keeps its width wherever the trigger sits", async () => {
    await page.viewport(WIDE, TALL);

    const middle = await openAt("center", 400);
    const width = middle.bubble.getBoundingClientRect().width;
    expect(width).toBeGreaterThan(200);
    middle.unmount();

    // The reported bug: at the right edge this measured 30px wide and 496px
    // tall, one character per line and mostly above the top of the screen.
    const edge = await openAt("flex-end", 400);
    const box = edge.bubble.getBoundingClientRect();
    expect(Math.round(box.width)).toBe(Math.round(width));
    expect(box.height).toBeLessThan(60);
  });

  it("stays inside the viewport at either edge", async () => {
    await page.viewport(WIDE, TALL);

    for (const justify of ["flex-start", "flex-end"] as const) {
      const { bubble, unmount } = await openAt(justify, 400);
      const box = bubble.getBoundingClientRect();
      expect(box.left).toBeGreaterThanOrEqual(MARGIN - 1);
      expect(box.right).toBeLessThanOrEqual(WIDE - MARGIN + 1);
      unmount();
    }
  });

  it("flips below a trigger too near the top to sit above", async () => {
    await page.viewport(WIDE, TALL);

    const { bubble, trigger } = await openAt("center", 2);
    const box = bubble.getBoundingClientRect();

    expect(bubble.getAttribute("data-side")).toBe("bottom");
    expect(box.top).toBeGreaterThanOrEqual(MARGIN - 1);
    // Below the trigger rather than over it.
    expect(box.top).toBeGreaterThanOrEqual(trigger.bottom);
  });

  it("still sits above a trigger with room for it", async () => {
    await page.viewport(WIDE, TALL);

    const { bubble, trigger } = await openAt("center", 400);

    expect(bubble.getAttribute("data-side")).toBe("top");
    expect(bubble.getBoundingClientRect().bottom).toBeLessThanOrEqual(trigger.top);
  });
});
