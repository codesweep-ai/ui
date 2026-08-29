import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { MarkdownViewer } from "./MarkdownViewer";
import { MarkdownViewer as RichMarkdownViewer } from "../markdown/rich";

describe("MarkdownViewer — smoke", () => {
  it("renders plain text content without throwing", () => {
    render(<MarkdownViewer content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders a heading from markdown", () => {
    render(<MarkdownViewer content="# Title here" />);
    expect(screen.getByRole("heading", { name: "Title here" })).toBeInTheDocument();
  });

  it("renders paragraphs", () => {
    render(<MarkdownViewer content={"Para one.\n\nPara two."} />);
    expect(screen.getByText("Para one.")).toBeInTheDocument();
    expect(screen.getByText("Para two.")).toBeInTheDocument();
  });

  it("renders inline code", () => {
    const { container } = render(<MarkdownViewer content="An `inlineCode` value." />);
    const code = container.querySelector("code");
    expect(code?.textContent).toBe("inlineCode");
  });

  it("renders fenced code blocks", () => {
    const md = "```\nplain code\n```";
    const { container } = render(<MarkdownViewer content={md} />);
    expect(container.querySelector("pre, code")).not.toBeNull();
  });

  it("renders Mermaid fences as plain code by default (UI-01)", () => {
    const { container } = render(
      <MarkdownViewer content={"```mermaid\ngraph TD; A-->B\n```"} />,
    );
    expect(container.querySelector('[data-component="MermaidDiagram"]')).toBeNull();
    expect(screen.getByText("graph TD; A-->B")).toBeInTheDocument();
  });

  it("uses an opt-in fenced-code renderer (UI-01)", () => {
    const MermaidRenderer = ({ code }: { code: string }) => (
      <div data-testid="mermaid-opt-in">{code}</div>
    );
    render(
      <MarkdownViewer
        content={"```mermaid\ngraph TD; A-->B\n```"}
        codeRenderers={{ mermaid: MermaidRenderer }}
      />,
    );
    expect(screen.getByTestId("mermaid-opt-in")).toHaveTextContent(
      "graph TD; A-->B",
    );
  });

  it("leaves fenced code unhighlighted by default and supports opt-in highlighting (UI-03)", () => {
    const content = "```js\nconst answer = 42;\n```";
    const plain = render(<MarkdownViewer content={content} />);
    expect(plain.container.querySelector(".hljs")).toBeNull();
    plain.unmount();

    const highlighted = render(
      <RichMarkdownViewer content={content} rehypePlugins={[rehypeHighlight]} />,
    );
    expect(highlighted.container.querySelector(".hljs-keyword")).not.toBeNull();
  });

  it("leaves math as text by default and supports opt-in math plugins (UI-02)", () => {
    const content = "Inline $x^2$ math.";
    const plain = render(<MarkdownViewer content={content} />);
    expect(plain.container.querySelector(".katex")).toBeNull();
    plain.unmount();

    const math = render(
      <RichMarkdownViewer
        content={content}
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      />,
    );
    expect(math.container.querySelector(".katex")).not.toBeNull();
  });

  it("empty content renders without throwing", () => {
    expect(() => render(<MarkdownViewer content="" />)).not.toThrow();
  });

  it("outline buttons carry data-heading-id (the auto-scroll hook)", () => {
    // The active-outline auto-scroll effect queries the nav by
    // [data-heading-id]; if that attribute is dropped, tracking breaks
    // silently. Guard the wiring here.
    const { container } = render(
      <MarkdownViewer content={"# Alpha\n\nx\n\n## Beta\n\ny"} outline />,
    );
    const ids = Array.from(
      container.querySelectorAll("[data-heading-id]"),
    ).map((el) => el.getAttribute("data-heading-id"));
    expect(ids).toContain("alpha");
    expect(ids).toContain("beta");
  });

  it("labels outline/minimap toggles and task-list checkboxes", () => {
    render(<MarkdownViewer content={"# Tasks\n\n- [x] done\n- [ ] todo"} outline minimap />);
    expect(screen.getByRole("button", { name: "Collapse outline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse minimap" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Completed task" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Incomplete task" })).toBeInTheDocument();
  });

  it("applies dense markdown typography", () => {
    const { container } = render(<MarkdownViewer content="# Compact" density="dense" />);
    expect(container.querySelector("article")).toHaveClass("markdown-content--dense");
  });

  describe("inline mode", () => {
    it("default mode uses the full-height viewer wrapper", () => {
      const { container } = render(<MarkdownViewer content="# x" />);
      const root = container.querySelector('[data-component="MarkdownViewer"]')!;
      expect(root.className).toContain("cs-component-markdown-viewer-133");
    });

    it("inline mode drops the full-height viewer wrapper", () => {
      const { container } = render(<MarkdownViewer content="# x" inline />);
      const root = container.querySelector('[data-component="MarkdownViewer"]')!;
      expect(root.className).not.toContain("cs-component-markdown-viewer-133");
    });

    it("inline mode suppresses outline panel even when outline=true", () => {
      const { container } = render(
        <MarkdownViewer content="# Alpha\n\n## Beta" inline outline />,
      );
      // outline panel is the only place [data-heading-id] is rendered
      expect(container.querySelector("[data-heading-id]")).toBeNull();
    });

    it("inline mode suppresses minimap panel even when minimap=true", () => {
      const { container } = render(
        <MarkdownViewer content="# x" inline minimap />,
      );
      expect(container.textContent ?? "").not.toContain("Minimap");
    });
  });
});
