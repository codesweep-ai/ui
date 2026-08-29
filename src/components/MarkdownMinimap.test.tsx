import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";
import { MarkdownMinimap } from "./MarkdownMinimap";

// Smoke tests only — MarkdownMinimap draws to a canvas, which jsdom doesn't
// implement. setup.ts provides a no-op getContext shim so the component
// mounts without throwing. Drawing behavior + click/drag scrolling can't
// be meaningfully tested without a real canvas; documented in the spec.

function Harness() {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <div style={{ display: "flex", height: 400 }}>
      <div
        ref={contentRef}
        style={{ flex: 1, overflowY: "auto" }}
        data-testid="content"
      >
        <h1>One</h1>
        <p>Para 1</p>
        <h2>Two</h2>
        <p>Para 2</p>
      </div>
      <div style={{ width: 100 }}>
        <MarkdownMinimap contentRef={contentRef} />
      </div>
    </div>
  );
}

describe("MarkdownMinimap — smoke", () => {
  it("mounts a canvas element inside the wrapper", () => {
    const { container } = render(<Harness />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  it("merges consumer className onto the root", () => {
    function H2() {
      const contentRef = useRef<HTMLDivElement>(null);
      return (
        <div>
          <div ref={contentRef} />
          <MarkdownMinimap contentRef={contentRef} className="my-mm-class" />
        </div>
      );
    }
    const { container } = render(<H2 />);
    expect(container.querySelector(".my-mm-class")).not.toBeNull();
  });

  it("handles null contentRef.current without throwing on mount", () => {
    function H3() {
      const contentRef = useRef<HTMLDivElement>(null);
      // Intentionally don't attach the ref to anything
      return <MarkdownMinimap contentRef={contentRef} />;
    }
    expect(() => render(<H3 />)).not.toThrow();
  });

  it("renders data-component on the root", () => {
    const { container } = render(<Harness />);
    expect(
      container.querySelector('[data-component="MarkdownMinimap"]'),
    ).not.toBeNull();
  });
});
