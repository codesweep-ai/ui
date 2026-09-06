---
name: Tooltip
status: stable
since: 0.3.0
summary: Accessible hover and focus tooltip, with an overflow-only mode for labels cut off by their container.
keywords: [tooltip, hover, focus, popover, hint, truncation, ellipsis, overflow, title attribute,
           accessible tooltip, describedby, escape to dismiss, keyboard]
use_when:
  - A truncated label needs to offer its full text
  - A control needs a hint its accessible name does not already carry
  - Replacing a native `title`, which never appears on keyboard focus
avoid_when:
  - The content is essential rather than supplementary — put it on the page
  - Hover readouts inside a chart → ChartTooltip
  - The content is interactive (links, buttons) — a tooltip is not a popover
related: [ChartTooltip, Tree, SectionedTree, Table, EventLanes]
patterns: [DataTable]
note: >
  Pass describedBy={false} whenever the bubble only repeats text already in the DOM, such as a
  truncated label. The element itself is what a screen reader reads; announcing the bubble too
  says the same thing twice.
---

# Tooltip

## Overview

Supplementary text shown on hover and on keyboard focus. It replaces the native `title` attribute, which the kit used until 0.3.0 and which never appears for a keyboard user.

The component wraps one trigger element. It clones that element to attach its handlers and forwards its own ref through to it, so a `Tooltip` can be a component's root without breaking ref forwarding.

## Props

```typescript
interface TooltipProps {
  /** What the bubble says. */
  content: React.ReactNode;
  /** The element the tooltip belongs to. One element, and it must accept a ref and DOM props. */
  children: React.ReactElement;
  /** Which edge of the trigger the bubble sits on. Default: "top". */
  side?: "top" | "bottom" | "left" | "right";
  /** Announce the bubble through `aria-describedby`. Default: true. */
  describedBy?: boolean;
  /** How long a hover waits before opening, in milliseconds. Default: 500. Focus never waits. */
  delay?: number;
  /** Render the trigger untouched and never open. Default: false. */
  disabled?: boolean;
  /** Open only when the trigger's own content is actually clipped. Default: false. */
  overflowOnly?: boolean;
  /** Optional className merged onto the bubble. */
  className?: string;
}
```

## Visual Spec

### Bubble

`<div>` with class `cs-tooltip`, rendered in a portal on `document.body`, `position: fixed` at `var(--z-tooltip)`.

Chrome matches [ChartTooltip](ChartTooltip.md) exactly, so the two tooltips in the kit read as one thing: `var(--card)` background, `.0625rem` `var(--border)`, `var(--radius-sm)`, `var(--shadow-md)`, `var(--font-size-xs)` in `var(--fg)`, padded `var(--space-2)` / `var(--space-1)`.

| Property | Value |
|---|---|
| `max-width` | `var(--tooltip-max-width)` |
| `overflow-wrap` | `anywhere`, so a long path can break |
| `pointer-events` | default, unlike ChartTooltip — this one must be hoverable |

### Placement

The component measures the trigger at open time and sets the anchor point. The offset lives in the stylesheet, keyed off `data-side`, so the gap stays a token rather than arithmetic in TypeScript.

**No collision detection.** The bubble does not flip or shift to stay on screen. A trigger near a viewport edge, or inside a narrow scrolling sidebar, can clip. Choose `side` for the space available.

## Behavior

| Input | Result |
|---|---|
| Pointer enters the trigger | Opens after `delay` |
| Trigger receives focus | Opens immediately, because a keyboard user has no pointer to rest |
| `Escape` | Dismisses, without moving focus |
| Pointer leaves the trigger | Closes after a short grace period, so the pointer can reach the bubble |
| Pointer enters the bubble | Stays open, so its text can be read and selected |
| Trigger loses focus | Closes |

The grace period and the hoverable bubble are what WCAG 1.4.13 asks of content shown on hover.

### Overflow-only mode

`overflowOnly` measures `scrollWidth` against `clientWidth` (and the height pair) on the trigger **at open time**, not at render. A row whose text fits shows nothing; the same row in a narrower pane shows the full string. This is what a truncated label wants, and it is why the tooltip does not fire on every short name in a list.

## Accessibility

- The bubble is `role="tooltip"` with a generated `id`.
- **`describedBy` decides whether it is announced.** When true, the trigger gets `aria-describedby` pointing at the bubble. When false, the bubble is `aria-hidden` and the trigger is left alone.
- Pass `describedBy={false}` for a truncated label. Truncation is visual only: the full string is still in the DOM, so a screen reader already reads it from the element. Announcing the bubble as well reads the same name twice.
- Pass the default for a hint that carries information the accessible name does not.
- Opening never moves focus, and the trigger keeps its own handlers and ref.

## Persistence

None.

## Dependencies

- `cn()` for className merging.
- `createPortal` from `react-dom`.
- CSS: `styles/components/tooltip.css`.

## Edge Cases

- **A trigger that is not a single element**: `children` must be one React element. Anything else is returned untouched and no tooltip is attached.
- **`disabled`**: the trigger renders exactly as passed, with no handlers attached.
- **Scrolling while open**: the position is measured once at open. The bubble closes on Escape, on blur and on leaving the trigger, so it does not outlive its measurement, but it does not follow a scroll.
- **`overflowOnly` in jsdom**: jsdom lays nothing out, so both metrics read `0` and nothing ever looks clipped. Tests must stub `scrollWidth` / `clientWidth`.

## Traceability

`data-component="Tooltip"` and `data-part="bubble"` on the bubble, with `data-side` naming the requested edge.

## Composition example

```tsx
import { Tooltip } from "@codesweep-ai/ui";

// a hint the accessible name does not carry
<Tooltip content="Show only this card — its siblings are hidden">
  <button aria-label="Show only this card"><Icon /></button>
</Tooltip>

// a truncated label: visual only, because the text is already in the DOM
<Tooltip content={node.name} describedBy={false} overflowOnly>
  <span className="truncated">{node.name}</span>
</Tooltip>
```

## Compiling usage example

The bubble is the only element this component renders, and it exists only while the tooltip is
open. The example therefore focuses its trigger on mount, which is also the shortest demonstration
that focus alone opens it.

<!-- docs-compile -->
```tsx
import { useEffect, useRef } from "react";
import { Tooltip } from "@codesweep-ai/ui";

export function Example() {
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => trigger.current?.focus(), []);
  return (
    <Tooltip content="The full text">
      <button type="button" ref={trigger}>
        Hover or focus me
      </button>
    </Tooltip>
  );
}
```
