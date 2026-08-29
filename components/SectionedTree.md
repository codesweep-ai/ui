---
name: SectionedTree
status: stable
since: 1.0.0
summary: Self-managing component that renders multiple independent tree sections with collapsible headers, per-section search, and shared selection.
keywords: [sectioned tree, grouped tree, file explorer, multi-section, collapsible,
           sidebar, navigation, tree groups, project files, dependencies, explorer]
use_when:
  - Showing multiple independent tree groups, such as project files and dependencies
  - Explorer-style sidebar with collapsible named sections
  - Shared single-selection across multiple tree groups
avoid_when:
  - Single flat tree without grouping → Tree
  - Static program structure without grouping → Tree
related: [Tree, SearchInput, HighlightText, SplitPane]
patterns: [Explorer, MasterDetail]
---

# SectionedTree

> Self-managing component that renders multiple independent tree sections with collapsible headers, per-section search, and shared selection.

## Props

```typescript
interface TreeSection<T extends TreeNode = TreeNode> {
  id: string;
  label: string;
  nodes: T[];
}

interface SectionedTreeProps<T extends TreeNode = TreeNode> {
  /** Array of tree sections to render */
  sections: TreeSection<T>[];
  /** Currently selected node ID (shared across all sections) */
  selectedId?: string | null;
  /** Called when a leaf node is selected in any section */
  onSelect?: (node: T) => void;
  /** Additional className on the root container */
  className?: string;
  /** Custom render for node label */
  renderLabel?: (node: T) => React.ReactNode;
  /** Mirror the tree: indent right-to-left, right-align content. Default: false */
  flipped?: boolean;
  /** Loading state: render skeleton sections. */
  loading?: boolean;
  /** Error state: when set, render the error block. */
  error?: Error | string | null;
  /** Override the error primary text (default: "Something went wrong"). */
  errorMessage?: string;
  /** Retry handler — when provided, renders a Retry button in the error block. */
  onRetry?: () => void;
  /** Empty state primary text. Default: "No sections." */
  emptyMessage?: string;
  /** Empty state secondary text. */
  emptyHint?: string;
  /** Empty state CTA. */
  emptyAction?: { label: string; onClick: () => void };
}
```

## State coverage (loading / empty / error)

Same precedence rules as [Tree](./Tree.md#state-coverage-loading--empty--error) (`loading > error > empty > data`), applied at the component level (not per-section). Test IDs: `sectionedtree-loading`, `sectionedtree-error`, `sectionedtree-empty`. Empty state shown when `sections.length === 0` (and not loading/error).

Each expanded section's inner Tree seeds its own roving tab stop, so Tab can enter every section.

## Visual Spec

### Layout

```
┌───────────────────────────┐
│ Collapse all              │ ← section-level collapse/expand toggle
│ ▼ PROJECT FILES      35   │ ← sticky section header
│   ┌─────────────────────┐ │
│   │ Filter...         ✕ │ │ ← Tree's own filterable UI
│   └─────────────────────┘ │
│   Expand all              │
│   ▾ src/                  │
│     ▾ components/         │
│       ◦ Button.tsx        │
│   ...                     │
│ ▼ DEPENDENCIES       20   │ ← sticky section header
│   ┌─────────────────────┐ │
│   │ Filter...         ✕ │ │
│   └─────────────────────┘ │
│   ...                     │
│ ▶ MODULES             8   │ ← collapsed section
└───────────────────────────┘
```

### Section Header
- Sticky positioned with `position: sticky`, `top: 0`, and `z-index: var(--z-sticky)`.
- Same style as CheckboxGroup grouped sections
- Chevron + uppercase label + total node count
- Background: `var(--card)` for sticky overlap

### Styling
- Section headers: `font-size: var(--font-size-xs)`, `font-weight: semibold`, `text-transform: uppercase`, `letter-spacing: 0.5px`
- Color: `var(--muted)`, hover: `var(--fg)`
- Node count: `font-variant-numeric: tabular-nums`
- Filter toolbar (within each Tree): `background: var(--card)` — consistent with section headers above

## Internal State

The component is self-managing. Consumer only provides data and selection; component owns:

- `collapsedSections: Set<string>` — which sections are collapsed
- `expandedIdsMap: Record<string, Set<string>>` — per-section tree expand state
- `allExpandedMap: Record<string, boolean>` — per-section expand-all toggle state

## Behavior

### Interactions

| User Action                | Result                                          |
|----------------------------|-------------------------------------------------|
| Click section header       | Toggle section collapse/expand                  |
| Click "Collapse all"       | Collapse all sections                           |
| Click "Expand all" (top)   | Expand all sections (when all collapsed)        |
| Type in section filter     | Filter that section's tree independently        |
| Click node in any section  | Fires shared `onSelect` callback                |
| Expand all (per-section)   | Expands all branches in that section            |

### Section-Level Controls
- Top-level "Collapse all" / "Expand all" button toggles all section headers
- Each section has its own `<Tree filterable>` with independent filter, display mode, and expand state

### Shared Selection
- `selectedId` is shared across all sections
- A selection in one section is visually indicated in all (only one node matches)

### Flipped Mode
When `flipped` is true, the prop is passed through to each `<Tree>`. Section headers also reverse (`flex-direction: row-reverse`, `ChevronLeft` for collapsed). The collapse-all button right-aligns. See [Tree — Flipped Mode](./Tree.md#flipped-mode) for full details.

## Dependencies

- `Tree` component (with `filterable` support)
- `lucide-react`: `ChevronRight`, `ChevronDown`
- `cn()` utility for className merging

## Edge Cases

- **Single section**: Renders one section; collapse-all button still shown.
- **Empty section (no nodes)**: Section header shows count 0 and its nested Tree renders the standard “No nodes.” empty state.
- **All sections collapsed**: Top button shows "Expand all".
- **Selection in collapsed section**: Selected state preserved but not visible until section is expanded.

## Traceability

`data-component="SectionedTree"` on the root `<div>`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { SectionedTree } from "@codesweep-ai/ui";
export function Example() { return <SectionedTree sections={[{ id: "src", label: "Source", nodes: [{ id: "readme", name: "README.md", type: "leaf" }] }]} />; }
```
