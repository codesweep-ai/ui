import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MermaidDiagram } from "./MermaidDiagram";

// Mock the mermaid module — its real implementation does heavy DOM work
// (creates a hidden iframe, runs SVG layout) that's unnecessary here.
vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn().mockResolvedValue({ svg: "<svg><g>stub diagram</g></svg>" }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MermaidDiagram — smoke", () => {
  it("renders the SVG returned by mermaid.render", async () => {
    const { container } = render(<MermaidDiagram chart="flowchart TD\nA --> B" />);
    await waitFor(() => {
      expect(container.querySelector("svg")).not.toBeNull();
    });
    expect(container.textContent).toContain("stub diagram");
    const mermaid = await import("mermaid");
    expect(mermaid.default.initialize).toHaveBeenCalledWith(expect.objectContaining({
      securityLevel: "strict",
      htmlLabels: false,
    }));
  });

  it("marks the rendered branch with data-mermaid-rendered, and not the error branch", async () => {
    const { container } = render(<MermaidDiagram chart="flowchart TD\nA --> B" />);
    await waitFor(() => {
      expect(container.querySelector('[data-mermaid-rendered="true"]')).not.toBeNull();
    });

    // The error branch must not claim a diagram drew — that is the whole point
    // of the hook, and a gate asserting on it would otherwise pass on a failure.
    const failed = render(<MermaidDiagram chart="   " />);
    await waitFor(() => {
      expect(failed.getByText("Diagram Error")).toBeInTheDocument();
    });
    expect(failed.container.querySelector('[data-mermaid-rendered="true"]')).toBeNull();
    expect(failed.container.querySelector('[data-mermaid-rendered="false"]')).not.toBeNull();
  });

  it("shows error block for empty chart string", async () => {
    const { container } = render(<MermaidDiagram chart="   " />);
    await waitFor(() => {
      expect(screen.getByText("Diagram Error")).toBeInTheDocument();
    });
    // The original (whitespace) chart is shown in a <pre> inside the error block
    expect(container.querySelector(".md-mermaid-error__code")).not.toBeNull();
  });

  it("shows error block when mermaid.render throws", async () => {
    const mermaid = await import("mermaid");
    (mermaid.default.render as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("syntax error"),
    );
    render(<MermaidDiagram chart="flowchart TD\nA --> B" />);
    await waitFor(() => {
      expect(screen.getByText("Diagram Error")).toBeInTheDocument();
    });
  });

  it("shows a typed error when the optional peer resolves to a stub (UI-04)", async () => {
    const mermaidModule = await import("mermaid");
    const api = mermaidModule.default as unknown as {
      render: typeof mermaidModule.default.render | undefined;
    };
    const originalRender = api.render;
    api.render = undefined;
    try {
      const { container } = render(
        <MermaidDiagram chart="flowchart TD\nA --> B" />,
      );
      await waitFor(() => {
        expect(
          container.querySelector('[data-error-kind="missing-dependency"]'),
        ).not.toBeNull();
      });
      expect(
        screen.getByText(/Install the optional "mermaid" peer dependency/),
      ).toBeInTheDocument();
    } finally {
      api.render = originalRender;
    }
  });

  it("merges consumer className", async () => {
    const { container } = render(
      <MermaidDiagram chart="flowchart TD\nA --> B" className="cm-cls" />,
    );
    await waitFor(() => {
      expect(container.querySelector(".cm-cls")).not.toBeNull();
    });
  });

  it("renders data-component on the success-branch root", async () => {
    const { container } = render(<MermaidDiagram chart="flowchart TD\nA --> B" />);
    await waitFor(() => {
      expect(
        container.querySelector('[data-component="MermaidDiagram"]'),
      ).not.toBeNull();
    });
  });

  it("renders data-component on the error-branch root", async () => {
    const { container } = render(<MermaidDiagram chart="   " />);
    await waitFor(() => {
      expect(screen.getByText("Diagram Error")).toBeInTheDocument();
    });
    expect(
      container.querySelector('[data-component="MermaidDiagram"]'),
    ).not.toBeNull();
  });

  it("injects the sketch filter when sketch is set", async () => {
    const { container } = render(<MermaidDiagram chart="flowchart TD\nA --> B" sketch />);
    await waitFor(() => {
      expect(container.querySelector("svg")).not.toBeNull();
    });
    await waitFor(() => {
      expect(container.querySelector("filter")).not.toBeNull();
    });
  });

  it("does not inject the sketch filter by default", async () => {
    const { container } = render(<MermaidDiagram chart="flowchart TD\nA --> B" />);
    await waitFor(() => {
      expect(container.querySelector("svg")).not.toBeNull();
    });
    expect(container.querySelector("filter")).toBeNull();
  });
});
