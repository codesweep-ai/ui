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
related: [Card, CardGroup, CheckboxGroup, ChartFrame, ChartTooltip]
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
Card + Recharts LineChart (dual Y-axis, token-styled)
Card + Recharts BarChart (stacked horizontal, token-styled)
Card + Recharts PieChart (donut, token-styled)
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
/* Flex row — fixed height so the filter column can scroll */
display: flex;
gap: var(--space-4);
height: 24rem;          /* h-96 — adjust to your content */

/* Filter column — scrollable (checkbox list can exceed card height) */
width: 11rem;           /* w-44 */
flex-shrink: 0;
border-right: 1px solid var(--border);
padding-right: var(--space-4);
overflow-y: auto;

/* Chart column — clips, does NOT scroll */
flex: 1;
min-width: 0;
overflow: hidden;
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
| `--color-cat-1`..`--color-cat-5` | Recharts data series colors          |
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
            <div className="[font-size:var(--font-size-stat)] font-bold [color:var(--fg)]">
              {s.value}
            </div>
            <div className="text-label-upper mt-1">{s.label}</div>
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
          <div className="flex-1 min-w-0 overflow-hidden">
            <YourChartComponent data={filtered} />
          </div>
        </div>
      </Card>
    </div>
  );
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

## Charts with Recharts

For richer chart types (line charts, stacked bars, donut/pie), use [Recharts](https://recharts.org/) — a declarative, SVG-based React charting library. Recharts accepts standard React props, making it straightforward to style with design system tokens.

### Reading design tokens for Recharts

Recharts props like `stroke`, `fill`, and `tick.fill` require resolved color values (hex/rgb), not CSS `var()` references. Use `getComputedStyle` to resolve tokens:

```typescript
function useChartTokens() {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string) => style.getPropertyValue(name).trim();
  return {
    cat1: get("--color-cat-1"),
    cat2: get("--color-cat-2"),
    cat3: get("--color-cat-3"),
    cat4: get("--color-cat-4"),
    cat5: get("--color-cat-5"),
    fg: get("--fg"),
    muted: get("--muted"),
    border: get("--border"),
    card: get("--card"),
  };
}
```

The hook re-reads tokens on every render, so theme switches are handled automatically (re-render triggers re-read).

### Custom tooltip

Use a custom tooltip component styled with design system tokens instead of the Recharts default:

```tsx
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dashboard-tooltip">
      <div className="[font-size:var(--font-size-xs)] font-semibold [color:var(--fg)]">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} className="dashboard-tooltip-row">
          <span className="dashboard-swatch" style={{ backgroundColor: entry.color }} />
          <span className="[color:var(--muted)]">{entry.name}:</span>
          <span className="[color:var(--fg)] font-mono">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
```

The tooltip `div` uses CSS `var()` directly (works because it's rendered as HTML, not SVG). Disable the default fly-in animation with `isAnimationActive={false}` on `<Tooltip>`.

### Custom legend

Use a custom legend with square swatches for visual consistency across all chart types. Recharts' default legend uses mixed shapes (circles for line charts, rectangles for bars, sectors for pies). The custom legend normalizes to square swatches with `--radius-xs` rounding:

```tsx
function ChartLegend({ payload }: any) {
  if (!payload?.length) return null;
  return (
    <div className="dashboard-legend">
      {payload.map((entry: any) => (
        <div key={entry.value} className="dashboard-legend-item">
          <span className="dashboard-legend-swatch" style={{ backgroundColor: entry.color }} />
          {entry.value}
        </div>
      ))}
    </div>
  );
}
```

Pass it to every `<Legend>` via `content={<ChartLegend />}`.

### Chart container and scrolling

When Cards are inside a CardGroup, the Card component automatically adds `overflow-y: auto` to its body wrapper. Chart content therefore scrolls naturally when it exceeds the available height; do not add another chart-wrapper scroller.

There are two sizing strategies for chart containers:

**Fixed base height (scrollable)** — use when each card has plenty of vertical space (e.g. one CardGroup row, or large viewports). The chart has a guaranteed minimum size; the Card body scrolls if the card is shorter.

```tsx
<Card id="my-chart" header="Chart Title" maximizable>
  <div className="dashboard-chart-fixed">
    <ResponsiveContainer width="100%" height="100%">
      {/* chart */}
    </ResponsiveContainer>
  </div>
</Card>
```

- `height: var(--card-content-height)` provides the base height; a shorter Card body scrolls.
- `flex: 1` with `min-height: 0` grows when Card is maximized.
- Negative `var(--space-4)` margins bleed the chart to the card edges.

**Fit-to-card (no scroll)** — use when multiple cards share a single CardGroup row and vertical space is limited. The chart shrinks to fit the card's available height in the default view and expands when the card is maximized.

```tsx
<Card id="my-chart" header="Chart Title" maximizable>
  <div className="dashboard-chart-fill">
    <ResponsiveContainer width="100%" height="100%">
      {/* chart */}
    </ResponsiveContainer>
  </div>
</Card>
```

- `height: 100%` fills whatever height the Card body provides.
- `min-h-0` — allows shrinking below content size in flex layouts
- Negative `var(--space-4)` margins bleed to the card edges.

**When to use which:**
- Fixed base height when there is one CardGroup row or cards have generous vertical space
- Fit-to-card when 3+ cards share a row, or the tab has compact vertical space and scrolling inside cards would be disorienting

### Animation

Disable all Recharts animations for instant rendering — no draw-in on mount or re-draw on resize:

- `isAnimationActive={false}` on `<Tooltip>` — tooltip appears instantly on hover
- `isAnimationActive={false}` on `<Line>`, `<Bar>`, `<Pie>` — chart elements render immediately

### Chart types

**Dual Y-axis line chart** — for time-series with mixed units (e.g. tokens + cost):

- `<LineChart>` with two `<YAxis>` components (`yAxisId="left"` / `"right"`)
- Each `<Line>` specifies its `yAxisId`, `type="monotone"`, `dot={false}`
- Use `strokeDasharray="5 3"` for the secondary-axis series to visually distinguish units

**Stacked horizontal bar chart** — for comparing totals with sub-categories:

- `<BarChart layout="vertical">` with `<XAxis type="number">` and `<YAxis type="category">`
- All `<Bar>` components share the same `stackId` to stack
- Apply `radius` to the first and last bars for rounded ends

**Donut chart** — for proportional breakdowns:

- `<PieChart>` with a single `<Pie>` using `innerRadius="55%"` and `outerRadius="80%"`
- `<Cell>` components for per-slice colors
- `paddingAngle={2}` for visual separation between slices

### Color mapping

Map `--color-cat-N` tokens to data series in order:

| Token | Typical usage |
|-------|---------------|
| `--color-cat-1` | First data series (e.g. input tokens) |
| `--color-cat-2` | Second data series (e.g. output tokens) |
| `--color-cat-3` | Third data series (e.g. cache read) |
| `--color-cat-4` | Fourth data series (e.g. cache write) |
| `--color-cat-5` | Fifth data series (e.g. cost overlay) |

### Grid and axis styling

- `CartesianGrid`: `stroke={border}`, `strokeDasharray="3 3"`
- Axis ticks: `tick={{ fill: muted, fontSize: 11 }}`
- Category axis labels: `tick={{ fill: fg, fontSize: 12 }}`

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
- **Do** use `useChartTokens()` to resolve CSS vars for Recharts SVG props — `var()` doesn't work in SVG attributes.
- **Do** use `ResponsiveContainer` with `width="100%"` inside a height-bounded container. Use `height: var(--card-content-height)` for a fixed base height, or `height: 100%` for fit-to-card sizing.
- **Do** use custom `ChartTooltip` and `ChartLegend` with design system tokens instead of Recharts defaults.
- **Do** use square swatches with `border-radius: var(--radius-xs)` in both tooltips and legends.
- **Do** set `isAnimationActive={false}` on all chart elements (`Line`, `Bar`, `Pie`) and `Tooltip` — animations are distracting in data-dense dashboards.
- **Don't** hardcode hex colors in chart props — always read from tokens via `useChartTokens()`.
- **Do** use `--color-cat-N` categorical tokens for data series, not semantic tokens like `--color-success`.
- **Don't** use more than 5-6 series on a single line chart — it becomes unreadable.
- **Don't** use Recharts' default legend — it uses mixed shapes (circles, rectangles, sectors) across chart types. Use the custom `ChartLegend` for uniform square swatches.
