import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Page } from "./Page";

// Browser mode, because every assertion here is a CSS behaviour. jsdom
// computes no layout, so scrollHeight and clientHeight both read 0 there and
// each of these would pass against a page that clipped everything.
//
// One thing this file cannot assert is the shift itself. A real scrollbar
// takes no layout space in this Chromium, so a page without the gutter
// measures the same before and after it starts scrolling. Removing
// `scrollbar-gutter` left an earlier version of the gutter test green. What
// is measurable is the reservation, so that is what the test below measures.

function renderPage(ui: React.ReactElement, hostHeight = 300) {
  const host = document.createElement("div");
  host.style.height = `${hostHeight}px`;
  host.style.width = "800px";
  host.style.display = "flex";
  document.body.appendChild(host);
  const view = render(ui, { container: host });
  const root = host.querySelector('[data-component="Page"]') as HTMLElement;
  const first = host.querySelector("[data-row]") as HTMLElement;
  return { ...view, host, root, first };
}

const rows = (count: number) =>
  Array.from({ length: count }, (_, i) => (
    <div key={i} data-row="" style={{ height: 40 }}>
      row {i}
    </div>
  ));

describe("Page scroll ownership", () => {
  it("scrolls content taller than the page rather than clipping it", () => {
    const { root } = renderPage(<Page>{rows(30)}</Page>);

    expect(root.scrollHeight).toBeGreaterThan(root.clientHeight);
    expect(getComputedStyle(root).overflowY).toBe("auto");
  });

  it("offers the overflow to a pointer, not only to a programmatic scroll", () => {
    const { root } = renderPage(<Page>{rows(30)}</Page>);
    const hidden = root.scrollHeight - root.clientHeight;
    root.scrollTop = hidden;

    expect(hidden).toBeGreaterThan(0);
    expect(root.scrollTop).toBe(hidden);
    // Setting scrollTop is not the assertion: a box with `overflow: hidden`
    // moves for that too. What decides whether a wheel reaches the content is
    // the computed overflow, so that is what this asserts.
    expect(getComputedStyle(root).overflowY).not.toBe("hidden");
  });

  it("hands the scroll back when scroll is false", () => {
    const { root } = renderPage(<Page scroll={false}>{rows(30)}</Page>);

    expect(getComputedStyle(root).overflowY).not.toBe("auto");
  });
});

describe("Page scrollbar gutter", () => {
  it("gives up the same width whether or not a scrollbar is showing", () => {
    const short = renderPage(<Page>{rows(1)}</Page>);
    const tall = renderPage(<Page>{rows(30)}</Page>);

    // The tall page scrolls and the short one cannot, so only the tall one
    // could be showing a scrollbar. Both give up the same width regardless,
    // which is what stops content shifting when a page grows past one screen.
    expect(tall.root.scrollHeight).toBeGreaterThan(tall.root.clientHeight);
    expect(short.root.scrollHeight).toBe(short.root.clientHeight);

    const reserved = (el: HTMLElement) => el.getBoundingClientRect().width - el.clientWidth;

    expect(reserved(short.root)).toBeGreaterThan(0);
    expect(reserved(short.root)).toBe(reserved(tall.root));
  });

  it("declares the reservation rather than leaving it to the platform", () => {
    const { root } = renderPage(<Page>{rows(30)}</Page>);

    expect(getComputedStyle(root).scrollbarGutter).toBe("stable");
  });
});

describe("Page width", () => {
  it("fills the page's content box by default", () => {
    const { root, first } = renderPage(<Page padded={false}>{rows(1)}</Page>);

    expect(first.getBoundingClientRect().width).toBe(root.clientWidth);
  });

  it("caps and centres the content when width is readable", () => {
    const { root, first } = renderPage(
      <Page width="readable" padded={false}>
        {rows(30)}
      </Page>,
    );
    // Bind the cap from the test rather than depending on the viewport being
    // wider than the token's own value.
    root.style.setProperty("--page-max-width", "400px");
    const rootBox = root.getBoundingClientRect();
    const firstBox = first.getBoundingClientRect();

    expect(root.clientWidth).toBeGreaterThan(400);
    expect(firstBox.width).toBeLessThanOrEqual(400);
    expect(firstBox.width).toBeGreaterThan(300);
    // Centred: equal space either side, to within a subpixel.
    const left = firstBox.left - rootBox.left;
    const right = rootBox.right - firstBox.right;
    expect(Math.abs(left - right)).toBeLessThan(1);
  });
});

describe("Page padding", () => {
  it("insets the content from the window edge by default", () => {
    const { root } = renderPage(<Page>{rows(1)}</Page>);

    expect(getComputedStyle(root).paddingLeft).not.toBe("0px");
  });

  it("drops the inset when padded is false", () => {
    const { root } = renderPage(<Page padded={false}>{rows(1)}</Page>);

    expect(getComputedStyle(root).paddingLeft).toBe("0px");
  });
});
