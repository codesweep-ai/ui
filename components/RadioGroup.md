---
name: RadioGroup
status: experimental
since: 0.2.0
summary: Exclusive choice among two or more options, each able to carry a description.
keywords: [radio, radio group, radiogroup, exclusive options, single select, choice, mode]
use_when:
  - Choosing one of several mutually exclusive options that each need explaining
  - More options than SegmentedControl accepts, or options too long for a compact toolbar
  - The choice is the subject of the view rather than a control on it
avoid_when:
  - Two to five short labels in a compact toolbar → SegmentedControl
  - Many values where the options need not stay visible → Dropdown
  - Options that are not mutually exclusive → CheckboxGroup
related: [SegmentedControl, CheckboxGroup, Dropdown, FormGroup]
patterns: [MarkdownViewer]
---

# RadioGroup

> An exclusive choice with radiogroup semantics, roving keyboard focus, and an
> optional description under each label.

## Choosing between this and SegmentedControl

`SegmentedControl` is the compact case: two to five short labels in a toolbar,
and it throws outside that range. `RadioGroup` has no upper bound and gives each
option a second line, so the options can explain themselves. Prefer
`SegmentedControl` when the control is incidental to the view; prefer
`RadioGroup` when choosing *is* the view.

## Props

```ts
interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal";
}
```

Pass `aria-label` to name the radiogroup; it falls back to `"Options"`.

## Visual Spec

- Root is a flex container, `column` by default and `row` with wrapping when
  `orientation="horizontal"`.
- Each option is a button: a dot, then the label with an optional description
  beneath it in `var(--muted)` at `var(--font-size-sm)`.
- The dot's ring is drawn in every state, filled with `var(--color-accent)` when
  selected, so selecting does not shift the row.
- The selected option carries `var(--color-bg-muted)` and a `var(--border)`
  outline; hover uses `var(--color-bg-muted-hover)`.
- Disabled options are `opacity: .5` with `cursor: not-allowed`.

## Behavior and keyboard

- At least 2 options are required; fewer throws an explanatory error.
- Each option is a native button with `role="radio"` and `aria-checked`.
- Only the selected enabled option (or the first enabled one) has `tabIndex=0`,
  so the group is a single tab stop.
- Arrow keys wrap through enabled options and select the focused value; both
  axes are accepted in either orientation. Home/End choose the first/last
  enabled option.
- Click selects an enabled option. Native `disabled` covers option-level and
  group-level disabling.

## Traceability

- Root: `data-component="RadioGroup"` on the `role="radiogroup"` element.
- Orientation: `data-radio-orientation="vertical" | "horizontal"` on the root.
- Each option button: `data-radio-option="{option.value}"`.
- Selected option: `data-radio-active` and `aria-checked="true"`.
- Label: `data-radio-label`. Description: `data-radio-description`.

Use the option-value hook rather than positional selectors such as
`:first-child`, and read the label through `data-radio-label` rather than
descending into the button's element order.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { RadioGroup } from "@codesweep-ai/ui";
export function Example() { return <RadioGroup aria-label="Parser" value="light" onChange={() => {}} options={[{ value: "light", label: "Lightweight", description: "166,136 B raw" }, { value: "rich", label: "Full parser", description: "329,337 B raw" }]} />; }
```
