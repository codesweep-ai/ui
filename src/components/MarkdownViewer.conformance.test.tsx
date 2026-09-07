import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownViewer } from "./MarkdownViewer";
import { MarkdownViewer as RichMarkdownViewer } from "../markdown/rich";
import { markdownConformanceCorpus } from "../test/markdownConformance";

function paragraphHtml(container: HTMLElement) {
  const paragraph = container.querySelector("[data-markdown-paragraph]");
  expect(paragraph).not.toBeNull();
  return (paragraph as HTMLElement).innerHTML;
}

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

describe.each([
  ["lightweight", MarkdownViewer],
  ["rich", RichMarkdownViewer],
] as const)("MarkdownViewer emphasis — %s", (_, Viewer) => {
  it("renders single-marker emphasis with either marker", () => {
    const { container } = render(<Viewer content={"*star* and _underscore_"} />);
    expect(Array.from(container.querySelectorAll("em"), (node) => node.textContent)).toEqual([
      "star",
      "underscore",
    ]);
  });

  it("nests emphasis inside strong", () => {
    const { container } = render(<Viewer content={"**bold with *nested* inside**"} />);
    expect(container.querySelector("strong em")).toHaveTextContent("nested");
  });

  it("leaves an underscore inside a word alone", () => {
    const { container } = render(<Viewer content={"a snake_case_name here"} />);
    expect(container.querySelectorAll("em")).toHaveLength(0);
    expect(container.querySelector("article")).toHaveTextContent("snake_case_name");
  });

  it("does not emphasise a marker hugging whitespace", () => {
    const { container } = render(<Viewer content={"2 * 3 * 4"} />);
    expect(container.querySelectorAll("em")).toHaveLength(0);
    expect(container.querySelector("article")).toHaveTextContent("2 * 3 * 4");
  });

  it("reads three markers as emphasis wrapping strong", () => {
    const { container } = render(<Viewer content={"***both at once***"} />);
    expect(container.querySelector("em strong")).toHaveTextContent("both at once");
  });

  it("reads three underscores the same way", () => {
    const { container } = render(<Viewer content={"___both at once___"} />);
    expect(container.querySelector("em strong")).toHaveTextContent("both at once");
  });

  it("leaves an unclosed marker as literal text", () => {
    const { container } = render(<Viewer content={"an *unclosed marker"} />);
    expect(container.querySelectorAll("em")).toHaveLength(0);
    expect(container.querySelector("article")).toHaveTextContent("an *unclosed marker");
  });
});

// The conformance claim above is bounded, and this is where it stops. CommonMark
// matches a run of four or more markers with a stack of openers and closers whose
// lengths decide the pairing, which the lightweight parser does not implement.
// Guessing at it would trade a known disagreement for an obscure one, so the
// corpus stops at three markers on purpose and the boundary is pinned here.
//
// Fixing the run matching is what makes these assertions fail. That is the
// signal to delete them, and the note in components/MarkdownViewer.md with them.
describe("MarkdownViewer emphasis — where the lightweight subset stops", () => {
  it("agrees with the rich parser at three markers", () => {
    const lightweight = render(<MarkdownViewer content={"***three***"} />);
    const rich = render(<RichMarkdownViewer content={"***three***"} />);

    expect(paragraphHtml(lightweight.container)).toBe(paragraphHtml(rich.container));
  });

  it("disagrees at four markers", () => {
    const lightweight = render(<MarkdownViewer content={"****four****"} />);
    const rich = render(<RichMarkdownViewer content={"****four****"} />);

    expect(paragraphHtml(lightweight.container)).toBe("*<strong>*four</strong>**");
    expect(paragraphHtml(rich.container)).toBe("<strong><strong>four</strong></strong>");
  });

  it("lets the stray markers reach the rest of the line", () => {
    const { container } = render(
      <MarkdownViewer content={"****four**** and ***three***"} />,
    );

    // The three-marker run renders correctly on its own, and not after this one.
    expect(paragraphHtml(container)).toBe(
      "*<strong>*four</strong><strong> and </strong><em>three</em>**",
    );
  });
});
