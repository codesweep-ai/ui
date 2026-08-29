---
name: Explorer
status: stable
since: 1.0.0
summary: Tree sidebar with resizable content pane for browsing and navigating hierarchical data structures.
keywords: [explorer, file tree, tree sidebar, hierarchical navigation, split pane, document browser, file browser, nested navigation, sidebar tree, tree view]
use_when:
  - Browsing file trees, documentation structures, or package hierarchies
  - Items are in a parent/child hierarchy and selecting a leaf shows detail content
  - Multiple independent tree groups in one sidebar, such as project files and dependencies
avoid_when:
  - Flat lists with no nesting → MasterDetail
  - Fewer than ~10 items total → simple list or Dropdown
related: [SplitPane, Panel, Tree, SectionedTree, Card, CardGroup, SearchInput]
---

# Explorer Pattern

> Tree sidebar with resizable content pane for navigating hierarchical data.

## When to Use

- Browsing file trees, documentation structures, or package hierarchies
- Any UI where items are organized in a parent/child hierarchy and selecting a leaf shows detail content
- Multiple independent tree groups (e.g., project files + dependencies) via SectionedTree

## When NOT to Use

- Flat lists with no nesting (use Master-Detail instead)
- Fewer than ~10 items total (a simple list or dropdown is simpler)

## Composition

### Single-section (simple)

```
SplitPane
  ├── Panel
  │     └── Tree (filterable)
  └── Card (content)
```

### Multi-section (SectionedTree)

```
SplitPane
  ├── Panel
  │     └── SectionedTree
  │           ├── Section: "Project Files" → Tree (filterable)
  │           └── Section: "Dependencies"  → Tree (filterable)
  └── Card (content)
```

```
┌──────────────┬─────────────────────────────────┐
│ PANEL        │                                 │
│  Collapse all│         Card (content)          │
│  ▼ PROJECT   │                                 │
│   Filter...  │   Selected document rendered    │
│   ▾ src/     │   here.                         │
│     ◦ File   │                                 │
│  ▼ DEPS      │                                 │
│   Filter...  │                                 │
│   ▸ react    │                                 │
│◄───resize────►│                                │
└──────────────┴─────────────────────────────────┘
```

## Required Components

| Component      | Role                                | Required? |
|----------------|-------------------------------------|-----------|
| SplitPane      | Horizontal split with resize handle | Yes       |
| Panel          | Sidebar container with title        | Yes       |
| Tree           | Hierarchical node navigation        | Yes (single-section) |
| SectionedTree  | Multi-section tree container        | Yes (multi-section)  |
| Card           | Content display area                | Yes       |

## Tokens

| Token                  | Usage                        |
|------------------------|------------------------------|
| `--space-4`            | Panel/Card inner padding     |
| `--space-2`            | Tree node vertical spacing   |
| `--radius-md`          | Card corner radius           |
| `--color-accent` | Selected tree node highlight |
| `--border`             | Panel right border, Card border |
| `--card`               | Section header background    |

## State

```typescript
// Selection — which tree node is active
const [selectedId, setSelectedId] = useState<string | null>(null);

// Content lookup — map node ID to display content
const content = selectedId ? contentMap[selectedId] : null;

// For standalone Tree (not SectionedTree), manage expand state externally:
const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["root", "src"]));
const [allExpanded, setAllExpanded] = useState(false);
```

`SectionedTree` manages its own expand/collapse state internally. Standalone `Tree` requires external expand state via `expandedIds` / `onToggle`.

## Example

```tsx
import { useState } from "react";
import { SplitPane } from "@codesweep-ai/ui";
import { Panel } from "@codesweep-ai/ui";
import { SectionedTree, type TreeSection } from "@codesweep-ai/ui";
import { Card } from "@codesweep-ai/ui";

const sections: TreeSection[] = [
  { id: "files", label: "Project Files", nodes: fileTree },
  { id: "deps", label: "Dependencies", nodes: depTree },
];

function Explorer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const content = selectedId ? contentMap[selectedId] : null;

  return (
    <SplitPane
      className="h-full"
      panes={[
        {
          id: "sidebar",
          defaultWidth: 300,
          minWidth: 220,
          maxWidth: 450,
          children: (
            <Panel title="Explorer">
              <SectionedTree
                sections={sections}
                selectedId={selectedId}
                onSelect={(node) => setSelectedId(node.id)}
              />
            </Panel>
          ),
        },
        {
          id: "content",
          children: (
            <div className="explorer-detail">
              {content ? (
                <Card header={content.title}>
                  <p className="[color:var(--fg)] [font-size:var(--font-size-body)]">
                    {content.body}
                  </p>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center [color:var(--muted)]">
                  Select an item from the tree
                </div>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
```

### Flipped variant (tree on right)

```tsx
<SplitPane
  className="h-full"
  panes={[
    { id: "content", children: <ContentArea /> },
    {
      id: "sidebar",
      defaultWidth: 300,
      minWidth: 220,
      maxWidth: 450,
      children: (
        <Panel title="Project Files">
          <Tree
            nodes={fileTree}
            expandedIds={expandedIds}
            selectedId={selectedId}
            onSelect={(node) => setSelectedId(node.id)}
            onToggle={(id) => toggleExpand(id)}
            filterable
            filterPlaceholder="Search files..."
            flipped
          />
        </Panel>
      ),
    },
  ]}
/>
```

## Variants

- **Default**: Tree sidebar (240-280 px) + content pane
- **Multi-section**: SectionedTree with collapsible sections, each with independent filter
- **Flipped**: Tree on the right, content on the left — use `flipped` prop on Tree and swap pane order
- **Collapsed sidebar**: Panel hidden via `collapsed` prop; content fills full width
- **Maximizable**: Wrap in `CardGroup` + `Card maximizable` for full-screen toggle

## Interactions

| User Action           | Result                                      |
|-----------------------|---------------------------------------------|
| Click branch node     | Expand/collapse children                    |
| Click leaf node       | Show leaf content in Card                   |
| Drag resize handle    | Adjust sidebar width (respects min/max)     |
| Click Panel collapse  | Hide sidebar, content fills available space |
| Type in filter        | Filter tree nodes by filename (3+ chars, debounced) |
| Toggle tree/list view | Switch between tree and flat path list      |
| Navigate matches      | Cycle through search matches with scroll    |

## Do / Don't

- **Do** set `storageKey` on SplitPane panes so the user's width preference persists.
- **Do** pre-expand the first branch so the tree isn't fully collapsed on load.
- **Do** use `filterable` on Tree when the tree has more than ~15 nodes.
- **Do** use SectionedTree when you have multiple independent tree groups.
- **Don't** nest more than 3-4 levels deep; flatten if possible.
- **Don't** put interactive controls inside the content Card header—keep it a label.
