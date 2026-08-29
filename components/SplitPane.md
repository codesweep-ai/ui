---
name: SplitPane
status: stable
since: 1.0.0
summary: Container with two or three resizable panes separated by drag handles, with optional per-pane width persistence.
keywords: [split pane, resizable, drag handle, layout, panels, two-column, three-column,
           side by side, resize, master detail, panel layout, persistent width]
use_when:
  - Two- or three-column layouts where the user should control pane widths
  - File explorer + detail view side-by-side
  - Any layout that needs persistent resizable panels
related: [Panel, SectionedTree, Tree]
patterns: [MasterDetail, Explorer]
note: >
  SplitPane uses height: 100%, so its parent must have a defined height.
  In full-viewport layouts this happens naturally; in page layouts wrap SplitPane
  in a container with an explicit height, such as h-96.
---

# SplitPane

> Container with two or three resizable panes separated by drag handles.

## Props

```typescript
interface SplitPaneProps {
  /** Pane definitions, left-to-right */
  panes: PaneConfig[];
  /** Additional className */
  className?: string;
}

interface PaneConfig {
  /** Unique key for this pane */
  id: string;
  /** Content */
  children: React.ReactNode;
  /** Initial width in px (omit for flex-fill) */
  defaultWidth?: number;
  /** Minimum width in px (default: 120) */
  minWidth?: number;
  /** Maximum width in px (default: 500) */
  maxWidth?: number;
  /** Whether pane is currently collapsed */
  collapsed?: boolean;
  /** localStorage key for persisting width */
  storageKey?: string;
}
```

## Visual Spec

### Layout
- Container: `display: flex`, `flex-direction: row`, `height: 100%`, `overflow: hidden`.
- Fixed-width panes: `width: {width}px`, `flex-shrink: 0`.
- Flex-fill pane (no `defaultWidth`): `flex: 1`, `min-width: 0`.
- Exactly one pane should omit `defaultWidth` to be the flex-fill pane.
- **Parent height requirement**: SplitPane uses `height: 100%`, so its parent must have a defined height. In `full` layout this happens naturally. Otherwise give the parent an explicit CSS height, for example `height: 24rem`.
- **Pane content padding**: SplitPane does not apply inner padding — each pane's content controls its own. When panes sit side-by-side, use the same padding on all pane content wrappers so their content top-aligns visually.

### Resize Handle
- Visible width: `4px`.
- Hit area: `8px` (achieved via `::before` pseudo-element extending `2px` on each side).
- Idle: `background: var(--border)` — a resting divider line so adjacent panes stay visually separated even when both have the same surface color (e.g. white card content on both sides).
- Hover: `background: var(--color-accent)`, `transition: background var(--transition-fast)`.
- Active (dragging): `background: var(--color-accent)`.
- Cursor: `col-resize` on handle.

### Styling
- The handle is the only divider — it always renders a `var(--border)` line at rest; panes need no border of their own.
- During drag: `body` gets `cursor: col-resize`, `user-select: none`.

### States
| State             | CSS / Behavior                                            |
|-------------------|-----------------------------------------------------------|
| Default           | Panes at their set or persisted widths                    |
| Handle hover      | Handle turns `var(--color-accent)`                  |
| Dragging          | Handle stays colored, body cursor `col-resize`, `user-select: none` |
| Pane collapsed    | Width `0`, `overflow: hidden`, handle hidden              |

### Responsive
- No automatic breakpoint changes. On very narrow viewports the `minWidth` constraints still apply.

## Behavior

### Interactions
- **Drag handle**: Mouse down on handle starts resize. Mouse move updates width. Mouse up ends resize.
- Width is clamped between `minWidth` (default `120px`) and `maxWidth` (default `500px`).
- The flex-fill pane absorbs the remaining space.
- **Handle target selection**: Each handle sits between two panes. It resizes the fixed-width pane. If the left pane has a `defaultWidth`, the handle resizes the left pane (drag right = grow). If the left pane is flex-fill, the handle resizes the right pane instead (drag right = shrink). This ensures handles are always functional when at least one adjacent pane is fixed-width.

### Keyboard
| Key         | Action                                     |
|-------------|--------------------------------------------|
| ArrowLeft   | Decrease pane width by 10px (when handle focused) |
| ArrowRight  | Increase pane width by 10px (when handle focused) |
| Home        | Set pane to minWidth                       |
| End         | Set pane to maxWidth                       |

### Accessibility
- Resize handle: `role="separator"`, `aria-orientation="vertical"`, `tabIndex={0}`.
- `aria-valuenow={currentWidth}`, `aria-valuemin={minWidth}`, `aria-valuemax={maxWidth}`.
- `aria-label="Resize {paneId} pane"`.

## Persistence

- When `storageKey` is provided on a pane:
  - **On mount**: Read `localStorage.getItem(storageKey)` and parse as number for initial width.
  - **On resize end**: Write `localStorage.setItem(storageKey, width.toString())`.
  - Reads/writes wrapped in `try/catch` for storage unavailability.
- Key format convention: `"<project>-<component>-<dimension>"` (e.g., `"spec-viewer-file-tree-width"`).

## Dependencies

- `cn()` utility for className merging.
- No external drag library — uses native pointer events (`onPointerDown`, `onPointerMove`, `onPointerUp`).

## Edge Cases

- **Only one pane**: Renders as a single flex-fill element with no handles.
- **All panes have fixed width**: Last pane should omit `defaultWidth` to prevent overflow.
- **localStorage unavailable**: Falls back to `defaultWidth` silently.
- **Pane collapsed + dragging**: Collapsed panes skip resize handles.
- **Window resize**: Flex-fill pane absorbs the change naturally.

## Traceability

`data-component="SplitPane"` on the root `<div>`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { SplitPane } from "@codesweep-ai/ui";
export function Example() { return <SplitPane panes={[{ id: "list", defaultWidth: 240, children: <div>List</div> }, { id: "detail", children: <div>Detail</div> }]} />; }
```
