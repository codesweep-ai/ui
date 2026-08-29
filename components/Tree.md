---
name: Tree
status: stable
since: 1.0.0
summary: Hierarchical tree view with expand/collapse, selection, search/filter, and optional drag-to-reorder.
keywords: [tree, hierarchy, file tree, expand collapse, treeview, navigation, folder,
           nodes, filterable, search tree, drag reorder, file browser, ast]
use_when:
  - Displaying a hierarchical data structure (file system, AST, module graph)
  - Navigating nested nodes with expand/collapse and selection
  - Searchable/filterable tree within a panel or sidebar
avoid_when:
  - Multiple grouped tree sections → SectionedTree
related: [SectionedTree, HighlightText, SearchInput, SplitPane]
patterns: [Explorer, MasterDetail]
---

# Tree

> Hierarchical tree view with expand/collapse, selection, search/filter, and optional drag-to-reorder.

## Props

```typescript
interface TreeProps<T extends TreeNode> {
  /** Root nodes */
  nodes: T[];
  /** Set of expanded node IDs */
  expandedIds: Set<string>;
  /** Currently selected node ID */
  selectedId?: string | null;
  /** Called when a leaf node is clicked */
  onSelect?: (node: T) => void;
  /** Called when a branch node's expand state toggles */
  onToggle?: (nodeId: string) => void;
  /** Enable drag-to-reorder within sibling groups */
  reorderable?: boolean;
  /** Called when siblings are reordered */
  onReorder?: (parentId: string | null, orderedIds: string[]) => void;
  /** Expand/collapse all toggle */
  onToggleExpandAll?: () => void;
  /** Whether all nodes are expanded */
  allExpanded?: boolean;
  /** Opt-in search/filter toolbar */
  filterable?: boolean;
  /** Placeholder for the filter input */
  filterPlaceholder?: string;
  /** Additional className */
  className?: string;
  /** Custom render for node label */
  renderLabel?: (node: T) => React.ReactNode;
  /** Mirror the tree: indent right-to-left, right-align content. Default: false */
  flipped?: boolean;
}

interface TreeNode {
  id: string;
  name: string;
  type: "branch" | "leaf";
  children?: TreeNode[];
}

// State-coverage props (added v1.2.0). Precedence: loading > error > empty > data.
interface TreeStateProps {
  loading?: boolean;
  error?: Error | string | null;
  errorMessage?: string;
  onRetry?: () => void;
  emptyMessage?: string;       // default: "No nodes."
  emptyHint?: string;
  emptyAction?: { label: string; onClick: () => void };
}
```

## State coverage (loading / empty / error)

The first visible item owns the roving `tabIndex=0` from mount, including Trees nested in SectionedTree. Filter result counts use a polite live region.

Tree supports the three canonical async-data states. Precedence is `loading > error > empty > data`.

- **Loading** (`loading={true}`): renders 6 skeleton rows with varying indent (mimics nested tree depth). `data-testid="tree-loading"`. Filter toolbar (if `filterable`) is preserved above the skeletons.
- **Error** (`error` set, not loading): renders a centered `AlertCircle` block — primary text from `errorMessage` (default `"Something went wrong"`), optional secondary from `error.message`/string, optional `Retry` button if `onRetry` provided. `data-testid="tree-error"`.
- **Empty** (`nodes.length === 0`, not loading, not error): renders a centered `Inbox` block — primary text from `emptyMessage` (default `"No nodes."`), optional `emptyHint`, optional `emptyAction` CTA button. `data-testid="tree-empty"`.

In every state, the outer container chrome (border, filter bar) stays where applicable so the component doesn't visually jump.

## Visual Spec

### Layout
- Container: `display: flex`, `flex-direction: column`, `overflow-y: auto`.
- Each node row: `display: flex`, `align-items: center`, `gap: var(--space-1)`.
- Indentation: `padding-left: {depth * 16 + 8}px`.

### Filter Toolbar (when `filterable` is true)
```
┌───────────────────────────┬───┐
│ Filter...               ✕ │🌲│  ← search input + clear + tree/list toggle
└───────────────────────────┴───┘
  2 / 4 matches          ▲  ▼     ← counter + next/prev (when matches exist)
  Expand all                       ← expand/collapse all (when onToggleExpandAll provided)
```

- Toolbar background: `var(--card)` — matches section headers in SectionedTree and CheckboxGroup grouped sections for visual consistency
- Search input: debounced (150ms) with 3-character minimum threshold. Shows "Type N more to search" hint below threshold.
- Toggle icon: `List` ↔ `ListTree` from lucide-react
- Next/prev: `ChevronUp` / `ChevronDown` icons
- Expand all: `UnfoldVertical` / `FoldVertical` icons

### Styling
- Node row: `padding: 4px 8px`, `border-radius: var(--radius-sm)`.
- Font-size: `var(--font-size-sm)`.
- Color: `var(--fg)`.
- Icons: 14px from lucide-react.
- `data-tree-node-id={node.id}` on each node row for scroll-into-view targeting.
- Node label: rendered in a span that clips overflow with an ellipsis. Tree does not add a native `title`; consumers that need a tooltip can provide one from `renderLabel`.

### Icon Mapping
| Element          | Icon             | Size  |
|------------------|------------------|-------|
| Collapsed branch | `ChevronRight`   | 14px  |
| Expanded branch  | `ChevronDown`    | 14px  |
| Branch node      | `Folder`         | 14px  |
| Leaf node        | `FileText`       | 14px  |
| Drag handle      | `GripVertical`   | 14px  |
| Tree/list toggle | `List`/`ListTree`| 14px  |
| Previous match   | `ChevronUp`      | 14px  |
| Next match       | `ChevronDown`    | 14px  |
| Expand all       | `UnfoldVertical` | 12px  |
| Collapse all     | `FoldVertical`   | 12px  |
| Clear filter     | `X`              | 12px  |

### States
| State              | CSS                                                              |
|--------------------|------------------------------------------------------------------|
| Default            | `background: transparent`, `color: var(--fg)`                    |
| Hover              | `background: var(--color-row-hover)`                             |
| Selected           | `background: var(--color-accent-bg)`, `color: var(--color-accent)` |
| Selected + Hover   | `background: var(--color-accent-bg-hover)`                 |
| Match (subtle)     | `background: var(--color-accent-bg)`                       |
| Current match      | `background: var(--color-accent-bg-strong)`, `ring: 1px var(--color-accent)` |
| Drag handle idle   | `opacity: 0`                                                    |
| Drag handle hover  | `opacity: 0.6` (on row hover)                                   |
| During drag        | Node `opacity: 0.5`                                             |
| Focus              | Browser default focus ring on the row                            |

### Responsive
- No breakpoint changes. Tree is always within a panel or container.

## Search / Filter Behavior

### Internals (managed inside Tree, not by consumer)
- `filterText` — raw input value (updates every keystroke)
- `debouncedFilter` — debounced value (150ms delay, 3-character minimum) that drives all matching
- `displayMode: "tree" | "flat"` — toggle between modes, default "tree"
- `currentMatchIndex` — which match is currently focused (synced on click)

### Flattening
`flattenTree()` utility walks DFS, computing full path per node by joining ancestor names with `/`. Produces `FlatEntry<T>` with `{ node, path, depth, ancestorIds }`.

### Matching
Filter `allFlat` by case-insensitive substring match on **filename only** (`node.name`), **leaf nodes only**. Directory name matches do not include their descendants. Searching "auth" matches `login_auth.ts` but not every file under an `auth/` directory.

### Expand Override
During search, Tree computes `searchExpandedIds` (union of all `ancestorIds` from matches) and uses it instead of the prop `expandedIds`. When search is cleared, the prop `expandedIds` is used again (unchanged — parent state is never mutated).

### Display Modes

**Tree with highlights** (default):
- `visibleNodeIds`: matches + their ancestors. Nodes not in this set are hidden.
- `matchNodeIds`: just the matches. Current match gets strong highlight, other matches get subtle.
- Node labels rendered with `HighlightText` to highlight the query substring.

**Flat path list**:
- Replaces the tree with a flat list of full paths, for example `src/components/Tree.tsx`.
- Each line: `FileText` icon + `HighlightText` with full path.
- Current match highlighted, clicking selects the node.

### Scroll Into View
On match change, queries the container for `[data-tree-node-id]` matching the current match and calls `scrollIntoView({ block: "nearest", behavior: "smooth" })`. Also scrolls horizontally to center the first `<mark>` highlight if it is off-screen.

### Flipped Mode

When `flipped` is true, the tree renders as a mirror image — indentation grows from right to left:

```
           /src ▿
     /components ▿
      Button.tsx
        Card.tsx
       utils.ts
```

- Node rows: `flex-direction: row-reverse`, indentation via `padding-right` instead of `padding-left`.
- Collapsed chevron: `ChevronLeft` instead of `ChevronRight`. Expanded chevron remains `ChevronDown`.
- Flat path rows: also reversed.
- Expand all / collapse all button: right-aligned.
- Filter toolbar: stays LTR (controls, not hierarchy content).
- All search, selection, and navigation logic is unchanged.

## Behavior

### Interactions
- **Click on branch chevron/name**: Toggles expand/collapse via `onToggle(nodeId)`.
- **Click on leaf**: Selects the node via `onSelect(node)`.
- **Filter input**: Debounced (150ms) with 3-character minimum. Input updates instantly; matching runs after pause.
- **Clear button (✕)**: Clears filter immediately (no debounce wait), restores original expandedIds.
- **Tree/list toggle**: Switches between tree and flat display modes.
- **Next/prev arrows**: Cycles through matches, scrolling to current match.
- **Expand all button**: When `onToggleExpandAll` is provided, renders a toggle.
- **Drag handle**: When `reorderable` is true, drag handle appears on hover.
- **Drag end**: Calls `onReorder(parentId, orderedIds)` with the new sibling order.
- **Nested reorder**: Each nesting level wraps its children in a `SiblingDndGroup` with the parent node's ID, providing an independent `DndContext` + `SortableContext` per sibling group. This allows drag-to-reorder at any depth, not just the top level.

### Keyboard
| Key          | Action                                           |
|--------------|--------------------------------------------------|
| Enter        | Select the focused node (leaf) or toggle (branch) |
| Space        | Same as Enter                                    |
| ArrowDown    | Move focus to next visible node                  |
| ArrowUp      | Move focus to previous visible node              |
| ArrowRight   | Expand focused branch, or move to first child    |
| ArrowLeft    | Collapse focused branch, or move to parent       |
| Home         | Focus first node                                 |
| End          | Focus last visible node                          |
| Tab          | Enter the tree at its current roving tab stop, or move out after that row |

### Accessibility
- Container: `role="tree"` (tree mode) or `role="listbox"` (flat mode).
- Each node: `role="treeitem"` (tree mode) or `role="option"` (flat mode).
- Branch nodes: `aria-expanded={isExpanded}`.
- Nested group: `role="group"`.
- Selected node: `aria-selected="true"`.
- `aria-level={depth + 1}` on each treeitem.

## Persistence

Tree expand/collapse state is not persisted by the Tree component itself. Parent components may persist `expandedIds` to localStorage.

## Dependencies

- `lucide-react`: `ChevronRight`, `ChevronDown`, `ChevronUp`, `FileText`, `Folder`, `X`, `ListTree`, `List`, `UnfoldVertical`, `FoldVertical`, `GripVertical`.
- `HighlightText` component for rendering search highlights.
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (only when `reorderable` is true).
- `cn()` utility for className merging.

## Edge Cases

- **Empty nodes array**: Renders the standard empty block using `emptyMessage`, `emptyHint`, and `emptyAction`.
- **Deeply nested tree (10+ levels)**: Indentation still works; content may need horizontal scroll.
- **Single node**: Renders one row, no expand/collapse.
- **Missing children on branch**: Treat as empty branch (expanded shows nothing).
- **Custom renderLabel**: Must handle its own truncation for long names. When `renderLabel` is provided, `HighlightText` is not applied automatically.
- **Drag across different parents**: Not supported — drag is within sibling groups only.
- **Empty search results**: Shows "No matches" text.
- **Search query matches a branch name**: Branch names are not match candidates; only matching leaves and their ancestors are shown.
- **Filter cleared**: Original `expandedIds` restored without mutation.

## Traceability

`data-component="Tree"` on the root `<div>`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Tree } from "@codesweep-ai/ui";
export function Example() { return <Tree nodes={[{ id: "readme", name: "README.md", type: "leaf" }]} expandedIds={new Set()} />; }
```
