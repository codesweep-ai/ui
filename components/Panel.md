---
name: Panel
status: stable
since: 1.0.0
summary: Collapsible side panel with a header and scrollable content area. Used for file trees, doc outlines, and filter panels inside flex layouts.
keywords: [panel, sidebar, collapsible, side panel, pane, drawer, filter panel,
           file tree panel, outline, collapse, expand, header, layout]
use_when:
  - Providing a collapsible sidebar alongside main content in a flex layout
  - Wrapping a Tree, SectionedTree, or filter controls in a titled panel
  - Building a two- or three-column layout with SplitPane
avoid_when:
  - Full-screen overlay → Modal
  - Simple card container without collapse → Card
related: [SplitPane, Tree, SectionedTree, Card]
patterns: [Explorer, MasterDetail, Dashboard, NavSidebar]
---

# Panel

> Collapsible side panel with header, used for file trees, doc outlines, and filter panels.

## Props

```typescript
interface PanelProps {
  /** Panel title displayed in the header (uppercased automatically) */
  title: string;
  /** Width in px or any CSS length. If omitted, panel fills available flex space. */
  width?: number | string;
  /** Height in px or any CSS length. `"auto"` sizes the panel to its content. */
  height?: number | string;
  /** Whether the panel is collapsed */
  collapsed?: boolean;
  /** Called when the user clicks the collapse button */
  onCollapse?: () => void;
  /** What is left on screen when collapsed. Default: "edge" */
  collapseTo?: "edge" | "header";
  /** Content */
  children: React.ReactNode;
  /** Additional className merged onto the root */
  className?: string;
  /** Header action buttons (rendered right side of header) */
  actions?: React.ReactNode;
}
```

## Visual Spec

### Layout
- Root: `display: flex`, `flex-direction: column`, `height: 100%`.
- If `width` is a number it is interpreted as pixels; string values accept any CSS length. A set width also applies `flex-shrink: 0`.
- If `width` is omitted: `flex: 1`, `min-width: 0`.
- Height is `100%` unless `height` says otherwise. `height="auto"` sizes the
  panel to its content and hands the scrolling to an ancestor, which is what a
  stack of titled sections in one scrolling sidebar needs. It resolves the
  body's and the content's percentage heights to auto with it, so a `Tree`
  inside needs no `scroll` of its own. Section 7.11 of
  [DESIGN_SYSTEM_SPEC.md](../DESIGN_SYSTEM_SPEC.md) has that case beside the
  two it is confused with.
- Border-right: `1px solid var(--border)`.
- Background: `var(--bg)`.

### Header
- Height: `40px`, `flex-shrink: 0`.
- `display: flex`, `align-items: center`, `justify-content: space-between`.
- Padding: `0 var(--space-4)`.
- Title: the `text-label-upper` utility, which is `font-size: var(--font-size-label)` resolving to `var(--font-size-xs)` at `0.75rem`, `text-transform: uppercase`, `letter-spacing: var(--letter-spacing-wide)`, `font-weight: var(--font-weight-semibold)`, `color: var(--muted)`.
- Actions slot: rendered on the right side of the header.
- Collapse button: `PanelLeftClose` (16px) from lucide-react when `collapseTo` is `"edge"`, and `ChevronDown` or `ChevronRight` when it is `"header"`. A panel folding sideways says so with a sideways icon; one collapsing to its own header is a disclosure, and a chevron is what a reader expects.

### Content Area
- `flex: 1`, `overflow-y: auto`, `min-height: 0`. Content taller than the panel scrolls. Until 0.3.0 the stylesheet said `overflow: hidden` here, against this specification, so such content was clipped with no scrollbar and reachable only by `scrollIntoView` or the keyboard.
- Padding: `var(--space-2)` on all sides. The horizontal gutter keeps content (e.g. a `SectionedTree`'s full-width section headers) from butting the panel edge or an adjacent `SplitPane` resize handle, and aligns it under the header title.

### Styling
- Background: `var(--bg)`.
- Border-right: `1px solid var(--border)`.
- Transition: `width var(--transition-normal)`.

### States
| State       | CSS                                                        |
|-------------|------------------------------------------------------------|
| Default     | Full width, content visible                                |
| Collapsed, `collapseTo: "edge"` | `width: 0`, `overflow: hidden`, `border: none`, no content rendered |
| Collapsed, `collapseTo: "header"` | Width unchanged, header and toggle still shown, no content rendered |
| Hover (collapse btn) | `color: var(--fg)`, `background: var(--color-bg-muted-hover)`, `border-radius: var(--radius-sm)` |

### Responsive
- No breakpoint changes. Panel is always used within a flex container that handles overflow.

## Behavior

### Interactions
- Clicking the collapse button calls `onCollapse()`.
- When `collapsed` is `true`, the body is not rendered in either mode.
- `collapseTo` decides what is left. `"edge"`, the default, folds the panel to
  zero width and gives its space back, which is what a side panel should do.
- `"header"` leaves the title bar and its toggle in place. In a vertical stack
  the edge mode takes the header with the body, so nothing remains on screen to
  restore the panel and every consumer rebuilds that toggle by hand.

### Keyboard
| Key     | Action                           |
|---------|----------------------------------|
| Tab     | Focus collapse button / actions  |
| Enter   | Activate focused button          |
| Space   | Activate focused button          |

### Accessibility
- Collapse button: `aria-label="Collapse {title} panel"` / `"Expand {title} panel"` based on state.
- The collapse button carries `aria-expanded={!collapsed}`, which is what the
  disclosure pattern requires. It carries no `aria-controls`: the body is not
  rendered while collapsed, and pointing at an element that does not exist is
  worse than pointing at nothing.
- The root has `role="group"` and `aria-label="{title}"`. It groups what the
  panel holds rather than landmarking it, so a page of panels adds no landmarks.

## Persistence

Not persisted by the Panel itself. Parent components manage collapsed state. Width persistence is handled by `SplitPane` when used together.

## Dependencies

- `lucide-react`: `PanelLeftClose` icon.
- `cn()` utility for className merging.

## Edge Cases

- **No actions**: Actions slot simply doesn't render.
- **Very long title**: Truncate with `text-overflow: ellipsis`, `white-space: nowrap`, `overflow: hidden`.
- **Empty children**: Panel still renders header; content area is empty.
- **Rapid collapse/expand**: CSS transition handles smoothly; no debounce needed.

## Traceability

`data-component="Panel"` on the root `<div>`, with `data-part="header"` on the title bar and `data-part="body"` on the content area.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Panel } from "@codesweep-ai/ui";
export function Example() { return <Panel title="Explorer" width="20rem">Files</Panel>; }
```
