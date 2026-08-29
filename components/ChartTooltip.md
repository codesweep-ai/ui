---
name: ChartTooltip
status: stable
since: 1.5.0
summary: Token-styled tooltip shell for charts, positioned absolutely; handles bg, border, shadow, and radius so every chart's tooltip looks identical.
keywords: [chart tooltip, graph tooltip, data tooltip, hover tooltip, chart hover,
           visualization tooltip, recharts tooltip, d3 tooltip, dataviz tooltip,
           absolute tooltip, chart annotation, cursor tooltip, plot tooltip]
use_when:
  - Adding a hover tooltip to any custom chart or visualization inside a ChartFrame
  - Ensuring consistent tooltip chrome across all charts without custom CSS
avoid_when:
  - Don't style the tooltip box yourself — supply only content rows as children
related: [ChartFrame]
patterns: [Chart, Dashboard]
---

# ChartTooltip

> Token-styled, absolutely-positioned chart tooltip. The chart computes the cursor position and the content; this component handles bg / border / shadow / radius so every chart's tooltip looks identical.

Added in `@codesweep-ai/ui@1.5.0`.

## Props

```typescript
interface ChartTooltipProps {
  visible?: boolean;                                  // default true
  x: number;                                          // px, relative to positioned container
  y: number;
  anchor?: "top" | "bottom" | "left" | "right";       // where (x,y) sits relative to the box. Default "top"
  children: React.ReactNode;
  className?: string;
}
```

## Visual Spec

- `position: absolute`, `z-index: var(--z-tooltip)`, `pointer-events: none`.
- `max-width: var(--chart-tooltip-max-width)` (240px).
- `bg: var(--card)`, `1px var(--border)`, `rounded var(--radius-sm)`, `shadow: var(--shadow-md)`.
- Padding `var(--space-1) var(--space-2)`, `font-size: var(--font-size-xs)`, `color: var(--fg)`.

### Anchor → transform

| anchor | transform | meaning |
|--------|-----------|---------|
| `top` (default) | `translate(-50%, calc(-100% - 8px))` | centered horizontally, 8px above the point |
| `bottom` | `translate(-50%, 8px)` | centered horizontally, 8px below |
| `left` | `translate(calc(-100% - 8px), -50%)` | 8px left, vertically centered |
| `right` | `translate(8px, -50%)` | 8px right, vertically centered |

## Behavior

Render inside the **same `position: relative` container** the chart's SVG sits in (e.g. [`ChartFrame`](./ChartFrame.md)'s body region, which is already relative). The consumer tracks the hovered datum + cursor coordinates and feeds `x`/`y`. Returns `null` when `visible={false}`.

```tsx
<ChartFrame title="Latency">
  <svg onMouseMove={handleMove}>{/* … */}</svg>
  <ChartTooltip visible={hover != null} x={hover?.x ?? 0} y={hover?.y ?? 0}>
    <strong>{hover?.label}</strong>
    <div>{hover?.value} ms</div>
  </ChartTooltip>
</ChartFrame>
```

## Anti-patterns

- ❌ Don't style the tooltip box yourself — build only the content rows; the box owns chrome.
- ❌ Don't set `pointer-events: auto` unless the tooltip is interactive; the default avoids the tooltip eating the chart's mouse events.

## Traceability

`data-component="ChartTooltip"`, `role="tooltip"`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { ChartTooltip } from "@codesweep-ai/ui/chart";
export function Example() { return <ChartTooltip x={120} y={48}>Run 12</ChartTooltip>; }
```
