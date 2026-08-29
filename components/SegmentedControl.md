---
name: SegmentedControl
status: experimental
since: 0.2.0
summary: Compact radiogroup for choosing one of two to five adjacent options.
keywords: [segmented control, radio group, view switcher, mode toggle, exclusive options]
use_when:
  - Switching between two to five mutually exclusive views or render modes
  - Keeping a small mode choice visible in a compact toolbar
avoid_when:
  - Toggling independent filters → Chip
  - More than five values, or options needing a description → RadioGroup
  - Many values that need not stay visible → Dropdown
related: [RadioGroup, Chip, Dropdown, Legend]
patterns: [DataTable, FormResults]
---

# SegmentedControl

> An exclusive 2–5 option switcher with radiogroup semantics and roving keyboard focus.

## Props

```ts
interface SegmentedControlOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

interface SegmentedControlProps extends React.HTMLAttributes<HTMLDivElement> {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}
```

Pass `aria-label` to name the radiogroup; it falls back to `"Options"`. Icon-only options should use `ariaLabel`.

## Behavior and keyboard

- Exactly 2–5 options are required; other lengths throw an explanatory error.
- Each option is a native button with `role="radio"` and `aria-checked`.
- Only the selected enabled option (or first enabled fallback) has `tabIndex=0`.
- Arrow keys wrap through enabled options and select the focused value. Home/End choose the first/last enabled option.
- Click selects an enabled option. Native `disabled` semantics cover option-level and group-level disabling.

## Traceability

- Root: `data-component="SegmentedControl"` on the `role="radiogroup"` element.
- Each option button: `data-segmented-option="{option.value}"`.
- Selected option: `data-segmented-active` and `aria-checked="true"`.

Use the option-value hook instead of positional selectors such as
`:first-child` or `:last-child`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { SegmentedControl } from "@codesweep-ai/ui";
export function Example() { return <SegmentedControl aria-label="View" value="rendered" onChange={() => {}} options={[{ value: "rendered", label: "Rendered" }, { value: "raw", label: "Raw" }]} />; }
```
