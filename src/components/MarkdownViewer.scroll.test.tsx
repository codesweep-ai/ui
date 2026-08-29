import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/markdown-content.css";
import { MarkdownViewer } from "./MarkdownViewer";

// Browser project: real layout and real scrolling. The viewer sits below a
// tall spacer inside a page-level scroller; an outline click must move the
// viewer's content pane and nothing else.
const doc = Array.from({ length: 8 }, (_, i) => `## Section ${i + 1}\n\n${"Lorem ipsum dolor sit amet. ".repeat(60)}\n`).join("\n");

function innerScroller(from: HTMLElement, stopAt: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = from;
  while (el && el !== stopAt) {
    const cs = getComputedStyle(el);
    if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }
  return null;
}

describe("MarkdownViewer outline navigation", () => {
  it("scrolls only its own content pane", async () => {
    render(
      <div data-testid="page" style={{ height: "600px", overflowY: "auto" }}>
        <div style={{ height: "900px" }}>spacer</div>
        <div style={{ height: "400px" }}>
          <MarkdownViewer content={doc} outline />
        </div>
        <div style={{ height: "900px" }}>spacer</div>
      </div>,
    );
    const page = screen.getByTestId("page");
    page.scrollTop = 900;
    const before = { page: page.scrollTop, win: window.scrollY };
    const entry = (await screen.findAllByRole("button", { name: "Section 6" }))[0];
    await userEvent.click(entry);
    const heading = document.getElementById("section-6") as HTMLElement;
    const pane = innerScroller(heading, page);
    expect(pane).not.toBeNull();
    expect(pane!.scrollTop).toBeGreaterThan(0);
    expect(page.scrollTop).toBe(before.page);
    expect(window.scrollY).toBe(before.win);
  });
});
