import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { CodeBlock } from "./CodeBlock";

describe("CodeBlock — highlightQuery (substring marking)", () => {
  it("wraps matches in <mark class='code-query-match'> for plain text", () => {
    const { container } = render(
      <CodeBlock code="hello world hello" highlightQuery="hello" />,
    );
    const marks = container.querySelectorAll("mark.code-query-match");
    expect(marks.length).toBeGreaterThanOrEqual(2);
    marks.forEach((m) => expect(m.textContent).toBe("hello"));
  });

  it("escapes regex specials in the query (no injection)", () => {
    const { container } = render(
      <CodeBlock code="a.b.c xyz" highlightQuery="." />,
    );
    const marks = container.querySelectorAll("mark.code-query-match");
    // Two literal periods, not 9 (which a regex `.` would match)
    expect(marks.length).toBe(2);
  });

  it("highlightQuery is case-insensitive", () => {
    const { container } = render(
      <CodeBlock code="Hello WORLD hello" highlightQuery="hello" />,
    );
    const marks = container.querySelectorAll("mark.code-query-match");
    expect(marks.length).toBe(2);
  });

  it("no marks rendered when query is empty / undefined", () => {
    const { container } = render(<CodeBlock code="hello" />);
    expect(container.querySelectorAll("mark.code-query-match").length).toBe(0);
  });

  it("works alongside syntax highlighting (language=typescript)", () => {
    const { container } = render(
      <CodeBlock
        code="const greeting = 'hello'"
        language="typescript"
        highlightQuery="hello"
      />,
    );
    expect(container.querySelector("mark.code-query-match")?.textContent).toBe(
      "hello",
    );
  });
});

describe("CodeBlock — highlightedLines", () => {
  it("rows in highlightedLines get the success background style", () => {
    const { container } = render(
      <CodeBlock
        code={"line a\nline b\nline c"}
        highlightedLines={[2]}
      />,
    );
    const rows = container.querySelectorAll("pre code > div");
    expect(rows.length).toBe(3);
    expect(rows[0].className).not.toContain("cs-component-code-block-68");
    expect(rows[1].className).toContain("cs-component-code-block-68");
    expect(rows[2].className).not.toContain("cs-component-code-block-68");
  });

  it("multiple highlightedLines are independent", () => {
    const { container } = render(
      <CodeBlock
        code={"l1\nl2\nl3\nl4"}
        highlightedLines={[1, 3]}
      />,
    );
    const rows = container.querySelectorAll("pre code > div");
    expect(rows[0].className).toContain("cs-component-code-block-68");
    expect(rows[1].className).not.toContain("cs-component-code-block-68");
    expect(rows[2].className).toContain("cs-component-code-block-68");
    expect(rows[3].className).not.toContain("cs-component-code-block-68");
  });
});

describe("CodeBlock — clipboard error handling", () => {
  it("does not throw when navigator.clipboard.writeText rejects", async () => {
    // Override the setup.ts mock to reject for this test only
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    writeText.mockRejectedValueOnce(new Error("clipboard denied"));
    const { default: userEvent } = await import("@testing-library/user-event");
    const { getByLabelText } = render(<CodeBlock code="x" />);
    // The component catches the rejection silently; the click promise resolves.
    await userEvent.click(getByLabelText("Copy code to clipboard"));
    expect(writeText).toHaveBeenCalled();
  });
});

describe("CodeBlock — fillHeight + maxHeight props", () => {
  it("fillHeight=false uses maxHeight style on the scroll container", () => {
    const { container } = render(
      <CodeBlock code="x" maxHeight="10rem" />,
    );
    const scroller = container.querySelector(".overflow-auto") as HTMLElement;
    expect(scroller.style.maxHeight).toBe("10rem");
  });

  it("fillHeight=true does NOT set maxHeight on the scroll container", () => {
    const { container } = render(
      <CodeBlock code="x" fillHeight maxHeight="should-be-ignored" />,
    );
    const scroller = container.querySelector(".overflow-auto") as HTMLElement;
    expect(scroller.style.maxHeight).toBe("");
  });
});
