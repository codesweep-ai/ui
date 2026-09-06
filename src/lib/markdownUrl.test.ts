import { describe, it, expect } from "vitest";
import { escapeMarkdownHtml } from "./markdownUrl";

describe("escapeMarkdownHtml", () => {
  it("escapes an HTML opener in prose", () => {
    expect(escapeMarkdownHtml("text <div> more")).toBe("text &lt;div> more");
    expect(escapeMarkdownHtml("closing </div>")).toBe("closing &lt;/div>");
    expect(escapeMarkdownHtml("a comment <!-- x -->")).toBe("a comment &lt;!-- x -->");
  });

  it("leaves a less-than that opens no tag alone", () => {
    expect(escapeMarkdownHtml("1 < 2 and 3 <4")).toBe("1 < 2 and 3 <4");
  });

  it("passes a code span through untouched", () => {
    expect(escapeMarkdownHtml("Inline `Array<string>`.")).toBe("Inline `Array<string>`.");
  });

  it("passes a fenced block through untouched", () => {
    const source = '```mermaid\nflowchart TD\n  A["one<br/>two"] --> B\n```\n';
    expect(escapeMarkdownHtml(source)).toBe(source);
  });

  it("escapes prose on both sides of a fence", () => {
    const source = "<div> before\n\n```\n<div> inside\n```\n\n<div> after";
    expect(escapeMarkdownHtml(source)).toBe(
      "&lt;div> before\n\n```\n<div> inside\n```\n\n&lt;div> after",
    );
  });

  it("runs an unclosed fence to the end of the document", () => {
    const source = "before <div>\n\n```text\n<div> never closed";
    expect(escapeMarkdownHtml(source)).toBe("before &lt;div>\n\n```text\n<div> never closed");
  });

  it("keeps escaping through a backtick that never closes", () => {
    expect(escapeMarkdownHtml("a ` stray tick <div>")).toBe("a ` stray tick &lt;div>");
  });

  it("does not let a code span cross a blank line", () => {
    const source = "open ` here\n\n<div> is prose ` close";
    expect(escapeMarkdownHtml(source)).toBe("open ` here\n\n&lt;div> is prose ` close");
  });

  it("resumes escaping after a span that spans lines", () => {
    const source = "`code\n<div> in span` then <div> in prose";
    expect(escapeMarkdownHtml(source)).toBe("`code\n<div> in span` then &lt;div> in prose");
  });

  it("does not open a span on a backtick inside a fence", () => {
    const source = "```\na ` lone tick\n```\n\n<div> after";
    expect(escapeMarkdownHtml(source)).toBe("```\na ` lone tick\n```\n\n&lt;div> after");
  });

  it("closes a span only on a run of the same length", () => {
    expect(escapeMarkdownHtml("``a ` b<div>`` c <div>")).toBe("``a ` b<div>`` c &lt;div>");
  });

  it("treats a tilde fence the same as a backtick fence", () => {
    const source = "~~~\n<div> inside\n~~~\n\n<div> after";
    expect(escapeMarkdownHtml(source)).toBe("~~~\n<div> inside\n~~~\n\n&lt;div> after");
  });
});
