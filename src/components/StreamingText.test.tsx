import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { StreamingText } from "./StreamingText";

// jsdom default for prefers-reduced-motion matches false; reaffirm here so
// the reveal animation actually runs in these tests.
beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("StreamingText", () => {
  it("starts with zero characters revealed when streaming", () => {
    render(<StreamingText text="hello" speed={40} />);
    const span = screen.getByTestId("streamingtext-cursor").parentElement!;
    expect(span.textContent).toBe("");
  });

  it("reveals one character per tick at the configured speed", () => {
    render(<StreamingText text="hello" speed={100} />);
    // interval ~= 1000 / 100 = 10ms per char
    act(() => {
      vi.advanceTimersByTime(30); // 3 chars worth
    });
    const span = screen.getByTestId("streamingtext-cursor").parentElement!;
    expect(span.textContent?.startsWith("hel")).toBe(true);
  });

  it("reveals the full string after sufficient time", () => {
    render(<StreamingText text="hi" speed={100} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const wrapper = document.querySelector('[data-component="StreamingText"]')!;
    expect(wrapper.textContent).toBe("hi");
  });

  it("done=true snaps to full text and hides cursor", () => {
    render(<StreamingText text="full text" done />);
    expect(screen.queryByTestId("streamingtext-cursor")).not.toBeInTheDocument();
    const wrapper = document.querySelector('[data-component="StreamingText"]')!;
    expect(wrapper.textContent).toBe("full text");
  });

  it("hideCursor hides the cursor while still streaming", () => {
    render(<StreamingText text="abc" speed={40} hideCursor />);
    expect(screen.queryByTestId("streamingtext-cursor")).not.toBeInTheDocument();
  });

  it("data-streaming attribute reflects state", () => {
    const { rerender } = render(<StreamingText text="abc" speed={1} />);
    expect(
      document
        .querySelector('[data-component="StreamingText"]')!
        .getAttribute("data-streaming"),
    ).toBe("true");
    rerender(<StreamingText text="abc" done />);
    expect(
      document
        .querySelector('[data-component="StreamingText"]')!
        .getAttribute("data-streaming"),
    ).toBe("false");
  });

  it("onDone fires after the last character is revealed", () => {
    const onDone = vi.fn();
    render(<StreamingText text="hi" speed={100} onDone={onDone} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("speed=0 snaps to full text immediately", () => {
    render(<StreamingText text="instant" speed={0} />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const wrapper = document.querySelector('[data-component="StreamingText"]')!;
    expect(wrapper.textContent?.startsWith("instant")).toBe(true);
  });

  it("prefers-reduced-motion snaps to full text without animation", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (q: string) => ({
        matches: true,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }),
    });
    render(<StreamingText text="motion-off" />);
    const wrapper = document.querySelector('[data-component="StreamingText"]')!;
    expect(wrapper.textContent).toBe("motion-off");
  });

  it("merges className on the wrapper", () => {
    render(<StreamingText text="x" done className="custom-stream" />);
    expect(
      document.querySelector('[data-component="StreamingText"]')!.className,
    ).toContain("custom-stream");
  });
});
