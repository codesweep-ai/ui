import { createRef } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  EventLanes,
  axisPaddingFor,
  drawMark,
  type EventLane,
  type EventLaneEvent,
  type EventLaneSpan,
  type EventLanesRulerContext,
  markSizeFor,
  overviewLaneGeometry,
} from "./EventLanes";

type Kind = "message" | "tool" | "hidden";

const palette = {
  message: "--color-cat-1",
  tool: "--color-cat-3",
  hidden: "--color-cat-5",
} as const;

const lanes: EventLane[] = [
  { id: "main", label: "Main" },
  { id: "worker", label: "Worker", title: "Worker tooltip", description: "Background worker", className: "worker-lane" },
];

const events: EventLaneEvent<Kind>[] = [
  { i: 0, lane: "main", kind: "message", shape: "square", label: "Start", at: "00:00" },
  { i: 1, lane: "worker", kind: "hidden", shape: "circle", label: "Secret", at: "00:01" },
  { i: 2, lane: "worker", kind: "tool", shape: "hollow", label: "Run", at: "00:02", halo: "--color-accent-bg" },
  { i: 4, lane: "main", kind: "message", shape: "circle", label: "Done", at: "00:04", error: true, tick: true, marker: "spawn" },
];

describe("EventLanes", () => {
  it("renders one listbox tab stop and a stable event/span census", () => {
    const spans: EventLaneSpan[] = [{ lane: "main", from: 0, to: 4 }];
    const { container } = render(
      <EventLanes
        lanes={lanes}
        events={events}
        spans={spans}
        palette={palette}
        linked={new Set([2])}
        emphasis={new Set([0, 2])}
      />,
    );
    const listbox = screen.getByRole("listbox", { name: "Event timeline" });
    expect(listbox).toHaveAttribute("tabindex", "0");
    expect(listbox).toHaveAttribute("data-event-count", "4");
    expect(container.querySelectorAll('[role="option"]')).toHaveLength(4);
    expect(container.querySelector('[data-event-index="2"]')).toHaveAttribute("data-event-kind", "tool");
    expect(container.querySelector('[data-event-index="2"]')).toHaveAttribute("data-event-lane", "worker");
    expect(container.querySelector('[data-event-index="2"]')).toHaveAttribute("data-event-linked", "true");
    expect(container.querySelector('[data-event-index="0"]')).not.toHaveAttribute("data-event-linked");
    expect(container.querySelector('[data-event-index="2"]')).toHaveAttribute("data-event-emphasized", "true");
    expect(container.querySelector('[data-event-index="4"]')).toHaveAttribute("data-event-emphasized", "false");
    expect(container.querySelector('[data-span-lane="main"]')).toHaveAttribute("data-span-from", "0");
    expect(container.querySelector('[data-span-lane="main"]')).toHaveAttribute("data-span-to", "4");
    expect(container.querySelector("[data-event-lanes-canvas]")).toBeInTheDocument();
    expect(listbox).toHaveAttribute("data-event-lanes-scroller", "");
    expect(container.querySelector("[data-event-lanes-labels]")).toBeInTheDocument();
    expect(container.querySelector('[data-event-lane-label="worker"]')).toHaveAttribute("data-event-lane-title", "Worker tooltip");
    expect(container.querySelector('[data-event-lane-label="worker"]')).toHaveAttribute("data-event-lane-description", "Background worker");
  });

  it("exposes the overview caption through its documented hook", () => {
    const { container } = render(<EventLanes lanes={lanes} events={events} palette={palette} overview />);
    expect(container.querySelector("[data-event-lanes-overview-label]")).toHaveTextContent("Overview");
  });

  it("skips hidden kinds in census, set metadata, and arrow navigation", async () => {
    const onSelect = vi.fn();
    const documentKey = vi.fn();
    document.addEventListener("keydown", documentKey);
    const { container } = render(
      <EventLanes
        lanes={lanes}
        events={events}
        palette={palette}
        hiddenKinds={new Set<Kind>(["hidden"])}
        onSelect={onSelect}
      />,
    );
    const listbox = screen.getByRole("listbox");
    await userEvent.click(listbox);
    await userEvent.keyboard("{ArrowRight}");
    expect(onSelect).toHaveBeenLastCalledWith(events[2]);
    expect(screen.queryByText(/Secret/)).not.toBeInTheDocument();
    const options = container.querySelectorAll('[role="option"]');
    expect(options).toHaveLength(3);
    expect(options[1]).toHaveAttribute("aria-posinset", "2");
    expect(options[1]).toHaveAttribute("aria-setsize", "3");
    expect(documentKey).not.toHaveBeenCalled();
    document.removeEventListener("keydown", documentKey);
  });

  it("handles Home/End without wrapping and activates through Enter/Space", async () => {
    const onSelect = vi.fn();
    render(<EventLanes lanes={lanes} events={events} palette={palette} onSelect={onSelect} />);
    const listbox = screen.getByRole("listbox");
    await userEvent.click(listbox);
    await userEvent.keyboard("{End}{ArrowRight}{Enter}{Home}{ArrowLeft} ");
    expect(onSelect.mock.calls.map(([event]) => event.i)).toEqual([4, 4, 0, 0]);
    expect(listbox.getAttribute("aria-activedescendant")).toMatch(/-option-0$/);
  });

  it("explicitly lets Escape propagate", async () => {
    const documentKey = vi.fn();
    document.addEventListener("keydown", documentKey);
    render(<EventLanes lanes={lanes} events={events} palette={palette} />);
    await userEvent.click(screen.getByRole("listbox"));
    await userEvent.keyboard("{Escape}");
    expect(documentKey).toHaveBeenCalledWith(expect.objectContaining({ key: "Escape" }));
    document.removeEventListener("keydown", documentKey);
  });

  it("repairs an active descendant hidden by a prop update without selecting", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <EventLanes lanes={lanes} events={events} palette={palette} selected={1} onSelect={onSelect} />,
    );
    rerender(
      <EventLanes
        lanes={lanes}
        events={events}
        palette={palette}
        selected={1}
        hiddenKinds={new Set<Kind>(["hidden"])}
        onSelect={onSelect}
      />,
    );
    await waitFor(() => expect(screen.getByRole("listbox").getAttribute("aria-activedescendant")).toMatch(/-option-2$/));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps an empty listbox labelled, disabled, and free of intercepted keys", async () => {
    const documentKey = vi.fn();
    document.addEventListener("keydown", documentKey);
    render(<EventLanes lanes={[]} events={[]} palette={palette} aria-label="Trace events" />);
    const listbox = screen.getByRole("listbox", { name: "Trace events" });
    expect(listbox).toHaveAttribute("aria-disabled", "true");
    expect(listbox).not.toHaveAttribute("aria-activedescendant");
    expect(screen.getByRole("status")).toHaveTextContent("No visible events.");
    await userEvent.click(listbox);
    await userEvent.keyboard("{ArrowRight}");
    expect(documentKey).toHaveBeenCalled();
    document.removeEventListener("keydown", documentKey);
  });

  it("applies lane metadata, custom ruler labels, and exact padded geometry", () => {
    const ruler = vi.fn((_context: EventLanesRulerContext) => <span>Ruler</span>);
    const { container } = render(
      <EventLanes
        lanes={lanes}
        events={events}
        spans={[{ lane: "main", from: 0, to: 7 }]}
        palette={palette}
        cellWidth={20}
        ruler={ruler}
        rulerLabel="Elapsed"
      />,
    );
    expect(screen.getByText("Worker")).toHaveClass("worker-lane");
    expect(screen.getByText("Worker")).toHaveAttribute("title", "Worker tooltip");
    expect(screen.getByText("Elapsed")).toBeInTheDocument();
    expect(container.querySelector('[data-event-index="2"]')).toHaveAccessibleName(/Background worker/);
    expect(ruler).toHaveBeenCalledWith(expect.objectContaining({ start: 0, end: 7, cellWidth: 20, width: 169 }));
    expect(ruler.mock.calls[0][0].xForIndex(2)).toBe(54.5);
  });

  it("shares hit-testing between hover, tooltip, and pointer selection", () => {
    const onHover = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <EventLanes
        lanes={[lanes[0]]}
        events={[events[0]]}
        palette={palette}
        onHover={onHover}
        onSelect={onSelect}
        renderTooltip={(event) => <span>Details for {event.label}</span>}
      />,
    );
    const canvas = container.querySelector("[data-event-lanes-canvas]")!;
    const bounds = canvas.getBoundingClientRect();
    fireEvent.pointerMove(canvas, { clientX: bounds.left + axisPaddingFor(10) + 5, clientY: bounds.top + 14 });
    expect(onHover).toHaveBeenLastCalledWith(events[0]);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Details for Start");
    fireEvent.pointerDown(canvas, { clientX: bounds.left + axisPaddingFor(10) + 5, clientY: bounds.top + 14, pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith(events[0]);
    fireEvent.pointerLeave(canvas);
    expect(onHover).toHaveBeenLastCalledWith(null);
  });

  // Regression, OPEN.md §7.19: reported on a consumer's timeline page as "the tooltip
  // on the strip stays visible after the pointer leaves". The tooltip falls back
  // to the active event while the widget holds focus so a keyboard walk is
  // narrated — but clicking a mark focuses it too, so the fallback pinned the
  // highlighted item's tooltip on screen. The test above fires pointerLeave and
  // only checks onHover(null); that is a proxy, and it passes either way.
  it("dismisses the tooltip when the pointer leaves after a click, and still narrates a keyboard walk", async () => {
    const { container } = render(
      <EventLanes
        lanes={[lanes[0]]}
        events={[events[0], events[3]]}
        palette={palette}
        onSelect={() => {}}
        renderTooltip={(event) => <span>Details for {event.label}</span>}
      />,
    );
    const canvas = container.querySelector("[data-event-lanes-canvas]")!;
    const scroller = container.querySelector("[data-event-lanes-scroller]") as HTMLElement;
    const bounds = canvas.getBoundingClientRect();
    const onMark = { clientX: bounds.left + axisPaddingFor(10) + 5, clientY: bounds.top + 14 };

    // Pointer only, never clicked: leaving dismisses.
    fireEvent.pointerMove(canvas, onMark);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerLeave(canvas);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // Clicked, which focuses the scroller: leaving must still dismiss.
    fireEvent.pointerMove(canvas, onMark);
    fireEvent.pointerDown(canvas, { ...onMark, pointerId: 1 });
    expect(scroller).toHaveFocus();
    fireEvent.pointerLeave(canvas);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    // A keyboard walk is still narrated with the pointer nowhere near.
    fireEvent.keyDown(scroller, { key: "ArrowRight" });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Details for Done");

    // ...and a click after that keyboard walk returns to pointer behaviour,
    // even though the already-focused scroller fires no second focus event.
    fireEvent.pointerMove(canvas, onMark);
    fireEvent.pointerDown(canvas, { ...onMark, pointerId: 2 });
    fireEvent.pointerLeave(canvas);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  // Reported as "it would be nice if an escape made it go away". Walking the
  // strip by key leaves the tooltip up deliberately — that is the keyboard
  // user's position readout — but before this there was no way to dismiss it
  // without using the mouse.
  it("Escape dismisses the keyboard narration tooltip, and still propagates", () => {
    const onEscape = vi.fn();
    const { container } = render(
      <div onKeyDown={(e) => { if (e.key === "Escape") onEscape(); }}>
        <EventLanes
          lanes={[lanes[0]]}
          events={[events[0], events[3]]}
          palette={palette}
          onSelect={() => {}}
          renderTooltip={(event) => <span>Details for {event.label}</span>}
        />
      </div>,
    );
    const scroller = container.querySelector("[data-event-lanes-scroller]") as HTMLElement;
    scroller.focus();

    fireEvent.keyDown(scroller, { key: "ArrowRight" });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Details for Done");

    fireEvent.keyDown(scroller, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    // A consumer may clear its own selection on a document-level Escape, so
    // swallowing it here would break that.
    expect(onEscape).toHaveBeenCalledTimes(1);

    // carrying on with the arrows brings the narration back
    fireEvent.keyDown(scroller, { key: "ArrowLeft" });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Details for Start");
  });

  it("forwards the component root ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(<EventLanes ref={ref} lanes={lanes} events={events} palette={palette} />);
    expect(ref.current).toHaveAttribute("data-component", "EventLanes");
  });
});

describe("EventLanes shape and boundary geometry", () => {
  function drawingContext() {
    return {
      beginPath: vi.fn(),
      arc: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;
  }

  it("keeps hollow as a square while hollow-circle uses a circular path", () => {
    const hollow = drawingContext();
    drawMark(hollow, "hollow", 10, 10, 8, "red", "white");
    expect(hollow.roundRect).toHaveBeenCalledOnce();
    expect(hollow.arc).not.toHaveBeenCalled();
    expect(hollow.fill).toHaveBeenCalledOnce();
    expect(hollow.stroke).toHaveBeenCalledOnce();

    const hollowCircle = drawingContext();
    drawMark(hollowCircle, "hollow-circle", 10, 10, 8, "red", "white");
    expect(hollowCircle.arc).toHaveBeenCalledOnce();
    expect(hollowCircle.roundRect).not.toHaveBeenCalled();
    expect(hollowCircle.fill).toHaveBeenCalledOnce();
    expect(hollowCircle.stroke).toHaveBeenCalledOnce();
  });

  it.each([6, 10, 15, 22])("reserves complete first and last selection rings at cellWidth %i", (cellWidth) => {
    const padding = axisPaddingFor(cellWidth);
    const radius = (markSizeFor(cellWidth) + 7) / 2 + 3;
    const count = 5;
    const width = count * cellWidth + padding * 2;
    expect(padding + cellWidth / 2 - radius).toBeGreaterThanOrEqual(1);
    expect(padding + (count - 0.5) * cellWidth + radius).toBeLessThanOrEqual(width - 1);
  });
});

describe("the canvas stays pinned to the scrollport while scrolling", () => {
  /* The canvas is viewport-sized and the paint already subtracts scrollLeft, so
     it must be pinned with position:sticky. `min-width: 100%` on the sticky box
     resolved against the AXIS element — the full scroll extent — so the box was
     as wide as the scrollable content and sticky never engaged. The canvas then
     scrolled away while the paint had already compensated for the scroll: the
     marks were offset twice and the drawn region visibly collapsed (838px of
     canvas in view at scrollLeft 0, 79px at the end of a 73-event timeline).
     Real layout, real CSS — this suite runs in Chromium. */
  const many = Array.from({ length: 400 }, (_, i) => ({
    i, lane: "a", kind: "message" as Kind, shape: "square" as const, label: `e${i}`, at: "",
  }));

  it("keeps the canvas fully in view at every scroll position", async () => {
    render(<EventLanes lanes={[{ id: "a", label: "A" }]} events={many} palette={palette} cellWidth={22} />);
    const listbox = screen.getByRole("listbox");
    const canvas = listbox.querySelector("canvas")!;
    await waitFor(() => expect(listbox.scrollWidth).toBeGreaterThan(listbox.clientWidth + 10));

    const offsets = [];
    for (const fraction of [0, 0.5, 1]) {
      listbox.scrollLeft = Math.round((listbox.scrollWidth - listbox.clientWidth) * fraction);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      offsets.push(Math.round(canvas.getBoundingClientRect().left - listbox.getBoundingClientRect().left));
    }
    // pinned: the canvas never drifts left with the scroll
    for (const offset of offsets) expect(Math.abs(offset)).toBeLessThanOrEqual(3);
  });

});

describe("overview lane geometry (T4-04 regression)", () => {
  /* The viewport-window outline is stroked in a reserved band at the top and
     bottom of the overview. It used to be stroked across the full height with a
     4px background halo — wider than a lane band once there are enough lanes
     (7 lanes => 40/7 ~= 5.7px) — so it painted over the first and last lanes'
     marks: inside the window, exactly the range being looked at, those lanes
     read as empty while showing ink outside it. Every lane band must stay clear
     of the chrome at every lane count a consumer might use. */
  it.each([1, 2, 3, 5, 7, 8, 12, 20])("keeps every lane band clear of the window chrome at %i lanes", (laneCount) => {
    const g = overviewLaneGeometry(laneCount);
    expect(g.band).toBeGreaterThan(0);
    for (let row = 0; row < laneCount; row += 1) {
      const top = g.markTop(row);
      const bottom = top + g.markHeight;
      expect(top).toBeGreaterThanOrEqual(g.chromeTop);
      expect(bottom).toBeLessThanOrEqual(g.chromeBottom);
    }
  });

  it("gives the first and last lanes real height, not a sliver", () => {
    const g = overviewLaneGeometry(7);
    expect(g.markHeight).toBeGreaterThanOrEqual(1);
    expect(g.markTop(0)).toBeGreaterThanOrEqual(g.chromeTop);
    expect(g.markTop(6) + g.markHeight).toBeLessThanOrEqual(g.chromeBottom);
  });
});

describe("mark size is a visual-encoding budget (T4-03 regression)", () => {
  /* The marks are the chart's primary visual encoding. Shrinking them is a
     product regression that every other gate reports as green — byte budgets,
     axe, keyboard and the frozen fixture values are all unaffected by how big
     the squares are. So it gets a budget of its own, the way a single-file
     600,000 bytes. */
  it.each([
    [10, 9],   // dense single-lane strip: a 1px gutter, not a 4px inset
    [22, 14],  // wide multi-lane timeline: capped so a wide cell does not overflow the lane
    [6, 5],    // very narrow cells fall back to the floor
  ])("cellWidth %i renders a %ipx mark", (cellWidth, expected) => {
    expect(markSizeFor(cellWidth)).toBe(expected);
  });

  it("never leaves more than a 1px gutter until the cap or the floor binds", () => {
    for (let cellWidth = 6; cellWidth <= 15; cellWidth += 1) {
      const size = markSizeFor(cellWidth);
      expect(size).toBeGreaterThanOrEqual(Math.min(cellWidth - 1, 5));
      expect(size).toBeLessThanOrEqual(cellWidth);
    }
  });

  it("fills at least 85% of the cell in the dense range consumers actually use", () => {
    for (const cellWidth of [8, 10, 12, 14]) {
      expect(markSizeFor(cellWidth) / cellWidth).toBeGreaterThanOrEqual(0.85);
    }
  });
});
