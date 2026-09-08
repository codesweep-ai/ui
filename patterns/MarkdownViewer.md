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

The decision this pattern is about is which markdown entry to import. It is
made at import time, it decides what the bundle costs, and no runtime prop
changes it afterwards.

`preview/src/pages/patterns/MarkdownViewerDemo.tsx` is the worked example, and
it is a ladder rather than a layout. One document renders through six flavours,
one at a time, and each rung names its import line, what it adds, when to reach
for it, and what it costs in bytes. `?flavor=<slug>` selects a rung. Below the
ladder the same viewer takes a long document and an outline panel.

The point the ladder makes is that diagrams and per-language highlighting come
from `codeRenderers`, which both entries share. Only the remark and rehype
plugin seam needs the rich entry, along with footnotes and bare autolinks.

The three-pane document browser is the other composition, and it is the **Docs**
tab rather than this one, where it browses this package's own specifications:

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

Everything else is the component's own: heading extraction, the active heading
the outline tracks, the outline width and the two collapse flags. The widths,
the debounce and the rest are specified once, in
[components/MarkdownViewer.md](../components/MarkdownViewer.md), and restating
them here would give a reader two places to check and one to update.

### Pane collapse

Each pane is controlled or not on its own. Own the value when the surrounding
app has a reason to, and pass the callback either way:

```typescript
<MarkdownViewer
  content={doc.content}
  outline
  minimap
  outlineCollapsed={isOutlineCollapsed}
  onOutlineCollapsedChange={setOutlineCollapsed}
/>
```

A doc browser usually wants neither. Give it a `storageKey` and the viewer keeps
its own arrangement across the remount that every document switch causes:

```typescript
<MarkdownViewer content={doc.content} outline minimap storageKey="docs-viewer-panes" />
```

## Example — the document browser

This is the Docs tab's composition, not this tab's. It is the shape to copy
when a consumer wants a tree beside a viewer.

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
            <div className="docs-empty">
              Select a document
            </div>
          ),
        },
      ]}
    />
  );
}
```

The class the example uses, in plain CSS:

```css
.docs-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--muted);
}
```

This example uses the lightweight `@codesweep-ai/ui/markdown` entry. If the document browser enables remark/rehype plugins (math or syntax highlighting), import the same `MarkdownViewer` name from `@codesweep-ai/ui/markdown/rich` instead. Parser choice is an import-time bundle decision, not a runtime prop.

## Variants

- **Outline only** (`outline`): Short docs where minimap adds no value
- **Minimap only** (`minimap`): Long docs without heading navigation
- **Both** (`outline minimap`): Full document browser experience
- **Neither** (no props): Embedded markdown rendering
- **With math** (`@codesweep-ai/ui/markdown/rich` + `remarkPlugins` + `rehypePlugins`): Technical/scientific documentation with consumer-supplied LaTeX plugins
- **Custom renderers** ({% raw %}`codeRenderers={{ sql: SqlPreview }}`{% endraw %}): Domain-specific code visualization

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

## Compiling usage example

<!-- docs-compile -->
```tsx
import { MarkdownViewer } from "@codesweep-ai/ui/markdown";

export function Example() {
  return <MarkdownViewer content={"# Scan result\n\nA paragraph, and a `code span`."} outline />;
}
```
