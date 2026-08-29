import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CodeBlock } from "./CodeBlock";
import json from "highlight.js/lib/languages/json";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CodeBlock", () => {
  it("renders code with data-component", () => {
    const { container } = render(<CodeBlock code="hello world" />);
    expect(container.querySelector('[data-component="CodeBlock"]')).not.toBeNull();
    expect(container.textContent).toContain("hello world");
  });

  it("renders language label when language is provided (and no source)", () => {
    render(<CodeBlock code="x" language="typescript" />);
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("source label overrides language label", () => {
    render(<CodeBlock code="x" language="typescript" source="src/index.ts" />);
    expect(screen.getByText("src/index.ts")).toBeInTheDocument();
    expect(screen.queryByText("typescript")).not.toBeInTheDocument();
  });

  it("renders line numbers (1, 2, 3 for 3 lines)", () => {
    render(<CodeBlock code={"line a\nline b\nline c"} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("data-language attr on the <code> reflects language prop", () => {
    const { container } = render(<CodeBlock code="x" language="rust" />);
    const code = container.querySelector("code");
    expect(code).toHaveAttribute("data-language", "rust");
  });

  it("copy button calls navigator.clipboard.writeText with code", async () => {
    // setup.ts installs a vi.fn() at navigator.clipboard.writeText
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    render(<CodeBlock code="copy me" />);
    await userEvent.click(screen.getByLabelText("Copy code to clipboard"));
    expect(writeText).toHaveBeenCalledWith("copy me");
  });

  it("uses a focusable scroll area without creating a region landmark", () => {
    const { container } = render(<CodeBlock code="x" />);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(container.querySelector('[aria-label="Scrollable code"]')).toHaveAttribute("tabindex", "0");
  });

  it("falls back to escaped raw text when language is unknown", () => {
    const { container } = render(
      <CodeBlock code="<not a tag>" language="not-a-language" />,
    );
    expect(container.textContent).toContain("<not a tag>");
  });

  it("highlights with an explicitly supplied grammar", async () => {
    const { container } = render(<CodeBlock code={'{"ok": true}'} language="json-test" languages={{ "json-test": json }} />);
    await waitFor(() => expect(container.querySelector(".hljs-attr")).not.toBeNull());
  });

  describe("inline mode", () => {
    // Find the inner content scroll-wrapper. It's the immediate parent of the
    // <pre>, where the overflow + maxHeight inline-style live.
    const findScrollWrapper = (container: HTMLElement) =>
      container.querySelector("pre")?.parentElement ?? null;

    it("default mode sets max-height (20rem) and overflow-auto on the content wrapper", () => {
      const { container } = render(<CodeBlock code="x" />);
      const wrapper = findScrollWrapper(container)!;
      expect(wrapper).not.toBeNull();
      expect(wrapper.style.maxHeight).toBe("20rem");
      expect(wrapper.className).toContain("overflow-auto");
    });

    it("inline mode strips max-height and uses horizontal-only scrolling", () => {
      const { container } = render(<CodeBlock code="x" inline />);
      const wrapper = findScrollWrapper(container)!;
      expect(wrapper).not.toBeNull();
      expect(wrapper.style.maxHeight).toBe("");
      expect(wrapper.className).toContain("cs-component-code-block-63");
      expect(wrapper.className).not.toContain("overflow-auto ");
    });

    it("fillHeight wins over inline when both are set", () => {
      const { container } = render(<CodeBlock code="x" inline fillHeight />);
      const wrapper = findScrollWrapper(container)!;
      expect(wrapper).not.toBeNull();
      // fillHeight branch uses its dedicated flexible scrolling style.
      expect(wrapper.className).toContain("overflow-auto");
      expect(wrapper.className).toContain("cs-component-code-block-62");
      expect(wrapper.style.maxHeight).toBe("");
    });
  });

  it("highlights every block sharing a grammar, not just the one that registered it", async () => {
    // highlight.js's registry is module-global. The first block to mount
    // registers the grammar; the rest render before that happens and their
    // effect then sees the language already registered. Unless registration is
    // observable, those blocks keep their escaped output forever — which shipped
    // in a consumer as three of four JSON payloads rendering monochrome.
    const payload = JSON.stringify({ command: "build", ok: true, count: 3 }, null, 2);
    const { container } = render(
      <>
        <CodeBlock code={payload} language="json" languages={{ json }} inline />
        <CodeBlock code={payload} language="json" languages={{ json }} inline />
        <CodeBlock code={payload} language="json" languages={{ json }} inline />
      </>,
    );

    await waitFor(() => {
      const blocks = [...container.querySelectorAll("pre code")];
      expect(blocks).toHaveLength(3);
      for (const block of blocks) {
        expect(block.querySelectorAll('span[class^="hljs-"]').length).toBeGreaterThan(0);
      }
    });
  });
});
