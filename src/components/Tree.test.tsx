import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tree, type TreeNode } from "./Tree";

const nodes: TreeNode[] = [
  {
    id: "root",
    name: "src",
    type: "branch",
    children: [
      { id: "a", name: "App.tsx", type: "leaf" },
      {
        id: "lib",
        name: "lib",
        type: "branch",
        children: [{ id: "cn", name: "cn.ts", type: "leaf" }],
      },
    ],
  },
];

describe("Tree", () => {
  it("seeds the first visible node as the roving tab stop on mount", async () => {
    render(<Tree nodes={nodes} expandedIds={new Set(["root"])} />);
    await waitFor(() => expect(screen.getByText("src").closest('[role="treeitem"]')).toHaveAttribute("tabindex", "0"));
  });
  // The row-hover rule carries a class and a pseudo-class, so it outranked the
  // selection class on its own and a hovered selected row went grey. A real
  // :hover needs a real cursor, which a headless browser will not give a test,
  // so this asserts that a rule exists which reaches a selected row and paints
  // the accent the specification names.
  it("keeps the accent on a selected row under the pointer", () => {
    const { container } = render(
      <Tree nodes={nodes} expandedIds={new Set(["root"])} selectedId="root" />,
    );

    let rule: CSSStyleRule | undefined;
    for (const sheet of document.styleSheets) {
      for (const candidate of sheet.cssRules) {
        const selector = (candidate as CSSStyleRule).selectorText;
        if (selector?.includes("cs-component-tree-28") && selector.includes(":hover")) {
          rule = candidate as CSSStyleRule;
        }
      }
    }

    expect(rule, "no hover rule reaches a selected row").toBeDefined();
    expect(rule!.style.backgroundColor).toBe("var(--color-accent-bg-hover)");

    const row = container.querySelector(".cs-component-tree-28");
    expect(row).not.toBeNull();
    expect(row!.matches(rule!.selectorText.replace(/:hover/g, ""))).toBe(true);
  });

  it("renders top-level node names when expanded", () => {
    render(<Tree nodes={nodes} expandedIds={new Set(["root"])} />);
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByText("App.tsx")).toBeInTheDocument();
    expect(screen.getByText("lib")).toBeInTheDocument();
  });

  it("collapsed nodes hide children", () => {
    render(<Tree nodes={nodes} expandedIds={new Set()} />);
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.queryByText("App.tsx")).not.toBeInTheDocument();
    expect(screen.queryByText("lib")).not.toBeInTheDocument();
  });

  it("nested children visible only when grandparent + parent both expanded", () => {
    render(<Tree nodes={nodes} expandedIds={new Set(["root", "lib"])} />);
    expect(screen.getByText("cn.ts")).toBeInTheDocument();
  });

  it("clicking a leaf fires onSelect with the node", async () => {
    const onSelect = vi.fn();
    render(
      <Tree
        nodes={nodes}
        expandedIds={new Set(["root"])}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByText("App.tsx"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a", name: "App.tsx" }),
    );
  });

  it("clicking a branch fires onToggle with the branch id", async () => {
    const onToggle = vi.fn();
    render(
      <Tree
        nodes={nodes}
        expandedIds={new Set(["root"])}
        onToggle={onToggle}
      />,
    );
    await userEvent.click(screen.getByText("lib"));
    expect(onToggle).toHaveBeenCalledWith("lib");
  });

  it("filterable=true renders a search input; matching node stays visible", async () => {
    render(
      <Tree
        nodes={nodes}
        expandedIds={new Set(["root", "lib"])}
        filterable
      />,
    );
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "App");
    // Positive assertion only: the matched leaf is still in the doc.
    // (Tree's filter algorithm keeps ancestor branches visible to preserve
    // tree structure; non-matching sibling visibility depends on the path.)
    expect(screen.getByText("App.tsx")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1 / 1 matches"));
  });

  it("renderLabel customizes node label rendering", () => {
    render(
      <Tree
        nodes={nodes}
        expandedIds={new Set(["root"])}
        renderLabel={(n) => <span>X-{n.name}</span>}
      />,
    );
    expect(screen.getByText("X-src")).toBeInTheDocument();
    expect(screen.getByText("X-App.tsx")).toBeInTheDocument();
  });

  it("keeps focus on the first item when ArrowUp is pressed", async () => {
    render(<Tree nodes={nodes} expandedIds={new Set(["root"])} />);
    const first = screen.getByText("src").closest<HTMLElement>('[role="treeitem"]')!;
    await waitFor(() => expect(first).toHaveAttribute("tabindex", "0"));
    first.focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(first).toHaveFocus();
  });
});
