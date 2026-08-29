import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "../styles/core.css";
import "../styles/components.css";
import "../styles/markdown-content.css";

afterEach(() => {
  cleanup();
});

// jsdom doesn't implement matchMedia. useTheme + any motion-aware code calls it.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// jsdom doesn't implement <canvas>.getContext. MarkdownMinimap uses canvas
// for its overview drawing — give it a no-op 2D context shim so it renders
// without throwing in tests.
if (
  typeof HTMLCanvasElement !== "undefined" &&
  typeof navigator !== "undefined" &&
  navigator.userAgent.toLowerCase().includes("jsdom")
) {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1,
    lineCap: "butt",
  })) as unknown as HTMLCanvasElement["getContext"];
}

// jsdom doesn't implement navigator.clipboard. CodeBlock uses it.
if (typeof navigator !== "undefined" && !navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
}

// jsdom doesn't implement ResizeObserver. MarkdownMinimap uses it.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
