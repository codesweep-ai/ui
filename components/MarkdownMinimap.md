---
name: MarkdownMinimap
status: stable
since: 1.0.0
summary: Canvas-based minimap (overview scrollbar) for a long-form scrollable markdown container. Draws a block silhouette of headings and content, overlays the current viewport, and lets the user click or drag to scroll.
keywords: [minimap, overview, scrollbar, canvas, scroll indicator, document map,
           navigation, long document, outline, viewport, scroll position, markdown nav]
use_when:
  - Providing a bird's-eye navigation control alongside a long markdown document
  - Users need to jump to arbitrary scroll positions quickly
avoid_when:
  - Heading-based jump navigation is sufficient → use MarkdownViewer with outline=true
related: [MarkdownViewer, SplitPane, Panel]
patterns: [MarkdownViewer]
note: >
  Requires a React ref to the scrollable markdown container it controls; it
  reads scroll position and heading layout from that element.
---

# MarkdownMinimap

> Canvas-based minimap (overview-scrollbar) for a long-form scrollable markdown container. Draws a block silhouette of headings + content, overlays the current viewport, and lets the user click or drag to scroll the source content.

## Props

```typescript
interface MarkdownMinimapProps {
  /** Ref to the scrollable container being summarized. */
  contentRef: React.RefObject<HTMLDivElement>;
  /** Optional className merged onto the root container. */
  className?: string;
}
```

## Visual Spec

### Root

- `<div>` with the component's full-height class plus the consumer-provided `className`.
- Contains a single `<canvas>` sized to `100% × 100%` of the root (so consumer controls width/height by sizing the parent — typically a sidebar column ~80–120px wide).

### Canvas drawing

The canvas is redrawn from scratch on every scroll/resize/theme change. Three layers:

1. **Block silhouette** — for each `h1`–`h6`, `p`, `pre`, `table`, `.md-mermaid`, `.md-alert` descendant of the content container:
   - Position: vertical offset = element's position in the source × `scale` (where `scale = canvasHeight / contentScrollHeight`).
   - Width: full canvas width minus inset (4px for headings, 8px for content).
   - Height: max of `element.height × scale` and a per-tag minimum (3px for headings, 1px for content).
   - Fill: `var(--muted)` for headings, `var(--border)` for non-headings.
2. **Viewport indicator** — a filled rectangle representing the currently-visible portion of the content:
   - Position: `scrollTop × scale`.
   - Height: `viewportHeight × scale`.
   - Fill: `var(--color-accent-bg-strong)` at 60% opacity.
3. **Viewport border** — 1px stroke around the viewport indicator:
   - Stroke: `var(--color-link)`.

### Token reads at draw time

Colors are read fresh from CSS custom properties on every draw via `getComputedStyle(document.documentElement).getPropertyValue(...)`. This is what makes the minimap react to theme changes — there's no caching.

## Behavior

### Click

Clicking on the canvas scrolls the content container so the clicked Y position becomes the viewport center. Smooth-scroll (`behavior: "smooth"`).

### Drag

Mouse-down on the canvas starts a drag mode; subsequent `mousemove`s scroll the content **instantly** (`scrollTop = ...`, not smooth — for responsive feel during drag). Mouse-up or mouse-leave ends drag mode.

### Auto-redraw triggers

The canvas redraws whenever:
- The content container scrolls
- The content container resizes (`ResizeObserver`)
- The root container resizes (`ResizeObserver`)
- `<html>` `data-theme` attribute changes (`MutationObserver`)

All redraws are batched into `requestAnimationFrame`. There's also a `setTimeout(drawMinimap, 100)` on mount to handle the case where content layout hasn't settled yet.

### Cleanup

On unmount: removes scroll listener, clears the initial-draw timeout, disconnects both observers.

## Persistence

None.

## Dependencies

- React refs only — no other component dependencies
- Reads CSS tokens at draw time: `--muted`, `--border`, `--color-accent-bg-strong`, `--color-link`

## Edge Cases

- **`contentRef.current` is null on mount**: silently returns from `drawMinimap` — the initial draw timeout catches the case where content mounts after the minimap.
- **Content is shorter than viewport** (`scale > 1`): viewport indicator covers the whole canvas; block silhouette is sparse but rendered correctly.
- **Element with `height: 0`**: forced to `MIN_BLOCK_HEIGHT` (2px) so it's still visible in the silhouette.
- **No matching descendants** (empty content): canvas shows just the viewport indicator (which covers the whole canvas).
- **Container height changes mid-drag**: the next mousemove re-reads dimensions, so drag stays responsive.
- **Theme change during drag**: redraw fires from the MutationObserver, but the dragging state isn't disrupted.

## Traceability

`data-component="MarkdownMinimap"` on the root `<div>`.

## Composition example

```tsx
import { useRef } from "react";
import { MarkdownViewer } from "@codesweep-ai/ui/markdown";
import { MarkdownMinimap } from "@codesweep-ai/ui/minimap";
import { SplitPane } from "@codesweep-ai/ui";

function DocsPage({ content }: { content: string }) {
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <SplitPane panes={[
      { id: "content", children: <div ref={contentRef}><MarkdownViewer content={content} /></div> },
      { id: "minimap", defaultWidth: 120, children: <MarkdownMinimap contentRef={contentRef} /> },
    ]} />
  );
}
```

## Compiling usage example

<!-- docs-compile -->
```tsx
import { useRef } from "react";
import { MarkdownMinimap } from "@codesweep-ai/ui/minimap";
export function Example() { const contentRef = useRef<HTMLDivElement>(null); return <div><div ref={contentRef}>Document</div><MarkdownMinimap contentRef={contentRef} /></div>; }
```
