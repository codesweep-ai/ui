---
name: MarkdownViewer
status: stable
since: 1.0.0
summary: Document browser with outline navigation, minimap, and rich markdown rendering for in-app documentation.
keywords: [markdown viewer, document browser, markdown renderer, outline navigation, minimap, documentation, readme viewer, spec viewer, doc browser, in-app docs]
use_when:
  - Rendering documentation, specs, or help content in-app
  - Building a document browser with file tree navigation
  - Showing README or changelog files alongside code
avoid_when:
  - Plain text display without headings → simple pre or paragraph
  - Short snippets where outline adds no value
  - Editing markdown → read-only viewer only
related: [MarkdownViewer, MarkdownMinimap, SplitPane, Panel, Tree, Card, CardGroup]
---

# Markdown Viewer Pattern

> Document browser with outline navigation, minimap, and rich markdown rendering.

## When to Use

- Rendering documentation, specs, or help content in-app
- Building a document browser with file tree navigation
- Showing README or changelog files alongside code
- Any UI that needs rich markdown with navigation aids

## When NOT to Use

- Plain text display — use a simple `<pre>` or paragraph
- Short snippets without headings — outline adds no value
- Editing markdown — this is a read-only viewer

## Composition

```
┌─ SplitPane ──────────────────────────────────────────────┐
│ ┌─ Panel ──────┐  ┌─ MarkdownViewer ──────────────────┐ │
│ │  Tree         │  │  Outline │ Content      │ Minimap │ │
│ │  (file list)  │  │          │              │         │ │
│ │               │  │          │              │         │ │
│ └───────────────┘  └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## Required Components

| Component | Role | Required? |
|-----------|------|-----------|
| `MarkdownViewer` | Main renderer with outline + minimap | Yes |
| `SplitPane` | Resizable layout between tree and viewer | Yes (for document browser) |
| `Panel` | Container for file tree sidebar | Yes (for document browser) |
| `Tree` | File/document tree navigation | Yes (for document browser) |
| `Card` + `CardGroup` | Maximizable container | No |

## Tokens

| Token | Usage |
|-------|-------|
| `--border` | Panel separators, code block borders, table borders |
| `--color-link` | Links, note alert border |
| `--color-accent-bg-strong` | Active heading highlight, viewport indicator |
| `--color-accent` | Outline resize handle hover stripe |
| `--color-bg-subtle` | Code block body, table alternating rows |
| `--card` | Code block header, table header |
| `--muted` | Minimap heading blocks, inactive outline items |
| `--color-success`, `--color-warning`, `--color-error` | Alert variant colors |
| `--color-cat-5` | Important alert variant |
| `--font-family-mono` | Inline code, code blocks |
| `--icon-size-md` | All icons |

## State

The MarkdownViewer component manages most state internally. The consumer only manages document selection and tree expansion.

### Consumer state (you manage)

```typescript
// Document selection and tree state
const [selectedDocId, setSelectedDocId] = useState<string | null>("default-id");
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["root"]));
const doc = selectedDocId ? documents[selectedDocId] : null;
```

### Internal state (managed by MarkdownViewer)

The component manages these internally — you don't need to set them, but understanding them helps when debugging or extending:

```typescript
// Heading extraction: parsed from markdown content via regex on mount/content change
// Produces an array of { level, text, slug } used by outline and minimap
const headings = useMemo<Heading[]>(() => {
  // Regex scans content for lines matching /^(#{1,6})\s+(.+)$/
  // Strips inline formatting (*_`~) and slugifies for anchor IDs
}, [content]);

// Active heading tracking: scroll listener on content container
// Debounced (50ms), finds the last heading whose top is above a detection offset (100px)
const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);

// Outline panel: resizable width with drag handle, collapsible
const [outlineWidth, setOutlineWidth] = useState(200); // range: 120–400px
const [outlineCollapsed, setOutlineCollapsed] = useState(false);

// Minimap panel: fixed width (120px), collapsible
const [minimapCollapsed, setMinimapCollapsed] = useState(false);

// Copy feedback: tracks which code block was just copied
const [copiedId, setCopiedId] = useState<string | null>(null);
// Resets to null after 2000ms
```

### Controlled collapse (optional)

You can control outline/minimap collapse state via props:

```typescript
<MarkdownViewer
  content={doc.content}
  outline
  minimap
  outlineCollapsed={isOutlineCollapsed}
  minimapCollapsed={isMinimapCollapsed}
/>
```

## Example

```tsx
import { useState } from "react";
import { SplitPane } from "@codesweep-ai/ui";
import { Panel } from "@codesweep-ai/ui";
import { Tree } from "@codesweep-ai/ui";
import { MarkdownViewer } from "@codesweep-ai/ui/markdown";

function DocBrowser({ tree, documents }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["docs"]));

  const doc = selectedId ? documents[selectedId] : null;

  return (
    <SplitPane
      panes={[
        {
          id: "tree",
          defaultWidth: 240,
          minWidth: 180,
          children: (
            <Panel title="Documents">
              <Tree
                nodes={tree}
                expandedIds={expandedIds}
                selectedId={selectedId}
                onToggle={(id) => {
                  setExpandedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                onSelect={(node) => setSelectedId(node.id)}
              />
            </Panel>
          ),
        },
        {
          id: "content",
          children: doc ? (
            <MarkdownViewer content={doc.content} outline minimap />
          ) : (
            <div className="h-full flex items-center justify-center [color:var(--muted)]">
              Select a document
            </div>
          ),
        },
      ]}
    />
  );
}
```

This example uses the lightweight `@codesweep-ai/ui/markdown` entry. If the document browser enables remark/rehype plugins (math or syntax highlighting), import the same `MarkdownViewer` name from `@codesweep-ai/ui/markdown/rich` instead. Parser choice is an import-time bundle decision, not a runtime prop.

## Variants

- **Outline only** (`outline`): Short docs where minimap adds no value
- **Minimap only** (`minimap`): Long docs without heading navigation
- **Both** (`outline minimap`): Full document browser experience
- **Neither** (no props): Embedded markdown rendering
- **With math** (`@codesweep-ai/ui/markdown/rich` + `remarkPlugins` + `rehypePlugins`): Technical/scientific documentation with consumer-supplied LaTeX plugins
- **Custom renderers** (`codeRenderers={{ sql: SqlPreview }}`): Domain-specific code visualization

## Interactions

| User Action | Result |
|-------------|--------|
| Click outline heading | Smooth scroll to heading in content |
| Scroll content | Active heading updates in outline (debounced 50ms) |
| Click minimap | Smooth scroll to clicked position |
| Drag minimap | Direct scroll (no smooth) to dragged position |
| Click copy button | Copy code to clipboard, show Check icon for 2s |
| Click external link | Opens in new tab (`target="_blank"`) |
| Click anchor link (`#…`) | Smooth scroll within content |
| Drag outline edge | Resize outline panel (120–400px), accent stripe on hover |
| Collapse outline | Width transitions to 0, toggle button appears |
| Collapse minimap | Width transitions to 0, toggle button appears |

## Do / Don't

- **Do** use `outline` for docs with multiple headings — it provides quick navigation.
- **Do** use `onLinkClick` for cross-document navigation within a doc browser.
- **Do** provide `codeRenderers` for domain-specific languages (SQL preview, diagram rendering).
- **Do** wrap in a fixed-height container — the viewer needs a constrained scroll area.
- **Don't** enable `outline` for content without headings — the empty panel wastes space.
- **Don't** import the rich entry or add math, diagram, or highlighting plugins unless the content needs them — the lightweight default keeps the bundle small.
- **Don't** handle link clicks with global event listeners — use the `onLinkClick` prop.
- **Don't** override the `pre` element outside the component — use `codeRenderers` instead.
- **Don't** render without a height constraint — the viewer expects `height: 100%` or another explicit parent height.
