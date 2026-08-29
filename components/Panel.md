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
patterns: [Explorer, MasterDetail, Dashboard]
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
  /** Whether the panel is collapsed to zero width */
  collapsed?: boolean;
  /** Called when the user clicks the collapse button */
  onCollapse?: () => void;
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
- Border-right: `1px solid var(--border)`.
- Background: `var(--bg)`.

### Header
- Height: `40px`, `flex-shrink: 0`.
- `display: flex`, `align-items: center`, `justify-content: space-between`.
- Padding: `0 var(--space-4)`.
- Title: `font-size: 11px`, `text-transform: uppercase`, `letter-spacing: 0.5px`, `font-weight: var(--font-weight-semibold)`, `color: var(--muted)`.
- Actions slot: rendered on the right side of the header.
- Collapse button: uses `PanelLeftClose` icon (16px) from lucide-react.

### Content Area
- `flex: 1`, `overflow-y: auto`, `min-height: 0`.
- Padding: `var(--space-2)` on all sides. The horizontal gutter keeps content (e.g. a `SectionedTree`'s full-width section headers) from butting the panel edge or an adjacent `SplitPane` resize handle, and aligns it under the header title.

### Styling
- Background: `var(--bg)`.
- Border-right: `1px solid var(--border)`.
- Transition: `width var(--transition-normal)`.

### States
| State       | CSS                                                        |
|-------------|------------------------------------------------------------|
| Default     | Full width, content visible                                |
| Collapsed   | `width: 0`, `overflow: hidden`, `border: none`, no content rendered |
| Hover (collapse btn) | `color: var(--fg)`, `background: var(--color-bg-muted-hover)`, `border-radius: var(--radius-sm)` |

### Responsive
- No breakpoint changes. Panel is always used within a flex container that handles overflow.

## Behavior

### Interactions
- Clicking the collapse button calls `onCollapse()`.
- When `collapsed` is `true`, the panel renders as zero-width with no visible content.

### Keyboard
| Key     | Action                           |
|---------|----------------------------------|
| Tab     | Focus collapse button / actions  |
| Enter   | Activate focused button          |
| Space   | Activate focused button          |

### Accessibility
- Collapse button: `aria-label="Collapse {title} panel"` / `"Expand {title} panel"` based on state.
- The collapse button carries `aria-expanded={!collapsed}`.
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

`data-component="Panel"` on the root `<div>`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Panel } from "@codesweep-ai/ui";
export function Example() { return <Panel title="Explorer" width="20rem">Files</Panel>; }
```
