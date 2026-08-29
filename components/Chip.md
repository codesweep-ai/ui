---
name: Chip
status: experimental
since: 0.2.0
summary: Dense toggle pill for toolbar filters, with pressed, count, and disabled states.
keywords: [chip, filter chip, pill, toggle, toolbar filter, count, pressed]
use_when:
  - Toggling independent filters in a compact toolbar
  - Showing a filter label with a small result count
avoid_when:
  - Choosing exactly one of several modes → SegmentedControl
  - Choosing from a long list → Dropdown
related: [SegmentedControl, Dropdown, Legend]
patterns: [DataTable, FormResults]
---

# Chip

> A dense pressed/unpressed filter control that preserves a one-row toolbar.

## Props

```ts
interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
  count?: number;
  onPressedChange?: (pressed: boolean) => void;
  children: React.ReactNode;
}
```

## Behavior

- Uses a native button and always exposes `aria-pressed`.
- Calls the native `onClick` first. Unless it prevents default, `onPressedChange` receives the inverse pressed state.
- `disabled` uses native button semantics and prevents activation.
- `count` is visible text inside the button, so it participates in the accessible name.

## Visual spec

- Fixed dense height: `1.75rem`.
- Rounded pill border; unpressed uses the card surface, pressed uses the accent surface.
- Label typography uses the label token; count uses tabular numerals.
- Focus-visible uses the accent outline.

## Traceability

- Button: `data-component="Chip"`.
- Label text region: `data-chip-label`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Chip } from "@codesweep-ai/ui";
export function Example() { return <Chip pressed count={12} onPressedChange={() => {}}>Open</Chip>; }
```
