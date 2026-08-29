import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventLanes, type EventLaneEvent } from "./EventLanes";

type Kind = "message" | "tool";

const palette = {
  message: "--color-cat-1",
  tool: "--color-cat-3",
} as const;

describe("EventLanes acceptance scales", () => {
  it("keeps all 1,366 visible events machine-readable while canvas painting stays windowed", () => {
    const dense = Array.from({ length: 1_366 }, (_, i): EventLaneEvent<Kind> => ({
      i,
      lane: "main",
      kind: i % 2 ? "tool" : "message",
      shape: i % 3 ? "square" : "hollow",
      label: `Event ${i}`,
      at: String(i),
    }));
    const { container } = render(
      <EventLanes
        lanes={[{ id: "main", label: "Main" }]}
        events={dense}
        palette={palette}
        linked={new Set([1_365])}
        emphasis={new Set([0, 1_365])}
        overview
      />,
    );
    expect(container.querySelectorAll("[data-event-index]")).toHaveLength(1_366);
    expect(container.querySelector('[data-event-index="1365"]')).toHaveAttribute("aria-setsize", "1366");
    expect(container.querySelector('[data-event-index="1365"]')).toHaveAttribute("data-event-linked", "true");
    expect(container.querySelector('[data-event-index="1365"]')).toHaveAttribute("data-event-emphasized", "true");
    expect(container.querySelector('[data-event-index="1"]')).toHaveAttribute("data-event-emphasized", "false");
    const canvas = container.querySelector("[data-event-lanes-canvas]")!;
    expect(Number(canvas.getAttribute("data-window-end"))).toBeLessThan(1_365);
    expect(container.querySelector("[data-event-lanes-overview]")).toBeInTheDocument();
  });

  it("exposes 73 multi-lane events and every span endpoint in the census", () => {
    const sevenLanes = Array.from({ length: 7 }, (_, i) => ({ id: `lane-${i}`, label: `Lane ${i}` }));
    const multiLaneEvents = Array.from({ length: 73 }, (_, i): EventLaneEvent<Kind> => ({
      i,
      lane: `lane-${i % 7}`,
      kind: i % 5 === 0 ? "tool" : "message",
      shape: i % 3 === 0 ? "hollow-circle" : i % 3 === 1 ? "circle" : "square",
      label: `Timeline event ${i}`,
      at: `T+${i}`,
    }));
    const multiLaneSpans = Array.from({ length: 23 }, (_, i) => ({
      lane: `lane-${i % 7}`,
      from: i,
      to: i + 7,
    }));
    const { container } = render(
      <EventLanes
        lanes={sevenLanes}
        events={multiLaneEvents}
        spans={multiLaneSpans}
        palette={palette}
        linked={new Set([0, 7])}
        emphasis={new Set([0, 72])}
        cellWidth={22}
      />,
    );
    expect(container.querySelectorAll("[data-event-index]")).toHaveLength(73);
    expect(container.querySelectorAll("[data-span-lane]")).toHaveLength(23);
    expect(container.querySelector('[data-event-index="72"]')).toHaveAttribute("aria-posinset", "73");
    expect(container.querySelector('[data-event-index="0"]')).toHaveAttribute("data-event-linked", "true");
    expect(container.querySelector('[data-event-index="7"]')).toHaveAttribute("data-event-linked", "true");
    expect(container.querySelector('[data-event-index="1"]')).not.toHaveAttribute("data-event-linked");
    expect(container.querySelector('[data-event-index="72"]')).toHaveAttribute("data-event-emphasized", "true");
    expect(container.querySelector('[data-event-index="7"]')).toHaveAttribute("data-event-emphasized", "false");
  });
});
