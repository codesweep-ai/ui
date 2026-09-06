import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Tree, type TreeNode } from "./Tree";

const nodes: TreeNode[] = [
  { id: "a", name: "a-very-long-file-name-that-will-not-fit.tsx", type: "leaf" },
  { id: "b", name: "short.tsx", type: "leaf" },
];

function renderTree(props: Partial<React.ComponentProps<typeof Tree>> = {}) {
  return render(<Tree nodes={nodes} expandedIds={new Set()} {...props} />);
}

describe("Tree label overflow", () => {
  it("truncates by default, matching the rest of the kit", () => {
    const { container } = renderTree();
    expect(container.querySelector('[data-component="Tree"]')).toHaveAttribute(
      "data-label-overflow",
      "truncate",
    );
  });

  it("still offers the old sideways scrolling on request", () => {
    const { container } = renderTree({ labelOverflow: "scroll" });
    expect(container.querySelector('[data-component="Tree"]')).toHaveAttribute(
      "data-label-overflow",
      "scroll",
    );
  });

  it("can wrap a label onto another line", () => {
    const { container } = renderTree({ labelOverflow: "wrap" });
    expect(container.querySelector('[data-component="Tree"]')).toHaveAttribute(
      "data-label-overflow",
      "wrap",
    );
  });

  it("centres a row by default and aligns to the first line on request", () => {
    const { container, rerender } = renderTree();
    expect(container.querySelector('[data-component="Tree"]')).toHaveAttribute(
      "data-align-label",
      "center",
    );

    rerender(<Tree nodes={nodes} expandedIds={new Set()} alignLabel="start" />);
    expect(container.querySelector('[data-component="Tree"]')).toHaveAttribute(
      "data-align-label",
      "start",
    );
  });

  it("carries the part hooks a consumer can style without a generated class name", () => {
    const { container } = renderTree();
    expect(container.querySelector('[data-part="scroller"]')).not.toBeNull();
    expect(container.querySelectorAll('[data-part="row"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-part="label"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-part="icon"]')).toHaveLength(2);
  });
});

describe("Tree truncation tooltip", () => {
  // jsdom lays nothing out, so a label only looks clipped if it is told it is.
  const clip = (element: Element, scroll: number, client: number) => {
    Object.defineProperty(element, "scrollWidth", { value: scroll, configurable: true });
    Object.defineProperty(element, "clientWidth", { value: client, configurable: true });
    Object.defineProperty(element, "scrollHeight", { value: 0, configurable: true });
    Object.defineProperty(element, "clientHeight", { value: 0, configurable: true });
  };

  it("offers the full name when a label is cut off", () => {
    const { container } = renderTree();
    const [long] = Array.from(container.querySelectorAll('[data-part="label"]'));
    clip(long, 500, 120);

    fireEvent.focus(long);

    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(
      "a-very-long-file-name-that-will-not-fit.tsx",
    );
  });

  it("says nothing for a name that fits", () => {
    const { container } = renderTree();
    const short = Array.from(container.querySelectorAll('[data-part="label"]'))[1];
    clip(short, 100, 100);

    fireEvent.focus(short);

    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  it("does not announce the name twice", () => {
    const { container } = renderTree();
    const [long] = Array.from(container.querySelectorAll('[data-part="label"]'));
    clip(long, 500, 120);

    fireEvent.focus(long);

    // The row already carries the full name as text, so the bubble repeating it
    // must stay out of the accessibility tree.
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveAttribute("aria-hidden", "true");
    expect(long).not.toHaveAttribute("aria-describedby");
  });
});

describe("Tree selection scrolling", () => {
  const nodesWithBranch: TreeNode[] = [
    { id: "a", name: "a.tsx", type: "leaf" },
    { id: "b", name: "b.tsx", type: "leaf" },
  ];

  function withStubs(reducedMotion: boolean, run: (spy: ReturnType<typeof vi.fn>) => void) {
    const spy = vi.fn();
    const originalScroll = Element.prototype.scrollIntoView;
    const originalRaf = globalThis.requestAnimationFrame;
    const originalMatch = window.matchMedia;
    Element.prototype.scrollIntoView = spy;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as typeof globalThis.requestAnimationFrame;
    window.matchMedia = ((query: string) => ({
      matches: reducedMotion,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    })) as unknown as typeof window.matchMedia;
    try {
      run(spy);
    } finally {
      Element.prototype.scrollIntoView = originalScroll;
      globalThis.requestAnimationFrame = originalRaf;
      window.matchMedia = originalMatch;
    }
  }

  it("scrolls a selection set from outside the component by default, without animating", () => {
    // The tree moves because the page changed, not because the user acted on it,
    // so it reorients instantly rather than drawing the eye to the movement.
    withStubs(false, (spy) => {
      const { rerender } = render(
        <Tree nodes={nodesWithBranch} expandedIds={new Set()} selectedId="a" />,
      );
      spy.mockClear();
      rerender(<Tree nodes={nodesWithBranch} expandedIds={new Set()} selectedId="b" />);
      expect(spy).toHaveBeenCalledWith({ block: "nearest", behavior: "auto" });
    });
  });

  it("stays put when asked not to scroll", () => {
    withStubs(false, (spy) => {
      const { rerender } = render(
        <Tree nodes={nodesWithBranch} expandedIds={new Set()} selectedId="a" scrollSelectedIntoView={false} />,
      );
      spy.mockClear();
      rerender(
        <Tree nodes={nodesWithBranch} expandedIds={new Set()} selectedId="b" scrollSelectedIntoView={false} />,
      );
      expect(spy).not.toHaveBeenCalled();
    });
  });

  it("still does not animate when the OS asks for reduced motion", () => {
    withStubs(true, (spy) => {
      const { rerender } = render(
        <Tree nodes={nodesWithBranch} expandedIds={new Set()} selectedId="a" />,
      );
      spy.mockClear();
      rerender(<Tree nodes={nodesWithBranch} expandedIds={new Set()} selectedId="b" />);
      expect(spy).toHaveBeenCalledWith({ block: "nearest", behavior: "auto" });
    });
  });
});
