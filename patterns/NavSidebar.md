---
name: NavSidebar
status: stable
since: 0.3.0
summary: Grouped navigation sidebar built from Tree and Panel, sized to its sections with one scrollbar on the column.
keywords: [nav sidebar, navigation sidebar, docs sidebar, grouped navigation, side nav, section nav, documentation navigation, collapsible sections, sidebar sections]
use_when:
  - Navigating a documentation site or an app's sections from a persistent left column
  - Several titled groups of links in one sidebar, each as tall as its own list
  - Selection is driven from the page as well as from the sidebar
avoid_when:
  - Browsing a file hierarchy with a detail pane → Explorer
  - One flat list of under ten links → a plain list
related: [Tree, SectionedTree, Panel, Card, CardGroup]
---

# Nav Sidebar Pattern

> Grouped navigation built from the same Tree and Panel a file browser uses, with the defaults a sidebar needs rather than the ones a file tree needs.

## When to Use

- A persistent left column of links, grouped under titles
- Several groups, where each should be as tall as its own list
- The page can change the selection, and the sidebar should follow it

## When NOT to Use

- Browsing a hierarchy beside a detail pane, which is [Explorer](Explorer.md)
- A single flat list of under ten links, where a plain list is less machinery

## Why this pattern exists

`Tree` and `SectionedTree` were written for file trees. A navigation sidebar
wants the opposite default on nearly every axis, and each difference arrives as
its own bug report until they are set together:

| File tree wants | A nav sidebar wants | Prop |
|---|---|---|
| A long path scrolls sideways | The label is cut off | `labelOverflow="truncate"` |
| A search box over every group | No search box on a list of four | `filterable={false}` |
| Controls to expand every branch | No expand-all chrome at all | `expandAllControl={false}` |
| Each tree scrolls inside itself | The column scrolls once | `Panel height="auto"`, or `Tree scroll={false}` |
| The icon centred on the row | The icon on the label's first line | `alignLabel="start"` |
| Selection moves the view | Selection from the page moves it too | `scrollSelectedIntoView` (on by default) |

## Composition

```
┌─ scrolling column (one scrollbar, bounded height) ──┐
│ ┌─ section title ────────────────────────────────┐  │
│ │  Tree, as tall as its own rows                 │  │
│ └────────────────────────────────────────────────┘  │
│ ┌─ section title ────────────────────────────────┐  │
│ │  Tree, as tall as its own rows                 │  │
│ └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

The bounded, scrolling column is the pattern. Everything inside it sizes to its
own content, so the column's scrollbar is the only one on screen.

## Two shapes

`preview/src/pages/patterns/NavSidebarDemo.tsx` builds both over the same 52
entries in seven sections.

### Grouped, with `SectionedTree`

The shorter answer. `SectionedTree` already sizes each section to its rows, so
only the file-tree chrome has to go:

```tsx
<div style={{ width: 260, height: 420, overflowY: "auto" }}>
  <SectionedTree
    sections={sections}
    selectedId={selectedId}
    onSelect={(node) => setSelectedId(node.id)}
    filterable={false}
    expandAllControl={false}
    labelOverflow="truncate"
  />
</div>
```

### Collapsible, with `Panel` per section

When a reader should be able to fold a section away. `height="auto"` sizes the
panel to its content, and `collapseTo="header"` leaves the title bar behind so
there is something to click to bring it back:

```tsx
<div style={{ width: 260, height: 420, overflowY: "auto" }}>
  {sections.map((section) => (
    <Panel
      key={section.id}
      title={section.label}
      height="auto"
      collapseTo="header"
      collapsed={folded.has(section.id)}
      onCollapse={() => toggleSection(section.id)}
    >
      <Tree nodes={section.nodes} expandedIds={expandedIds} onToggle={toggle} labelOverflow="truncate" />
    </Panel>
  ))}
</div>
```

A `Tree` inside a panel that is sized to its content needs no `scroll` of its
own. `scroll={false}` is for bare trees stacked in a column with no panel
around them.

## Do / Don't

- **Do** bound the column and let it own `overflow-y`. Everything inside sizes
  to its content, and one scrollbar is the result rather than the input.
- **Don't** release `overflow` on an inner tree without releasing its height.
  That leaves the rows inside a box nothing scrolls: a column 1160px of tree
  tall reports 780px of `scrollHeight`, and the rest is reachable by
  `scrollIntoView` and by nothing a user does.
- **Do** turn `filterable` off, and back on for a single section long enough to
  need it, through `TreeSection.filterable`.
- **Do** turn `expandAllControl` off. It reaches both kinds of control from
  0.3.0, so a sidebar gets neither the per-section ones nor the one above the
  sections. Before that the second stayed whatever you passed.
- **Do** keep `scrollSelectedIntoView`, so a link elsewhere on the page brings
  the sidebar to the right row.
- **Don't** reach for `labelOverflow="scroll"` here. It is the file-tree
  default, and it puts a horizontal scrollbar inside every group.
- **Do** use `alignLabel="start"` if `renderLabel` returns more than one line,
  or the icon floats at the middle of a two-line row.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { SectionedTree } from "@codesweep-ai/ui";

export function Example() {
  return (
    <div style={{ width: 260, height: 420, overflowY: "auto" }}>
      <SectionedTree
        sections={[{ id: "start", label: "Getting started", nodes: [{ id: "install", name: "Installation", type: "leaf" }] }]}
        filterable={false}
        expandAllControl={false}
        labelOverflow="truncate"
      />
    </div>
  );
}
```
