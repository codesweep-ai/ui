import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
