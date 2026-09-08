---
name: Dashboard
status: stable
since: 1.0.0
summary: Stats bar, filterable chart, and optional sidebar for summarizing and exploring aggregate data.
keywords: [dashboard, metrics, stats bar, chart filter, kpi, data summary, analytics page, filterable chart, aggregate view, overview page]
use_when:
  - Showing high-level metrics alongside a chart visualization
  - Letting users filter a dataset and see the chart update in real time
avoid_when:
  - Single metric display → Card with a large number
  - Drill-down or hierarchical detail → Explorer or MasterDetail
related: [Card, CardGroup, CheckboxGroup, ChartFrame, ChartTooltip, Legend]
---

# Dashboard Pattern

> Stats bar, chart, and filter sidebar for summarizing and exploring aggregate data.

## When to Use

- Showing high-level metrics alongside a visualization (bar chart, breakdown)
- Letting users filter a dataset and see the visualization update in real time

## When NOT to Use

- Displaying a single metric (use a Card with a large number instead)
- Drill-down detail views (use Explorer or Master-Detail)

## Composition

```
StatsBar (inline helper — row of stat Cards)
Card + CheckboxGroup + BarChart (inline helper — filterable horizontal bars)
Card + ChartFrame + SVG line chart + ChartTooltip + Legend
Card + ChartFrame + SVG stacked bar + ChartTooltip + Legend
Card + ChartFrame + SVG donut + ChartTooltip + Legend
```

```
┌──────────┬──────────┬──────────┬──────────┐
│ Stat 1   │ Stat 2   │ Stat 3   │ Stat 4   │
│   124    │   37     │  89.2%   │    5     │
└──────────┴──────────┴──────────┴──────────┘
┌──────────────────────────────────────────────┐
│  Card header: "Breakdown"                    │
│ ┌───────────┐│┌─────────────────────────────┐│
│ │ FILTER    │││                             ││
│ │ ┌───────┐ │││ .tsx ███████████████  42    ││
│ │ │Find...│ │││ .ts  ██████████████   31    ││
│ │ └───────┘ │││ .css █████████        18    ││
│ │ All | None│││ .json███              7     ││
│ │ ☑ ● .tsx  │││ ...                        ││
│ │ ☑ ● .ts   │││                             ││
│ │ ☑ ● .css  │││                             ││
│ │ ☐ ● .json │││                             ││
│ │ ...       │││                             ││
│ └───────────┘│└─────────────────────────────┘│
│  filter col  │  chart (clips, no scroll)     │
│  (scrolls)   │                               │
└──────────────────────────────────────────────┘
```

The filter sidebar and chart are visually separated by a `border-right` on the filter column. Only the filter sidebar gets `overflow-y: auto` — the chart column uses `overflow: hidden` since its content should fit within the card height.

```css
/* Fixed height, so the filter column has something to scroll within. */
.dashboard-chart-layout {
  display: flex;
  gap: var(--space-4);
  height: 24rem;
}

/* The checkbox list can exceed the card height, so this column scrolls. */
.dashboard-filter {
  width: 11rem;
  flex-shrink: 0;
  padding-right: var(--space-4);
  border-right: 1px solid var(--border);
  overflow-y: auto;
}

/* The chart clips instead of scrolling. See the scroll-owner rule below. */
.dashboard-chart-column {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
```

**Important:** Each Card should have exactly **one scroll owner** — the single element that scrolls when content overflows. In a CardGroup, the Card body is the default scroll owner. When a card has a sidebar + content layout, only the sidebar (filter column) should add `overflow-y: auto`, because its checkbox list can grow beyond the card height. The chart column should use `overflow: hidden` — adding a second `overflow-y: auto` creates competing scrollbars that confuse users.

## Required Components

| Component      | Role                                          | Required? |
|----------------|-----------------------------------------------|-----------|
| Card           | Container for chart + filters                 | Yes       |
| CheckboxGroup  | Filter sidebar with select all/none + search  | No        |
| StatsBar*      | Row of summary stat cards                     | Yes       |
| BarChart*      | Horizontal bar visualization                  | Yes       |

*Inline helpers — not part of the design system component library.

## Tokens

| Token                        | Usage                                     |
|------------------------------|-------------------------------------------|
| `--space-4`                  | Gap between stat cards, padding           |
| `--space-2`                  | Inner chart bar spacing                   |
| `--radius-md`               | Card and stat card radius                 |
| `--color-accent`      | Primary bar color                         |
| `--color-success`, etc.     | Alternate bar colors                      |
| `--color-bg-muted`          | Stat card background, bar track           |
| `--border`                   | Card, stat card, filter/chart separator   |
| `--color-cat-1`..`--color-cat-5` | Chart series colours, read through `useChartTheme()` |
| `--font-size-xs`            | Axis tick labels, tooltip text            |
| `--shadow-md`               | Chart tooltip drop shadow                 |
| `--card`                     | Chart tooltip background                  |

## State

```typescript
// Chart data — full dataset with categorical colors
const bars: { label: string; value: number; color: string; group?: string }[] = [
  { label: ".tsx", value: 42, color: "var(--color-cat-1)" },
  { label: ".ts",  value: 31, color: "var(--color-cat-2)" },
  { label: ".css", value: 18, color: "var(--color-cat-3)" },
  // ...
];

// Filter state — which series are visible
const [visible, setVisible] = useState<Set<string>>(
  new Set(bars.map((b) => b.label))  // all visible initially
);

// Filtered data for rendering
const filteredBars = bars.filter((b) => visible.has(b.label));

// Checkbox options derived from data
const options = bars.map((b) => ({
  value: b.label,
  label: b.label,
  color: b.color,
  group: b.group,  // omit for flat filter
}));
```

## Example

```tsx
import { useState } from "react";
import { Card } from "@codesweep-ai/ui";
import { CheckboxGroup, type CheckboxOption } from "@codesweep-ai/ui";

function Dashboard({ stats, chartData }) {
  const [visible, setVisible] = useState<Set<string>>(
    new Set(chartData.map((d) => d.label))
  );

  const options: CheckboxOption[] = chartData.map((d) => ({
    value: d.label,
    label: d.label,
    color: d.color,
    group: d.group,  // include for grouped variant
  }));

  const filtered = chartData.filter((d) => visible.has(d.label));

  return (
    <div className="dashboard-stack">
      {/* Stats row */}
      <div className="dashboard-stats">
        {stats.map((s) => (
          <div
            key={s.label}
            className="dashboard-stat"
          >
            <div className="dashboard-stat-value">
              {s.value}
            </div>
            <div className="text-label-upper dashboard-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart with filter sidebar */}
      <Card header="Breakdown">
        <div className="dashboard-chart-layout">
          <div className="dashboard-filter">
            <CheckboxGroup
              options={options}
              selected={visible}
              onChange={setVisible}
              label="Filter"
              filterable
              filterPlaceholder="Find type..."
            />
          </div>
          <div className="dashboard-chart-column">
            <YourChartComponent data={filtered} />
          </div>
        </div>
      </Card>
    </div>
  );
}
```

The classes the example uses, in plain CSS. The stat value sets no colour,
because `base.css` already gives body text `var(--fg)`:

```css
.dashboard-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.dashboard-stats {
  display: flex;
  gap: var(--space-4);
}

.dashboard-stat {
  flex: 1;
}

.dashboard-stat-value {
  font-size: var(--font-size-stat);
  font-weight: var(--font-weight-bold);
}

.dashboard-stat-label {
  margin-top: var(--space-1);
}
```

### Colors

Use categorical palette tokens for chart fills and checkbox color dots:

```typescript
{ label: "TypeScript", value: 42, color: "var(--color-cat-1)" },
{ label: "CSS",        value: 21, color: "var(--color-cat-2)" },
```

For sub-category breakdowns within a single hue, use `-light`, `-mid`, `-dark` suffixes.

## Variants

- **Default (flat filter)**: Stats bar + chart Card with flat CheckboxGroup
- **Grouped filter**: CheckboxGroup options include `group` field — renders collapsible sections with sticky headers. Use when filter options fall into natural categories (e.g. Code, Config, Docs).
- **No filters**: Omit CheckboxGroup; chart fills Card width
- **Compact**: Use Card `variant="tight"` and smaller stat cards

## Charts

The kit ships no chart component. It ships a theming bridge, and
[Chart.md](Chart.md) is the authority on it. Read that first. This section
covers only what the Dashboard adds.

Four of its rules carry, and the demo on this page follows all four:

- Colours come from `useChartTheme()`, never from a `getComputedStyle` call in
  the page and never from a hex literal. `theme.categorical[i]` is the series
  palette.
- Every chart sits inside [ChartFrame](../components/ChartFrame.md), which owns
  the loading, error and empty states.
- Hover on a hand-drawn chart uses
  [ChartTooltip](../components/ChartTooltip.md), positioned in the container's
  pixels.
- The key beside a chart is [Legend](../components/Legend.md). Its swatch
  colours are custom-property names such as `--color-cat-1`, never a resolved
  colour.

### What the demo draws

`preview/src/pages/patterns/DashboardDemo.tsx` is the worked example. It holds
five cards: two file-type breakdowns behind a flat and a grouped filter, a
four-series line chart, a stacked horizontal bar chart, and a donut. Every one
is hand-drawn SVG, and no charting library is involved.

The three drawn charts share one arrangement. Each lays out in a fixed
coordinate space, which is what keeps its geometry readable. Each declares that
space as a `viewBox` at `width="100%"`, so the drawing shrinks with its card.
`ChartTooltip` takes container pixels rather than viewBox units, so the demo
measures the rendered width and scales the tooltip position to match.

{% raw %}
```tsx
<div ref={ref} style={{ width: "100%", maxWidth: W, aspectRatio: `${W} / ${H}` }}>
  <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%">{/* marks */}</svg>
  {hover && <ChartTooltip x={hover.x * scale} y={hover.y * scale}>…</ChartTooltip>}
</div>
```
{% endraw %}

A fixed pixel width with no `viewBox` is what this replaced. It left 46px of
the widest chart outside its card at a 430px viewport, on a page that does not
scroll sideways to reach it.

### Chart shapes

- **Line, several series**: one polyline per series against a shared y scale,
  and an invisible hit column at each x position so the whole column answers a
  hover.
- **Stacked horizontal bar**: one row per category, segments laid left to right
  from a running cursor, each segment its own hover target.
- **Donut**: one path per slice between an inner and an outer radius, with the
  total drawn in the middle.

Colour the series from `theme.categorical` in order. Keep a line chart to five
or six series, beyond which it stops being readable.

## Interactions

| User Action               | Result                                  |
|---------------------------|-----------------------------------------|
| Toggle filter checkbox    | Corresponding bar appears/disappears    |
| Click All / None          | Select or deselect all visible filters  |
| Type in filter input      | Narrow visible checkbox options          |
| Collapse/expand section   | Hide or show options in that group       |
| Collapse/Expand all       | Toggle all sections at once              |
| Hover chart bar           | Show tooltip or highlight               |

## Do / Don't

- **Do** keep the stats bar to 3-5 items so it fits on one row.
- **Do** use design-system token colors for chart bars so they respect the theme.
- **Do** separate the filter sidebar from the chart with a `border-right` using `var(--border)` so the two zones are visually distinct.
- **Do** set a fixed CSS height on the flex row containing both columns. The filter's `overflow-y: auto` needs a bounded parent. See [Convention 7.11](../DESIGN_SYSTEM_SPEC.md#711-scrollable-regions).
- **Do** give the filter column `overflow-y: auto` so its checkbox list scrolls when it exceeds the card height.
- **Don't** add `overflow-y: auto` to the chart column — use `overflow: hidden` instead. Two scrollable siblings inside one Card create competing scrollbars and confusing scroll behavior. Only one element per Card should own scrolling.
- **Don't** put `max-height` on one column instead of the shared flex row — this clips content in one column while leaving the other unbounded (no scroll). Bound the parent, not the children.
- **Don't** use more than ~8 bars; group smaller values into "Other."
- **Don't** embed complex interactivity (drill-down) inside the chart—link out to a detail view instead.
- **Do** use `CheckboxGroup` with `filterable` when the option list is long (10+ items).
- **Do** add `group` to CheckboxGroup options when filters have natural categories — the grouped layout with collapsible sticky sections scales better than a flat list.
- **Don't** let the filter column grow; give it a fixed width and `flex-shrink: 0`.
- **Do** read every chart colour from `useChartTheme()`. A `var()` string does not work in an SVG attribute, and resolving one in the page is a second theming bridge beside the kit's.
- **Do** give a drawn chart a `viewBox` at `width="100%"`, so it shrinks with its card instead of hanging out of it.
- **Do** wrap every chart in `ChartFrame`, so its loading, error and empty states are the ones every other chart shows.
- **Do** use `Legend` for the key beside a chart, with `shape: "square"` where the marks are rectangles.
- **Don't** pass a resolved colour to a `Legend` swatch. It takes a custom-property name, such as `--color-cat-1`.
- **Do** use `--color-cat-N` categorical tokens for data series, not semantic tokens like `--color-success`.
- **Don't** use more than 5-6 series on a single line chart — it becomes unreadable.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Card, CardGroup, useChartTheme } from "@codesweep-ai/ui";
import { ChartFrame } from "@codesweep-ai/ui/chart";

export function Example() {
  const theme = useChartTheme();
  return (
    <CardGroup>
      <Card id="throughput" header="Throughput" maximizable>
        <ChartFrame height={140}>
          <svg viewBox="0 0 100 40" width="100%">
            <rect x={4} y={8} width={12} height={32} fill={theme.categorical[0]} />
          </svg>
        </ChartFrame>
      </Card>
    </CardGroup>
  );
}
```
