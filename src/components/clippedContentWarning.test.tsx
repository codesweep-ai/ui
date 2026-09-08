import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

import { SectionedTree } from "./SectionedTree";
import { Tree } from "./Tree";

// Browser mode, because the check compares scrollHeight against clientHeight
// and jsdom reports zero for both: every assertion below would pass against a
// box that clipped everything.
//
// Each test uses a different component, because the warning fires once per
// component name and a second test reusing the first's component would pass
// whether the check worked or not.

const nodes = Array.from({ length: 40 }, (_, i) => ({
  id: `n-${i}`,
  name: `item ${i}`,
  type: "leaf" as const,
}));

/** Two frames, because the check waits for one that has a layout in it. */
const settle = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });

function boundedHost(overflowY: string) {
  const host = document.createElement("div");
  host.style.height = "100px";
  host.style.width = "260px";
  host.style.overflowY = overflowY;
  document.body.appendChild(host);
  return host;
}

describe("the clipped content warning", () => {
  it("names the box when an ancestor clips without scrolling", async () => {
    const host = boundedHost("hidden");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<Tree nodes={nodes} expandedIds={new Set()} scroll={false} filterable={false} />, {
      container: host,
    });
    await settle();

    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain("Tree is inside a div");
    expect(message).toContain("of content");
    warn.mockRestore();
  });

  it("says nothing when the same ancestor scrolls", async () => {
    const host = boundedHost("auto");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <SectionedTree
        sections={[{ id: "s", label: "Section", nodes }]}
        filterable={false}
        expandAllControl={false}
      />,
      { container: host },
    );
    await settle();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
