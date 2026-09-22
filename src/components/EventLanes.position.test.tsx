import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  EventLanes,
  axisPaddingFor,
  markSizeFor,
  type EventLane,
  type EventLaneEvent,
  type EventLanesRulerContext,
  type EventLanesViewState,
} from "./EventLanes";

type Kind = "work" | "wait";

const palette = { work: "--color-cat-3", wait: "--color-structural" } as const;

/** Two timelines. The first spreads work and waiting over two lanes, and its
 *  indices run out of position order, so index order and position order differ. */
const lanes: EventLane[] = [
  { id: "a", label: "A", group: "a", bars: "up", height: 32 },
  { id: "a-wait", label: "A waiting", group: "a", bars: "down", height: 16 },
  { id: "b", label: "B" },
];

const events: EventLaneEvent<Kind>[] = [
  { i: 0, lane: "a", kind: "work", shape: "square", label: "A first", at: "0", position: 0 },
  { i: 3, lane: "a-wait", kind: "wait", shape: "square", label: "A waits", at: "2", position: 2 },
  { i: 1, lane: "a", kind: "work", shape: "square", label: "A second", at: "10", position: 10 },
  { i: 2, lane: "a", kind: "work", shape: "square", label: "A third", at: "30", position: 30 },
  { i: 4, lane: "b", kind: "work", shape: "square", label: "B first", at: "11", position: 11 },
  // Close to B's first mark, so the deepest zoom reaches well past any view the tests ask for.
  { i: 5, lane: "b", kind: "work", shape: "square", label: "B second", at: "11.25", position: 11.25 },
];

const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

function renderPositioned(props: Partial<Parameters<typeof EventLanes>[0]> = {}) {
  const contexts: EventLanesRulerContext[] = [];
  const ruler = (context: EventLanesRulerContext) => {
    contexts.push(context);
    return null;
  };
  const view = render(
    <div style={{ width: 640 }}>
      <EventLanes layout="position" lanes={lanes} events={events} palette={palette} ruler={ruler} {...props} />
    </div>,
  );
  return { ...view, latest: () => contexts[contexts.length - 1] };
}

describe("EventLanes positioned layout", () => {
  it("places each mark at its position and hands the ruler the axis", async () => {
    const { latest } = renderPositioned();
    await frame();
    const position = latest().position!;
    expect(position.origin).toBe(0);
    expect(position.end).toBe(30);
    expect(position.xForPosition(0)).toBeCloseTo(axisPaddingFor(10), 6);
    expect(position.positionForX(position.xForPosition(17.5))).toBeCloseTo(17.5, 6);
    // Fully zoomed out, the whole extent fits.
    expect(position.visibleStart).toBeLessThanOrEqual(0);
    expect(position.visibleEnd).toBeGreaterThanOrEqual(30);
  });

  it("widens a mark to the gap to the next mark anywhere in its timeline", async () => {
    const { latest } = renderPositioned({ view: { start: 0, end: 4 } });
    await frame();
    const { scale } = latest().position!;
    const size = markSizeFor(10);
    // The wait in the other lane of timeline "a" ends the first work mark's gap at 2, not at 10.
    const expected = Math.max(1, Math.min(size, 2 * scale - 1));
    const centre = latest().xForIndex(0);
    expect(centre - latest().position!.xForPosition(0)).toBeCloseTo(expected / 2, 6);
  });

  it("keeps a timeline's marks where they were when one of its lanes is hidden", async () => {
    const { latest, rerender } = renderPositioned({ view: { start: 0, end: 4 } });
    await frame();
    const before = latest().xForIndex(0);
    rerender(
      <div style={{ width: 640 }}>
        <EventLanes
          layout="position"
          lanes={lanes.map((lane) => lane.id === "a-wait" ? { ...lane, hidden: true } : lane)}
          events={events}
          palette={palette}
          ruler={(context) => {
            expect(context.xForIndex(0)).toBeCloseTo(before, 6);
            return null;
          }}
        />
      </div>,
    );
    await frame();
    expect(document.querySelector('[data-event-lane-label="a-wait"]')).toBeNull();
    expect(document.querySelector('[data-event-index="3"]')).toBeNull();
    expect(document.querySelector('[data-event-index="0"]')).not.toBeNull();
  });

  it("leaves out a mark with no position, and says so", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderPositioned({
      events: [...events, { i: 9, lane: "b", kind: "work", shape: "square", label: "Unplaced", at: "?" }],
    });
    await frame();
    expect(document.querySelector('[data-event-index="9"]')).toBeNull();
    expect(warn.mock.calls.some(([message]) => String(message).includes("event 9 has no position"))).toBe(true);
    warn.mockRestore();
  });

  it("walks a timeline in position order with the arrows, and stops at its ends", async () => {
    const onSelect = vi.fn();
    renderPositioned({ selected: 0, onSelect });
    await frame();
    const listbox = screen.getByRole("listbox");
    listbox.focus();
    const walk = (key: string) => {
      fireEvent.keyDown(listbox, { key });
      return onSelect.mock.calls[onSelect.mock.calls.length - 1]?.[0].i;
    };
    // Position order in timeline "a" is 0 (0), 3 (2), 1 (10), 2 (30); B's mark is not in it.
    expect(walk("ArrowRight")).toBe(3);
    expect(walk("ArrowRight")).toBe(1);
    expect(walk("ArrowRight")).toBe(2);
    const calls = onSelect.mock.calls.length;
    walk("ArrowRight");
    expect(onSelect.mock.calls.length).toBe(calls);
    expect(walk("Home")).toBe(0);
    expect(walk("End")).toBe(2);
  });

  it("moves to the nearest mark in the next timeline with the down arrow", async () => {
    const onSelect = vi.fn();
    renderPositioned({ selected: 1, onSelect });
    await frame();
    const listbox = screen.getByRole("listbox");
    listbox.focus();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(onSelect.mock.calls[0][0].i).toBe(4);
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(onSelect.mock.calls[1][0].i).toBe(1);
  });

  it("fits a requested view between the boundary paddings, so the whole extent is the opening fit", async () => {
    const contexts: EventLanesRulerContext[] = [];
    const reports: EventLanesViewState[] = [];
    const ruler = (context: EventLanesRulerContext) => {
      contexts.push(context);
      return null;
    };
    const latest = () => contexts[contexts.length - 1].position!;
    const { rerender } = render(
      <div style={{ width: 640 }}>
        <EventLanes layout="position" lanes={lanes} events={events} palette={palette} ruler={ruler} />
      </div>,
    );
    await frame();
    const opening = latest().scale;
    const listbox = screen.getByRole("listbox");
    rerender(
      <div style={{ width: 640 }}>
        <EventLanes layout="position" lanes={lanes} events={events} palette={palette} ruler={ruler} view={{ start: 0, end: 30 }} onViewChange={(view) => reports.push(view)} />
      </div>,
    );
    await waitFor(() => expect(reports.length).toBeGreaterThan(0));
    await frame();
    expect(latest().scale).toBeCloseTo(opening, 6);
    expect(listbox.scrollLeft).toBe(0);
    // The last mark draws a mark size past its position, and its halo past
    // that: both sit inside the viewport, and nothing is left to scroll to.
    expect(latest().xForPosition(30) + markSizeFor(10) + axisPaddingFor(10)).toBeLessThanOrEqual(listbox.clientWidth + 0.5);
    expect(listbox.scrollWidth).toBeLessThanOrEqual(listbox.clientWidth);
    // The report is the range between the paddings: the request, handed back.
    const shown = reports[reports.length - 1];
    expect(shown.start).toBeCloseTo(0, 3);
    expect(shown.end).toBeCloseTo(30, 3);
  });

  it("shows a requested view, reports it, and applies a new request for the same range", async () => {
    const reports: EventLanesViewState[] = [];
    const { rerender } = renderPositioned({ view: { start: 10, end: 20 }, onViewChange: (view) => reports.push(view) });
    await waitFor(() => expect(reports.length).toBeGreaterThan(0));
    const shown = reports[reports.length - 1];
    expect(shown.start).toBeCloseTo(10, 3);
    expect(shown.end).toBeCloseTo(20, 3);

    const listbox = screen.getByRole("listbox");
    listbox.scrollLeft += 100;
    fireEvent.scroll(listbox);
    await waitFor(() => expect(reports[reports.length - 1].start).toBeGreaterThan(10.5));

    rerender(
      <div style={{ width: 640 }}>
        <EventLanes layout="position" lanes={lanes} events={events} palette={palette} view={{ start: 10, end: 20 }} onViewChange={(view) => reports.push(view)} />
      </div>,
    );
    await waitFor(() => expect(reports[reports.length - 1].start).toBeCloseTo(10, 3));
  });

  it("keeps the canvas and the overview under the axis when the scroller is padded", async () => {
    const style = document.createElement("style");
    style.textContent = "#padded [data-event-lanes-scroller] { padding-left: 12px; padding-right: 4px; }";
    document.head.append(style);
    try {
      const contexts: EventLanesRulerContext[] = [];
      const { container } = render(
        <div id="padded" style={{ width: 640 }}>
          <EventLanes
            layout="position"
            lanes={lanes}
            events={events}
            palette={palette}
            overview
            ruler={(context) => {
              contexts.push(context);
              return null;
            }}
          />
        </div>,
      );
      await frame();
      const scroller = container.querySelector("[data-event-lanes-scroller]") as HTMLElement;
      const canvas = container.querySelector("[data-event-lanes-canvas]")!;
      const overview = container.querySelector("[data-event-lanes-overview]") as HTMLElement;
      const contentLeft = scroller.getBoundingClientRect().left + scroller.clientLeft + 12;
      const contentWidth = scroller.clientWidth - 16;
      // The whole extent fits the content box, so there is nothing to scroll.
      expect(contexts[contexts.length - 1].width).toBeCloseTo(contentWidth, 0);
      expect(scroller.scrollWidth).toBe(scroller.clientWidth);
      // The overview's drawing begins under the axis's zero and is as wide as the content box.
      expect(overview.getBoundingClientRect().left + overview.clientLeft).toBeCloseTo(contentLeft, 0);
      expect(overview.getBoundingClientRect().width).toBeCloseTo(contentWidth, 0);
      // Zoomed in and scrolled, the canvas stays at the content edge rather than riding along.
      const listbox = screen.getByRole("listbox");
      fireEvent.keyDown(listbox, { key: "End" });
      const zoom = new WheelEvent("wheel", { deltaY: -600, ctrlKey: true, clientX: contentLeft + 100, bubbles: true, cancelable: true });
      listbox.dispatchEvent(zoom);
      await frame();
      scroller.scrollLeft = 30;
      fireEvent.scroll(scroller);
      await frame();
      expect(scroller.scrollLeft).toBe(30);
      expect(canvas.getBoundingClientRect().left).toBeCloseTo(contentLeft, 0);
    } finally {
      style.remove();
    }
  });

  it("zooms about the pointer with a ctrl or cmd wheel, and scrolls sideways with a plain one", async () => {
    const { latest } = renderPositioned({ view: { start: 0, end: 30 } });
    await frame();
    const listbox = screen.getByRole("listbox");
    const box = listbox.getBoundingClientRect();
    const anchor = 200;
    const held = latest().position!.positionForX(listbox.scrollLeft + anchor);
    const scaleBefore = latest().position!.scale;
    const zoom = new WheelEvent("wheel", { deltaY: -200, ctrlKey: true, clientX: box.left + anchor, bubbles: true, cancelable: true });
    listbox.dispatchEvent(zoom);
    await frame();
    expect(zoom.defaultPrevented).toBe(true);
    const after = latest().position!;
    expect(after.scale).toBeGreaterThan(scaleBefore);
    // The browser keeps scrollLeft to whole pixels, so the held position may
    // drift by up to a pixel and no further.
    expect(Math.abs(after.xForPosition(held) - listbox.scrollLeft - anchor)).toBeLessThanOrEqual(1);

    const before = listbox.scrollLeft;
    const scroll = new WheelEvent("wheel", { deltaY: 60, bubbles: true, cancelable: true });
    listbox.dispatchEvent(scroll);
    expect(scroll.defaultPrevented).toBe(true);
    expect(listbox.scrollLeft).toBeGreaterThan(before);

    // At the end of the axis the wheel is let through, so the page can scroll on.
    listbox.scrollLeft = listbox.scrollWidth;
    const past = new WheelEvent("wheel", { deltaY: 60, bubbles: true, cancelable: true });
    listbox.dispatchEvent(past);
    expect(past.defaultPrevented).toBe(false);
  });

  it("reports a click on a span's box, and a click on a mark as a mark", async () => {
    const onSelect = vi.fn();
    const onSelectSpan = vi.fn();
    const { latest } = renderPositioned({
      spans: [{ lane: "a", from: 0, to: 30, id: "run", label: "Run", trail: 32 }],
      onSelect,
      onSelectSpan,
      view: { start: 0, end: 32 },
    });
    await frame();
    const canvas = document.querySelector("[data-event-lanes-canvas]")!;
    const bounds = canvas.getBoundingClientRect();
    const listbox = screen.getByRole("listbox");
    const at = (position: number) => bounds.left + latest().position!.xForPosition(position) - listbox.scrollLeft;
    // Inside the box, between marks.
    fireEvent.pointerDown(canvas, { clientX: at(20), clientY: bounds.top + 4, pointerId: 1 });
    expect(onSelectSpan).toHaveBeenCalledWith(expect.objectContaining({ id: "run" }));
    expect(onSelect).not.toHaveBeenCalled();
    // On the mark at 10, near the floor where its bar is.
    fireEvent.pointerDown(canvas, { clientX: latest().xForIndex(1) + bounds.left - listbox.scrollLeft, clientY: bounds.top + 28, pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ i: 1 }));
  });

  it("lists spans and links in the census", async () => {
    renderPositioned({
      spans: [{ lane: "a", from: 0, to: 30, id: "run", label: "Run", trail: 32 }],
      selectedSpan: "run",
      links: [{ from: 0, to: 4, style: "dashed", emphasized: true }, { from: 0, to: 99 }],
    });
    await frame();
    const span = document.querySelector('[data-span-id="run"]')!;
    expect(span.getAttribute("data-span-label")).toBe("Run");
    expect(span.getAttribute("data-span-trail")).toBe("32");
    expect(span.getAttribute("data-span-selected")).toBe("true");
    // A mark names the labelled span it falls in, never an index-style endpoint.
    const inside = document.querySelector('[data-event-index="1"]')!.getAttribute("aria-label")!;
    expect(inside).toContain("in Run");
    expect(inside).not.toContain("span from");
    expect(document.querySelector('[data-event-index="4"]')!.getAttribute("aria-label")).not.toContain("in Run");
    const links = document.querySelectorAll("[data-link-from]");
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute("data-link-style")).toBe("dashed");
    expect(links[0].getAttribute("data-link-emphasized")).toBe("true");
  });

  it("leaves the index layout as it was", async () => {
    const contexts: EventLanesRulerContext[] = [];
    render(
      <EventLanes
        lanes={lanes}
        events={events}
        palette={palette}
        ruler={(context) => {
          contexts.push(context);
          return null;
        }}
      />,
    );
    await frame();
    expect(screen.getByRole("listbox").hasAttribute("data-layout")).toBe(false);
    const context = contexts[contexts.length - 1];
    expect(context.position).toBeUndefined();
    expect(context.xForIndex(2)).toBeCloseTo(axisPaddingFor(10) + 2.5 * 10, 6);
  });
});
