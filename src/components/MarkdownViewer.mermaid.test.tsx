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

    // The only test that loads the real Mermaid, so this wait covers a dynamic
    // import of the library and a render before any SVG exists. It measured 580
    // to 647ms against testing-library's 1000ms default, in the slowest local
    // configuration found: four cores, a cold Vite cache, every core busy.
    //
    // On the forge it failed about half its runs. Twenty attempts to reproduce
    // that locally all passed, on one, two and four cores. Fewer cores ran it
    // faster rather than slower, because vitest parallelises less and nothing
    // competes with the import, so core count is not the lever.
    //
    // The budget below is for the work rather than for the flake. A diagram
    // that never renders still fails, ten seconds later.
    await waitFor(
      () => {
        expect(container.querySelector('[data-component="MermaidDiagram"] svg')).not.toBeNull();
      },
      { timeout: 10000 },
    );
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
