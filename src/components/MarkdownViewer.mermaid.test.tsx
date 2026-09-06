import { render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarkdownViewer } from "../markdown/rich";
import { MermaidDiagram } from "./MermaidDiagram";

describe("MarkdownViewer Mermaid boundary", () => {
  it("renders a diagram without interpreting markdown-authored HTML labels", async () => {
    const content = [
      "```mermaid",
      "flowchart TD",
      'A[\"<img data-markdown-injected src=x onerror=alert(1)>unsafe\"] --> B[Safe]',
      "```",
    ].join("\n");

    const { container } = render(
      <MarkdownViewer
        content={content}
        codeRenderers={{ mermaid: ({ code }) => <MermaidDiagram chart={code} /> }}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector('[data-component="MermaidDiagram"] svg')).not.toBeNull();
    });
    expect(container.querySelector("[data-markdown-injected], [onerror], script")).toBeNull();
    expect(container.querySelector('[data-component="MermaidDiagram"] foreignObject')).toBeNull();
  });
});

describe("MarkdownViewer Mermaid fence content", () => {
  it("hands the fence to the code renderer without escaping its markup", () => {
    const content = ["```mermaid", "flowchart TD", '  A["one<br/>two"] --> B', "```"].join("\n");
    let received: string | null = null;

    render(
      <MarkdownViewer
        content={content}
        codeRenderers={{
          mermaid: ({ code }) => {
            received = code;
            return null;
          },
        }}
      />,
    );

    // Mermaid converts <br/> into a line break itself. An escaped one reaches
    // its sanitizer as text and comes out as a stray "br" in the label.
    expect(received).toContain("<br/>");
    expect(received).not.toContain("&lt;");
  });
});
