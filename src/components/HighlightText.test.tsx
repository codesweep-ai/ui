import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HighlightText } from "./HighlightText";

describe("HighlightText", () => {
  it("renders plain text when query is undefined", () => {
    const { container } = render(<HighlightText text="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(container.querySelector("mark")).toBeNull();
  });

  it("renders plain text when query is empty string", () => {
    const { container } = render(<HighlightText text="Hello world" query="" />);
    expect(container.querySelector("mark")).toBeNull();
  });

  it("wraps matching substring in a <mark>", () => {
    const { container } = render(
      <HighlightText text="Hello world" query="world" />,
    );
    const marks = container.querySelectorAll("mark");
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveAttribute("data-highlight-match", "");
    expect(marks[0].textContent).toBe("world");
  });

  it("case-insensitive by default", () => {
    const { container } = render(
      <HighlightText text="Hello WORLD" query="world" />,
    );
    expect(container.querySelector("mark")?.textContent).toBe("WORLD");
  });

  it("ignoreCase=false makes matching case-sensitive", () => {
    const { container } = render(
      <HighlightText text="Hello WORLD" query="world" ignoreCase={false} />,
    );
    expect(container.querySelector("mark")).toBeNull();
  });

  it("highlights all matches when multiple occur", () => {
    const { container } = render(
      <HighlightText text="abc abc abc" query="abc" />,
    );
    expect(container.querySelectorAll("mark")).toHaveLength(3);
  });

  it("returns plain text when query doesn't match", () => {
    const { container } = render(<HighlightText text="Hello" query="xyz" />);
    expect(container.querySelector("mark")).toBeNull();
  });

  it("escapes regex special characters in query (no injection)", () => {
    // The query "." would normally match any character; with escaping, only
    // a literal period matches.
    const { container } = render(
      <HighlightText text="a.b.c xyz" query="." />,
    );
    const marks = container.querySelectorAll("mark");
    expect(marks).toHaveLength(2);
    marks.forEach((m) => expect(m.textContent).toBe("."));
  });

  it("renders data-component on the root span", () => {
    const { container } = render(<HighlightText text="hi" />);
    expect(container.querySelector('[data-component="HighlightText"]')).not.toBeNull();
  });

  it("merges className on the root, highlightClassName on the marks", () => {
    const { container } = render(
      <HighlightText
        text="hi there"
        query="there"
        className="root-cls"
        highlightClassName="mark-cls"
      />,
    );
    const root = container.querySelector('[data-component="HighlightText"]');
    expect(root?.className).toContain("root-cls");
    expect(container.querySelector("mark")?.className).toContain("mark-cls");
  });
});
