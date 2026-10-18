import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CodeBlock } from "./CodeBlock";

// Browser mode, because every number here is a layout measurement and jsdom
// reports zero for all of them.

const numbered = (count: number) =>
  Array.from({ length: count }, (_, i) => `const line${i + 1} = ${i + 1};`).join("\n");

const rowsOf = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>("pre code > div"),
];

const modes: [string, (code: string) => React.ReactElement][] = [
  ["default", (code) => <CodeBlock code={code} />],
  [
    "fillHeight",
    (code) => (
      <div style={{ height: "20rem" }}>
        <CodeBlock code={code} fillHeight />
      </div>
    ),
  ],
  ["inline", (code) => <CodeBlock code={code} inline />],
];

describe("CodeBlock line numbers", () => {
  it.each(modes)("start every line's code at one edge in %s mode", (_, ui) => {
    const { container } = render(ui(numbered(120)));
    const rows = rowsOf(container);
    const edges = [1, 9, 10, 99, 100, 120].map(
      (line) => rows[line - 1].lastElementChild!.getBoundingClientRect().left,
    );

    // Each number used to be as wide as its own digits, so the code moved one
    // character right at line 10 and again at line 100.
    expect(edges).toEqual(edges.map(() => edges[0]));
  });

  it("size the gutter from the digit count of the last line", () => {
    const firstNumberWidth = (count: number) => {
      const { container, unmount } = render(<CodeBlock code={numbered(count)} />);
      const width = rowsOf(container)[0].firstElementChild!.getBoundingClientRect().width;
      unmount();
      return width;
    };
    const [nine, ten, hundred] = [firstNumberWidth(9), firstNumberWidth(10), firstNumberWidth(100)];

    // Line 1 has one digit in every block, so its gutter grows only when the
    // whole block's does: by one digit at 10 lines, and by one more at 100.
    expect(ten).toBeGreaterThan(nine);
    expect(hundred - ten).toBeCloseTo(ten - nine, 2);
  });
});
