import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownViewer } from "./MarkdownViewer";
import { MarkdownViewer as RichMarkdownViewer } from "../markdown/rich";
import { markdownConformanceCorpus } from "../test/markdownConformance";

function articleHtml(container: HTMLElement) {
  const article = container.querySelector("article");
  expect(article).not.toBeNull();
  const canonical = article?.cloneNode(true) as HTMLElement;
  const walker = document.createTreeWalker(canonical, NodeFilter.SHOW_TEXT);
  const whitespace: Text[] = [];
  while (walker.nextNode()) {
    const text = walker.currentNode as Text;
    if (!text.data.trim()) whitespace.push(text);
  }
  whitespace.forEach((text) => text.remove());
  return canonical.innerHTML;
}

describe("MarkdownViewer parser conformance", () => {
  it("produces the same DOM through the lightweight and rich parsers", () => {
    const lightweight = render(<MarkdownViewer content={markdownConformanceCorpus} />);
    const rich = render(<RichMarkdownViewer content={markdownConformanceCorpus} />);

    expect(articleHtml(lightweight.container)).toBe(articleHtml(rich.container));
  });

  it("covers the three parser-divergence edges", () => {
    const { container } = render(<MarkdownViewer content={markdownConformanceCorpus} />);
    expect(container.querySelector("table code")).toHaveTextContent("left | right");
    expect(container.querySelector("table + ul li")).toHaveTextContent("inner |");
    expect(container.querySelectorAll(".md-code-block")).toHaveLength(2);
    expect(container.querySelectorAll(".md-code-block")[1]).toHaveTextContent(
      "an unclosed fence remains code",
    );
  });

  it.each([
    ["lightweight", MarkdownViewer],
    ["rich", RichMarkdownViewer],
  ] as const)("renders stable prose hooks through the %s parser", (_, Viewer) => {
    const { container } = render(
      <Viewer content={"Paragraph\n\n- Unordered\n\n1. Ordered\n\n> Quoted"} />,
    );
    expect(container.querySelector("[data-markdown-content]")).not.toBeNull();
    expect(container.querySelector("[data-markdown-paragraph]")).not.toBeNull();
    expect(container.querySelector('[data-markdown-list="unordered"]')).not.toBeNull();
    expect(container.querySelector('[data-markdown-list="ordered"]')).not.toBeNull();
    expect(container.querySelector("[data-markdown-blockquote]")).not.toBeNull();
  });
});
