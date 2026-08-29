---
name: ChartFrame
status: stable
since: 1.5.0
summary: Card frame + loading/error/empty states around a chart you render inside.
keywords: [chart, graph, plot, visualization, viz, dataviz, d3, recharts,
           sankey, bar chart, line chart, area chart, scatter, timeseries,
           force-directed graph, network graph, dashboard tile]
use_when:
  - Rendering any chart/visualization that needs consistent card chrome + states
  - Always pair with useChartTheme() for theme-aware colors and axes
avoid_when:
  - You need the chart primitive itself — ChartFrame is the frame only
related: [ChartTooltip]
patterns: [Chart, Dashboard]
note: >
  The DS provides the frame + theme bridge (useChartTheme), NOT chart
  primitives. For a force-directed graph: render d3-force inside a ChartFrame
  and color via useChartTheme(). Don't reinvent the card/state shell.
---

# ChartFrame

> Card frame around a chart: card background, padding, optional title + actions, and the canonical loading / error / empty states. The chart renders *inside* and only handles the happy path.

Added in `@codesweep-ai/ui@1.5.0`.

## Props

```typescript
interface ChartFrameProps {
  title?: string;
  actions?: React.ReactNode;
  height?: number | string;        // chart body height. Default 240 (px when number)
  children: React.ReactNode;       // the chart (rendered only in happy path)

  // State coverage (see patterns/ComponentStates.md)
  loading?: boolean;
  error?: Error | string | null;
  errorMessage?: string;           // default "Couldn't load chart"
  onRetry?: () => void;
  emptyMessage?: string;           // default "No data to chart."
  emptyHint?: string;
  emptyAction?: { label: string; onClick: () => void };
  empty?: boolean;                 // pass `empty={data.length === 0}`

  className?: string;
}
```

## State Coverage

Per [`patterns/ComponentStates.md`](../patterns/ComponentStates.md): precedence `loading > error > empty > data`. Test IDs `chartframe-loading|error|empty`. The card chrome (border, radius, title row) is preserved across states; only the body region swaps.

- **Loading**: a row of rising skeleton bars (chart-shaped, not a spinner) filling the body height.
- **Error**: centered `AlertCircle` + message + `error.message` detail + optional Retry button.
- **Empty**: centered `Inbox` + message + optional hint + optional CTA. Unlike container components, `empty` is an explicit boolean (the frame can't infer emptiness from an opaque chart child) — pass `empty={data.length === 0}`.

## Visual Spec

```
┌─ ChartFrame ───────────────────────────────┐
│ TOKENS / DAY                   [legend ▾]  │ ← title (text-label-upper) + actions
│ ┌────────────────────────────────────────┐ │
│ │                                        │ │
│ │            chart body (height)         │ │ ← children OR state block
│ │                                        │ │
│ └────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- Wrapper: `bg: var(--card)`, `1px var(--border)`, `rounded var(--radius-md)`, `p: var(--space-3)`.
- Header (only when `title` or `actions` set): title uses `text-label-upper`; actions right-aligned.
- Body: `position: relative` (so a [`ChartTooltip`](./ChartTooltip.md) can be absolutely positioned within), fixed `height`.

## Behavior

The frame owns the non-happy states so the chart component only renders the data path. Combine with [`useChartTheme()`](../patterns/Chart.md) inside the chart for theme-aware colors.

```tsx
<ChartFrame title="Tokens / day" loading={isLoading} error={err} empty={rows.length === 0} onRetry={refetch}>
  <MyD3Chart data={rows} />
</ChartFrame>
```

## Anti-patterns

- ❌ Don't render your own loading spinner inside the chart — let the frame handle it.
- ❌ Don't put a border/card on the chart itself; the frame provides it (avoids double borders).

## Traceability

`data-component="ChartFrame"`. State test IDs as above.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { ChartFrame } from "@codesweep-ai/ui/chart";
export function Example() { return <ChartFrame title="Findings"><div aria-label="Chart area" /></ChartFrame>; }
```
