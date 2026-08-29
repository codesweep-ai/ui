import type { TreeNode } from "@codesweep-ai/ui";

export const sampleTreeNodes: TreeNode[] = [
  {
    id: "src",
    name: "src",
    type: "branch",
    children: [
      {
        id: "components",
        name: "components",
        type: "branch",
        children: [
          { id: "button-tsx", name: "Button.tsx", type: "leaf" },
          { id: "card-tsx", name: "Card.tsx", type: "leaf" },
          { id: "modal-tsx", name: "Modal.tsx", type: "leaf" },
        ],
      },
      {
        id: "pages",
        name: "pages",
        type: "branch",
        children: [
          { id: "home-tsx", name: "Home.tsx", type: "leaf" },
          { id: "about-tsx", name: "About.tsx", type: "leaf" },
        ],
      },
      { id: "app-tsx", name: "App.tsx", type: "leaf" },
      { id: "main-tsx", name: "main.tsx", type: "leaf" },
    ],
  },
  {
    id: "package-json",
    name: "package.json",
    type: "leaf",
  },
  {
    id: "readme",
    name: "README.md",
    type: "leaf",
  },
];

export const sampleTableData = [
  { id: "1", name: "Panel", status: "stable", props: 7, group: "layout" },
  { id: "2", name: "Card", status: "stable", props: 4, group: "layout" },
  { id: "3", name: "Button", status: "stable", props: 3, group: "controls" },
  { id: "4", name: "Modal", status: "stable", props: 5, group: "overlay" },
  { id: "5", name: "Tree", status: "beta", props: 11, group: "navigation" },
  { id: "6", name: "SplitPane", status: "beta", props: 2, group: "layout" },
  { id: "7", name: "Table", status: "stable", props: 7, group: "data" },
  { id: "8", name: "Dropdown", status: "stable", props: 6, group: "controls" },
];

export const sampleDropdownOptions = [
  { value: "react", label: "React" },
  { value: "vue", label: "Vue" },
  { value: "svelte", label: "Svelte" },
  { value: "angular", label: "Angular" },
];

export const sampleCode = `import { useState } from "react";
import { Button } from "@codesweep-ai/ui";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-[var(--space-4)]">
      <Button variant="secondary" onClick={() => setCount(c => c - 1)}>
        -
      </Button>
      <span className="[font-size:var(--font-size-lg)] [font-weight:var(--font-weight-semibold)]">{count}</span>
      <Button variant="primary" onClick={() => setCount(c => c + 1)}>
        +
      </Button>
    </div>
  );
}`;

export const sampleMarkdown = `# Component Overview

This document demonstrates the **MarkdownViewer** component with outline navigation and canvas minimap.

## Features

The viewer supports a wide range of markdown syntax:

- GitHub Flavored Markdown (tables, task lists, strikethrough)
- Fenced code blocks with copy button
- Opt-in renderers for syntax highlighting, diagrams, and math
- GitHub-style alerts (note, tip, warning, etc.)

### Code Example

\`\`\`typescript
interface MarkdownViewerProps {
  content: string;
  outline?: boolean;
  minimap?: boolean;
  onLinkClick?: (href: string) => void;
}

export function MarkdownViewer(props: MarkdownViewerProps) {
  return <article className="markdown-content">...</article>;
}
\`\`\`

## Data Table

| Feature | Status | Notes |
|---------|--------|-------|
| GFM | Stable | Tables, task lists, strikethrough |
| Syntax Highlighting | Opt-in | Via the \`rehypePlugins\` prop |
| Mermaid | Opt-in | Via \`codeRenderers\` and the \`./mermaid\` entry |

> [!NOTE]
> The MarkdownViewer component uses design system tokens for all styling — no hardcoded colors or sizes.

## Inline Elements

Use \`inline code\` for references, **bold** for emphasis, and [links](https://example.com) for navigation.
`;
