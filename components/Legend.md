---
name: Legend
status: experimental
since: 0.2.0
summary: Compact token-colour legend that can be static or toggle a selected item set.
keywords: [legend, key, swatch, color key, filter legend, toggle legend, categories]
use_when:
  - Explaining token-coloured categories beside a chart, event lane, or trace
  - Letting users show or hide categories without building custom legend buttons
avoid_when:
  - Choosing exactly one mode → SegmentedControl
  - Showing status text without category filtering → StatusBadge
related: [EventLanes, Chip, SegmentedControl, StatusBadge]
patterns: [AgentActivity, Chart]
note: Swatch colors are CSS custom-property names, never resolved colors or hex values.
---

# Legend

> A compact row of labelled colour swatches, static by default and toggleable when `onChange` is supplied.

## Props

```ts
interface LegendItem {
  id: string;
  label: React.ReactNode;
  color: `--${string}`;
  shape?: "dot" | "square";
}

interface LegendProps extends React.HTMLAttributes<HTMLDivElement> {
  items: LegendItem[];
  selected?: Set<string>;
  onChange?: (selected: Set<string>) => void;
  extras?: React.ReactNode;
}
```

`color` is interpolated as `var(${color})`, matching EventLanes' palette contract. Pass `--color-cat-1`, not a computed `rgb()` value or hex literal.

`shape` defaults to `"dot"`. Use `"square"` when the legend describes a chart whose marks are
squares — `EventLanes` with `shape: "square"` events, for instance. A legend whose swatch does not
match the mark it stands for leaves the reader matching colours by hand.

## Behavior

- Without `onChange`, each item is static text and no controls enter the tab order.
- With `onChange`, items render as buttons with `aria-pressed`; `selected` defaults to all item ids.
- Activating an item clones the selected set, toggles that id, and calls `onChange`.
- `extras` sits after the item list and may contain counts, help text, or another compact action.
  It is laid out like the item list — `display: flex`, `align-items: center`, `gap: var(--space-2)`
  — so a swatch, a toggle and a run of text line up on one centre and are spaced without the
  consumer adding its own rules. It was previously `margin-left: auto` and nothing else, which left
  its children inline and baseline-aligned: they ran together, and anything carrying a block-level
  swatch sat about 2px off the text beside it.

## Accessibility

The root has `role="group"`, so the legend reads as one thing rather than as
loose buttons. Interactive labels provide each button's accessible name. Swatches
are decorative and `aria-hidden`. The pressed state is conveyed through
`aria-pressed`, not colour alone.

## Traceability

- Root: `data-component="Legend"`.
- Every decorative swatch: `data-legend-swatch="{item.id}"`.
- Every visible item label: `data-legend-label="{item.id}"`.

The swatch and label hooks render in both static and interactive legends. Use the shared item ID to pair them without depending on `li`, `button`, or nested `span` structure.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Legend } from "@codesweep-ai/ui";
export function Example() { return <Legend items={[{ id: "tool", label: "Tool", color: "--color-cat-3" }]} />; }
```
