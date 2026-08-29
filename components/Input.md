---
name: Input
status: stable
since: 1.3.0
summary: Standard text input supporting plain text, email, password, number, tel, url, and multiline (textarea) variants, with optional prefix/suffix slots and error state.
keywords: [input, text input, text field, textarea, multiline, email, password,
           number, form control, prefix, suffix, search field, field, controlled input]
use_when:
  - Collecting freeform text from the user in a form
  - Needing a multiline textarea (set multiline=true)
  - Showing an inline icon or unit prefix/suffix inside the input
avoid_when:
  - Search-specific UX with clear button → SearchInput
  - Choosing from a fixed list → Dropdown or CheckboxGroup
related: [FormGroup, Dropdown, SearchInput, CheckboxGroup]
patterns: [Form]
---

# Input

> Standard text input. Variants for plain text, email, password, number, tel, url, and multiline (textarea). For search-specific patterns use [`SearchInput`](./SearchInput.md). For label + helper + error composition wrap this in [`FormGroup`](./FormGroup.md).

Added in `@codesweep-ai/ui@1.3.0`.

## Props

```typescript
type InputType = "text" | "email" | "password" | "number" | "tel" | "url";

interface InputBaseProps {
  /** Visual size. Default: "md" */
  size?: "sm" | "md";
  /** Paints the red error border + focus ring. */
  error?: boolean;
  /** Inline content rendered inside the left edge (icon or short label). */
  prefix?: React.ReactNode;
  /** Inline content rendered inside the right edge (icon, unit suffix). */
  suffix?: React.ReactNode;
  /** Additional className on the wrapper. */
  className?: string;
}

// Single-line: extends React.InputHTMLAttributes<HTMLInputElement>
interface SingleLineInputProps extends InputBaseProps {
  type?: InputType;             // default "text"
  multiline?: false;
  // + all native input props: value, defaultValue, onChange, placeholder,
  //   disabled, readOnly, required, name, id, autoComplete, min, max, etc.
}

// Multi-line: extends React.TextareaHTMLAttributes<HTMLTextAreaElement>
interface MultilineInputProps extends InputBaseProps {
  multiline: true;
  rows?: number;                // default 3
  // + all native textarea props
}

type InputProps = SingleLineInputProps | MultilineInputProps;
```

`forwardRef` to the underlying `<input>` or `<textarea>`.

## Visual Spec

### Layout

```
sm    ┌──────────────────────────┐
      │ value                    │
      └──────────────────────────┘
       padding: 1 / 2

md    ┌──────────────────────────┐
      │  value                   │
      └──────────────────────────┘
       padding: 2 / 3

with prefix/suffix:

      ┌────┬───────────────┬────┐
      │ $  │ 1234          │ USD│
      └────┴───────────────┴────┘
```

### Styling

| Property        | Value                                                           |
|-----------------|-----------------------------------------------------------------|
| Background      | `var(--card)`                                                   |
| Border          | `1px solid var(--border)`                                       |
| Border-radius   | `var(--radius-sm)`                                              |
| Padding (sm)    | `var(--space-1) var(--space-2)`                                 |
| Padding (md)    | `var(--space-2) var(--space-3)`                                 |
| Font-size (sm)  | `var(--font-size-xs)`                                           |
| Font-size (md)  | `var(--font-size-sm)`                                           |
| Font-family     | `var(--font-family-sans)`                                       |
| Color           | `var(--fg)`                                                     |
| Placeholder     | `var(--muted)`                                                  |

### States

| State    | CSS                                                                                  |
|----------|--------------------------------------------------------------------------------------|
| Default  | As above.                                                                            |
| Hover    | `border-color: var(--muted)`                                                         |
| Focus    | `border-color: var(--color-accent)`, `ring: 2px var(--color-accent)`    |
| Error    | `border-color: var(--color-error)`, `ring: 2px var(--color-error)` on focus          |
| Disabled | `opacity: 0.6`, `cursor: not-allowed`. Hover effects suppressed.                     |
| ReadOnly | `background: var(--color-bg-subtle)`. Border stays default; not red.                 |

### Prefix / Suffix

Rendered inside the wrapper, outside the input's padding box. Inherit `var(--muted)` color so single icons render at the right tone with no extra styling. Pass a wrapper `<span>` if you need a different color.

The wrapper retains its outer padding (sm/md) on whichever side has no affix, and tightens to `var(--space-1)` on the side that does — so prefix + input + suffix sit visually balanced.

### Multiline

Renders `<textarea>` with `resize-y` (user can drag vertically), `rows={3}` default, `line-height: var(--line-height-normal)`. Same wrapper styling as single-line.

## Behavior

### Interactions

- **Type**: fires native `onChange`. Pass `value` for controlled mode, `defaultValue` for uncontrolled.
- **Focus**: native focus management. The wrapper paints the ring via `focus-within`.
- **Disabled**: native `disabled` blocks input + suppresses hover.
- **ReadOnly**: native `readOnly` allows selection but blocks edit.

### Keyboard

Standard text-input behavior. No custom keyboard handling.

### Accessibility

- Always paired with a `<label>` (use [`FormGroup`](./FormGroup.md)) or `aria-label`.
- `error={true}` is **visual only**. To convey error to AT, set `aria-invalid={true}` and provide an error message via `FormGroup error="…"` (which auto-wires both).
- Renders a single native element under the hood — fully keyboard-navigable, supports password manager autofill, and works with `name` for form submission.

## Persistence

None. Consumer manages state (`useState`, `react-hook-form`, etc.).

## Dependencies

- `cn()` utility for className merging.

## Edge Cases

- **`type="number"`**: native step controls render per browser default. Pass `inputMode="numeric"` for mobile keyboards.
- **`type="password"`**: no built-in show/hide toggle. Wrap in `FormGroup` and add a `suffix` with a toggle button if needed.
- **Very long single-line value**: input scrolls horizontally as the user types; the wrapper does not expand.
- **`multiline` + `prefix`/`suffix`**: prefix/suffix align to the top of the textarea through the component's stretch alignment. Use sparingly with multiline.

## Traceability

`data-component="Input"` on the wrapper. `data-multiline="true"` when multiline.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Input } from "@codesweep-ai/ui";
export function Example() { return <Input multiline aria-label="Repository notes" placeholder="acme/tool" />; }
```
