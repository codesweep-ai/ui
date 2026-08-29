---
name: Dropdown
status: stable
since: 1.0.0
summary: Styled native select element for choosing a single value from a list of options, with optional label, helper, and error states.
keywords: [dropdown, select, native select, option, picker, choose, single select,
           combo, form field, filter, menu, selector, listbox, choice]
use_when:
  - Choosing one value from a short or long predefined list
  - A form field needs a label, helper text, or inline validation error
  - Filtering or controlling a view from a discrete set of options
avoid_when:
  - Multi-select needed → CheckboxGroup
  - Free-text entry with suggestions → SearchInput
related: [FormGroup, Input, CheckboxGroup, SearchInput]
patterns: [Form]
---

# Dropdown

> Styled native select element for choosing from a list of options.

## Props

```typescript
interface DropdownProps {
  /** Currently selected value */
  value: string;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Options list */
  options: DropdownOption[];
  /** Placeholder when no value selected */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional className */
  className?: string;
  /** Text shown as the sole disabled option when `options` is empty. Default: "No options available." Added v1.2.0. */
  emptyMessage?: string;
  /** Label rendered above the select via FormGroup. Added v1.3.0. */
  label?: string;
  /** `id` on the underlying `<select>` — auto-generated when omitted. Added v1.3.0. */
  id?: string;
  /** Render a required marker on the label and forward `required` to the select. Added v1.3.0. */
  required?: boolean;
  /** Grey hint below the select (hidden when error is set). Added v1.3.0. */
  helper?: string;
  /** Red error message below the select; paints the red border. Added v1.3.0. */
  error?: string;
  /** Native select props, including aria-label, are forwarded. */
  [selectProp: string]: unknown;
}

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

## Empty options state (added v1.2.0)

When `options` is an empty array, the select is automatically disabled and renders a single disabled option with `emptyMessage` text (default `"No options available."`). The `placeholder` prop is ignored in this state. The wrapper carries `data-testid="dropdown-empty"`.

This is the appropriate "empty" treatment for a single-line control: rather than a separate empty UI block, the affordance itself communicates "nothing here yet" while staying in place.

## Label / helper / error (added v1.3.0)

When any of `label`, `helper`, or `error` is set, Dropdown wraps itself in [`FormGroup`](./FormGroup.md). `htmlFor` binds to the supplied or `useId()`-generated select id. Bare controls accept `aria-label`; when it is omitted they fall back to the placeholder or “Select option.” When `error` is set, the select renders with `border-color: var(--color-error)` + matching focus ring, and `aria-invalid` is set on the underlying `<select>`.

When none of these props are set, Dropdown renders bare (no wrapper) — preserving the layout of pre-v1.3.0 consumers.

```tsx
<Dropdown
  value={status}
  onChange={setStatus}
  options={statusOptions}
  label="Status"
  required
  helper="Used to filter the upcoming list"
  error={validationError}
/>
```

## Visual Spec

### Layout
- Renders a native `<select>` element.
- `display: block`, `min-width: 150px`.

### Styling
- Border: `1px solid var(--border)`.
- Border-radius: `var(--radius-sm)`.
- Background: `var(--card)` (explicit background required — `transparent` causes unreadable text in dark mode with native `<option>` rendering).
- Padding: `var(--space-2) var(--space-3)`.
- Font-size: `var(--font-size-sm)`.
- Font-family: `var(--font-family-sans)`.
- Color: `var(--fg)`.
- Appearance: `none` (custom dropdown arrow via background SVG or pseudo-element).
- Dropdown arrow: right-aligned chevron using CSS `background-image` (inline SVG data URI).
- **Requires** `color-scheme: dark` / `color-scheme: light` on `:root` (set in `base.css`) so the browser renders native `<option>` elements with the correct theme.

### States
| State    | CSS                                                              |
|----------|------------------------------------------------------------------|
| Default  | `border: 1px solid var(--border)`, `color: var(--fg)`           |
| Hover    | `border-color: var(--muted)`                                    |
| Focus    | Token-driven accent ring; error state uses `var(--color-error)` |
| Disabled | `opacity: 0.5`, `cursor: not-allowed`                          |
| Placeholder | `color: var(--muted)` (when no value selected)              |

### Responsive
- No breakpoint changes. Width follows parent container or `min-width`.

## Behavior

### Interactions
- **Change**: Native `<select>` change event fires `onChange(event.target.value)`.
- **Click**: Opens native browser dropdown menu.

### Keyboard
| Key         | Action                          |
|-------------|---------------------------------|
| Space/Enter | Open dropdown menu              |
| ArrowUp     | Select previous option          |
| ArrowDown   | Select next option              |
| Escape      | Close dropdown menu             |
| Tab         | Move focus to next element      |

### Accessibility
- Uses native `<select>` element — inherits full accessibility support.
- Placeholder rendered as a disabled `<option>` with empty value.
- Disabled options get `disabled` attribute on `<option>`.
- `aria-label` or associated `<label>` should be provided by the consumer.

## Persistence

None.

## Dependencies

- `cn()` utility for className merging.

## Edge Cases

- **No options**: Renders a disabled `<select>` with the `emptyMessage` option.
- **Very long option labels**: Text truncates naturally in the select.
- **No value selected**: Shows placeholder option (disabled, not selectable).
- **Single option**: Select still renders and is interactive.

## Traceability

`data-component="Dropdown"` on the root `<select>`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Dropdown } from "@codesweep-ai/ui";
export function Example() { return <Dropdown aria-label="Status" value="open" onChange={() => {}} options={[{ value: "open", label: "Open" }]} />; }
```
