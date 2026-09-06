import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

  it("opens on hover only after the delay has passed", () => {
    render(
      <Tooltip content="the full path">
        <button>trigger</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByRole("button"));

    advance(400);
    expect(screen.queryByRole("tooltip")).toBeNull();

    advance(200);
    expect(screen.getByRole("tooltip")).toHaveTextContent("the full path");
  });

  it("opens immediately on keyboard focus", () => {
    render(
      <Tooltip content="the full path">
        <button>trigger</button>
      </Tooltip>,
    );
    // No timer advance at all: a keyboard user has no pointer to rest, so a
    // delay would read as the tooltip not working.
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("dismisses on Escape without needing the pointer", () => {
    render(
      <Tooltip content="the full path">
        <button>trigger</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("stays open while the pointer rests on the bubble", () => {
    render(
      <Tooltip content="selectable text">
        <button>trigger</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));
    const bubble = screen.getByRole("tooltip");

    fireEvent.mouseLeave(screen.getByRole("button"));
    fireEvent.mouseEnter(bubble);
    advance(1000);

    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("closes once the pointer leaves the bubble too", () => {
    render(
      <Tooltip content="selectable text">
        <button>trigger</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));
    fireEvent.mouseLeave(screen.getByRole("button"));
    fireEvent.mouseEnter(screen.getByRole("tooltip"));
    fireEvent.mouseLeave(screen.getByRole("tooltip"));
    advance(1000);

    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("describes the trigger when the bubble carries new information", () => {
    render(
      <Tooltip content="Copy to clipboard">
        <button>trigger</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));

    const bubble = screen.getByRole("tooltip");
    expect(screen.getByRole("button")).toHaveAttribute("aria-describedby", bubble.id);
    expect(bubble).not.toHaveAttribute("aria-hidden");
  });

  it("stays silent when the bubble only repeats text already on the page", () => {
    render(
      <Tooltip content="a/very/long/path.tsx" describedBy={false}>
        <button>a/very/long/pa…</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));

    // The full string is already in the DOM, so announcing the bubble as well
    // would read the same name twice.
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-describedby");
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveAttribute("aria-hidden", "true");
  });

  // jsdom lays nothing out, so both metrics read 0 and every element looks
  // unclipped. These stub the pair the measurement actually reads.
  const setClipping = (element: HTMLElement, scroll: number, client: number) => {
    Object.defineProperty(element, "scrollWidth", { value: scroll, configurable: true });
    Object.defineProperty(element, "clientWidth", { value: client, configurable: true });
    Object.defineProperty(element, "scrollHeight", { value: 0, configurable: true });
    Object.defineProperty(element, "clientHeight", { value: 0, configurable: true });
  };

  it("opens for a clipped label when asked for overflow only", () => {
    render(
      <Tooltip content="a/very/long/path.tsx" overflowOnly>
        <button>a/very/long/pa…</button>
      </Tooltip>,
    );
    setClipping(screen.getByRole("button"), 400, 120);

    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("a/very/long/path.tsx");
  });

  it("stays shut for a label that fits when asked for overflow only", () => {
    render(
      <Tooltip content="short.tsx" overflowOnly>
        <button>short.tsx</button>
      </Tooltip>,
    );
    setClipping(screen.getByRole("button"), 120, 120);

    fireEvent.focus(screen.getByRole("button"));
    fireEvent.mouseEnter(screen.getByRole("button"));
    advance(1000);

    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  // `disabled` is the escape hatch for a trigger that cannot take a ref. React
  // warns when a function component is given one, so the warning is the
  // observable: cloning the child in would produce it.
  it("leaves a trigger that cannot take a ref untouched when disabled", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    function PlainTrigger() {
      return <button type="button">Save</button>;
    }

    render(
      <Tooltip content="Save the document" disabled>
        <PlainTrigger />
      </Tooltip>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("never opens when disabled", () => {
    render(
      <Tooltip content="the full path" disabled>
        <button>trigger</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));
    fireEvent.mouseEnter(screen.getByRole("button"));
    advance(1000);

    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("keeps the trigger's own handlers and ref working", () => {
    const onFocus = vi.fn();
    const onMouseEnter = vi.fn();
    const ref = { current: null as HTMLButtonElement | null };

    render(
      <Tooltip content="the full path">
        <button ref={ref} onFocus={onFocus} onMouseEnter={onMouseEnter}>
          trigger
        </button>
      </Tooltip>,
    );

    fireEvent.focus(screen.getByRole("button"));
    fireEvent.mouseEnter(screen.getByRole("button"));

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
    expect(ref.current).toBe(screen.getByRole("button"));
  });

  it("records the side it was asked for", () => {
    render(
      <Tooltip content="the full path" side="right">
        <button>trigger</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveAttribute("data-side", "right");
  });

  it("carries the component and part hooks a consumer can style", () => {
    render(
      <Tooltip content="the full path">
        <button>trigger</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole("button"));

    const bubble = screen.getByRole("tooltip");
    expect(bubble).toHaveAttribute("data-component", "Tooltip");
    expect(bubble).toHaveAttribute("data-part", "bubble");
  });
});
