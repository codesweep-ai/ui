---
name: Chart
status: stable
since: 1.5.0
summary: Theme-aware chart bridge for d3, recharts, and any other library — routes all colors through design-system tokens.
keywords: [chart, data visualization, themed chart, d3, recharts, chart colors, dark mode chart, chart theming, categorical palette, chart tooltip]
use_when:
  - Building any chart that must respect light/dark theme switching
  - Using d3 or a declarative library and needing colors from the design-system token palette
  - Wrapping a chart in consistent loading, empty, and error states
avoid_when:
  - Single static metric display → Card
  - Dashboard-level layout with filters → Dashboard
related: [ChartFrame, ChartTooltip]
note: >
  useChartTheme() and assignSeriesColors() are lib utilities, not components — they are not
  in the `related` list. Always depend your draw effect on the returned theme object
  (useEffect(draw, [theme])) so charts re-render on light/dark toggle.
---

# Pattern: Chart

> How to build a theme-aware chart with `@codesweep-ai/ui`. D3 and most chart libraries want concrete JS color values, not CSS custom properties — without a bridge, every chart ends up with hardcoded hex. This pattern closes that loophole.

Added in `@codesweep-ai/ui@1.5.0`.

## Rules

1. **Never use raw hex in chart code.** Always pull colors from [`useChartTheme()`](../components/ChartFrame.md). Hardcoded hex in a `d3.select(...).attr("fill", ...)` call is a bug — the `@codesweep-ai/no-hardcoded-chart-colors` ESLint rule catches it.
2. **Series colors come from `theme.categorical[i]`** — never `var(--color-cat-1)` directly inside JS chart code, and never a literal hex.
3. **Use `assignSeriesColors(keys, theme)`** when the same series appears on multiple pages, so "auth" is always the same color everywhere (keys are sorted before assignment for stability).
4. **Wrap every chart in [`<ChartFrame>`](../components/ChartFrame.md)** for consistent loading / empty / error states. The chart only renders the happy path.
5. **Axes (imperative/d3): use `styleAxis(selection, theme)`** — no inline axis styling.
6. **Tooltips:** for imperative / hand-drawn / d3 charts use [`<ChartTooltip>`](../components/ChartTooltip.md) (no custom box styling). Declarative libs that own their tooltip lifecycle (recharts) are the exception — see "Works with any lib" below.
7. **Re-render the chart on theme change.** `useChartTheme()` does this automatically (it re-reads the CSS variables when the resolved theme flips); just make sure your chart's draw effect depends on the returned `theme` object (e.g. `useEffect(draw, [theme])` for d3).

## Works with any lib (the bridge is lib-agnostic)

`@codesweep-ai/ui` ships **no chart component** — it ships the theming *bridge* so you can use whatever your surface already uses, themed consistently. The two integration styles:

| Style | Libs | How |
|-------|------|-----|
| **Imperative** | d3, d3-sankey, canvas | `useChartTheme()` → `theme.*` values passed to `.attr("fill", …)` / `ctx.fillStyle`; axes via `styleAxis`; hover via `<ChartTooltip>`; redraw in a `useEffect([theme])`. The `no-hardcoded-chart-colors` rule guards the `.attr`/`.style` calls. |
| **Declarative** | recharts, victory, visx | `useChartTheme()` colors passed as props (`stroke={theme.categorical[i]}`); the lib owns its own `<Tooltip>` / `<Legend>` slots — render their **content** with design-system tokens (className-based), since the DS `ChartTooltip` (absolute x/y positioning) doesn't fit a declarative lib's payload-driven tooltip API. |

Both wrap in `<ChartFrame>` for loading/empty/error. The in-repo preview (`preview/src/pages/patterns/ChartDemo.tsx`) demonstrates all three: a **d3** bar chart (`styleAxis` + `ChartTooltip`), a **d3-sankey** flow diagram (node/link colors from `theme.categorical` instead of hardcoded hex), and a **recharts** line chart (themed props + a token-styled tooltip).

## The bridge — `useChartTheme()`

```typescript
import { useChartTheme } from "@codesweep-ai/ui";

const theme = useChartTheme();
// theme.bg, theme.fg, theme.muted, theme.accent, theme.success, …
// theme.categorical[i]      → base 10-color palette
// theme.categoricalLight[i] / .categoricalMid[i] / .categoricalDark[i]
```

The hook resolves the *current theme's* values into concrete strings (so d3 gets `#1ee0ca`, not `var(--color-accent)`), and re-resolves on light/dark toggle.

## Helpers

- `styleAxis(selection, theme)` — applies `fill` (axis labels, `theme.axisLabel`), mono font, `var(--font-size-chart-axis)` (11px), and `stroke` (`theme.gridLine`) to a d3 axis selection. Loosely typed so this lib never imports d3.
- `assignSeriesColors(keys, theme)` — returns `{ [key]: color }`, keys sorted first for cross-page stability.

## Canonical composition

```tsx
import {
  useChartTheme,
  assignSeriesColors,
} from "@codesweep-ai/ui";
import { ChartFrame, ChartTooltip } from "@codesweep-ai/ui/chart";

function UsageChart({ rows, loading, error, refetch }) {
  const theme = useChartTheme();
  const colors = assignSeriesColors(rows.map((r) => r.series), theme);
  const [hover, setHover] = useState(null);

  return (
    <ChartFrame
      title="Tokens / day"
      loading={loading}
      error={error}
      empty={rows.length === 0}
      onRetry={refetch}
    >
      <svg /* … draw with theme.* and colors[series] … */ />
      <ChartTooltip visible={hover != null} x={hover?.x ?? 0} y={hover?.y ?? 0}>
        <strong>{hover?.label}</strong>
        <div>{hover?.value}</div>
      </ChartTooltip>
    </ChartFrame>
  );
}
```

## When to use canvas vs SVG

- **≤ 1000 data points → SVG** (d3 / native). Easier theming, accessible, inspectable.
- **> 1000 data points → canvas.** Same `useChartTheme()` pattern — draw with `theme.*` values (`ctx.fillStyle = theme.categorical[i]`). The `no-hardcoded-chart-colors` rule targets `.attr`/`.style` calls; on canvas, the discipline is the same even though the rule can't see `ctx.fillStyle` assignments — so be especially careful to route canvas colors through the theme.

## Enforcement

The `@codesweep-ai/no-hardcoded-chart-colors` rule (warn, in the recommended config) flags a hex/rgb/hsl literal passed as the value of:

- `.attr("fill", …)`, `.attr("stroke", …)`
- `.style("fill", …)`, `.style("stroke", …)`, `.style("color", …)`

`var(--…)` strings and JS expressions (`theme.categorical[i]`) pass cleanly. Enforced on consumer chart source (`features/*/src/**`).

## Anti-patterns

- ❌ `selection.attr("fill", "#1ee0ca")` — use `theme.accent`.
- ❌ `const palette = ["#60a5fa", "#2dd4bf", …]` — use `theme.categorical`.
- ❌ A chart that doesn't restyle on theme toggle — depend your draw effect on the `theme` object.
- ❌ A bespoke loading spinner inside the chart — use `ChartFrame`'s `loading`.
