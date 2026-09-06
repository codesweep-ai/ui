import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Panel } from "./Panel";

// Browser mode, because this is a CSS behaviour. jsdom computes no layout, so
// scrollHeight and clientHeight both read 0 there and the assertions below
// would pass against a panel that clips everything.
function renderTallPanel(panelHeight = 200) {
  const host = document.createElement("div");
  host.style.height = `${panelHeight}px`;
  document.body.appendChild(host);
  const view = render(
    <Panel title="Files">
      {Array.from({ length: 40 }, (_, i) => (
        <div key={i} style={{ height: 30 }}>
          row {i}
        </div>
      ))}
    </Panel>,
    { container: host },
  );
  const body = host.querySelector('[data-part="body"]') as HTMLElement;
  return { ...view, host, body };
}

describe("Panel body overflow", () => {
  it("scrolls content taller than the panel rather than clipping it", () => {
    const { body } = renderTallPanel();

    expect(body).not.toBeNull();
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    expect(getComputedStyle(body).overflowY).toBe("auto");
  });

  it("offers the content to a pointer, not only to a programmatic scroll", () => {
    const { body } = renderTallPanel();
    const hidden = body.scrollHeight - body.clientHeight;
    body.scrollTop = hidden;

    expect(hidden).toBeGreaterThan(0);
    expect(body.scrollTop).toBe(hidden);

    // Setting scrollTop is not the assertion. A box with `overflow: hidden`
    // moves for that too, which is exactly why the old clipping was so hard to
    // see: scrollIntoView and the keyboard reached the content and only the
    // mouse did not. What decides whether a wheel can reach it is the computed
    // overflow, so that is what this asserts.
    expect(getComputedStyle(body).overflowY).not.toBe("hidden");
  });

  it("does not scroll when the content fits", () => {
    const host = document.createElement("div");
    host.style.height = "400px";
    document.body.appendChild(host);
    render(
      <Panel title="Files">
        <div style={{ height: 20 }}>one row</div>
      </Panel>,
      { container: host },
    );
    const body = host.querySelector('[data-part="body"]') as HTMLElement;

    // `auto` must stay invisible for the ordinary case, or every panel in the
    // kit grows a scrollbar it does not need.
    expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight);
  });

  it("carries the part hooks a consumer can style without a generated class name", () => {
    const { host } = renderTallPanel();
    expect(host.querySelector('[data-part="header"]')).not.toBeNull();
    expect(host.querySelector('[data-part="body"]')).not.toBeNull();
  });
});
