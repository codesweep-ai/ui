---
name: FormGroup
status: stable
since: 1.3.0
summary: Label + control + helper/error composition wrapper. The canonical way to render any single form field with accessible label binding, error messaging, and aria wiring.
keywords: [form group, label, field wrapper, helper text, error message, validation,
           aria, accessible form, input wrapper, form field, required, hint, describedby]
use_when:
  - Wrapping any single Input, Dropdown, or custom control with a visible label
  - Displaying inline validation errors or helper hints below a field
  - Building accessible forms with proper htmlFor / aria-describedby wiring
avoid_when:
  - Wrapping CheckboxGroup → CheckboxGroup already renders its own label; nesting creates duplicate labels
related: [Input, Dropdown, CheckboxGroup]
patterns: [Form]
---

# FormGroup

> Label + control + helper/error composition. The canonical way to render any single form field. Auto-wires `htmlFor`, `aria-describedby`, and `aria-invalid` on the child control.

Added in `@codesweep-ai/ui@1.3.0`.

## Props

```typescript
interface FormGroupProps {
  /** Field label rendered above the control. */
  label: string;
  /**
   * `id` for the control. Required when wrapping a single native input/select/
   * textarea — the label's htmlFor binds to this id. May be omitted when
   * wrapping a composite (CheckboxGroup, custom control). When omitted, an
   * auto-generated id is forwarded to the child via the `id` prop.
   */
  htmlFor?: string;
  /** Renders a `*` after the label and forwards `required` to the child. */
  required?: boolean;
  /** Grey hint text below the control. Hidden when `error` is set. */
  helper?: string;
  /** Red message below the control. Replaces helper and forwards aria-invalid. */
  error?: string;
  /** Additional className on the wrapper. */
  className?: string;
  /** The control (Input, Dropdown, CheckboxGroup, custom). */
  children: React.ReactNode;
}
```

## Visual Spec

### Layout

```
  ┌──────────────────────────────────────┐
  │  LABEL *                             │  ← text-label-upper utility
  │  ┌────────────────────────────────┐  │
  │  │  control                       │  │  ← children
  │  └────────────────────────────────┘  │
  │  Helper or error text                │  ← font-size-xs
  └──────────────────────────────────────┘
```

- Wrapper: `display: flex; flex-direction: column; gap: var(--space-1)`.
- Label: `text-label-upper` utility (font-size-label, semibold, uppercase, var(--muted)).
- Required asterisk: `var(--color-error)`, `aria-hidden`, separated by `var(--space-0-5)`.
- Helper / error: `font-size: var(--font-size-xs)`. Helper uses `var(--muted)`, error uses `var(--color-error)`.

## Behavior

### Auto-wiring

When a *single* React element is passed as children, FormGroup clones it to forward:

| Prop              | Value                                                              |
|-------------------|--------------------------------------------------------------------|
| `id`              | `htmlFor` if provided, else an auto-generated `formgroup-<rand>` id. Does NOT overwrite a child-supplied `id`. |
| `aria-describedby`| The id of the helper or error span (error takes precedence). Does NOT overwrite a child-supplied value. |
| `aria-invalid`    | `true` when `error` is set. Does NOT overwrite a child-supplied value. |
| `required`        | Forwarded from FormGroup `required={true}`. Does NOT overwrite a child-supplied value. |
| `error`           | `true` when FormGroup `error="…"` is set — the `Input` reads this as a boolean to paint the red border. Components that don't recognize this prop ignore it harmlessly. |

When multiple children are passed (or a fragment), the consumer is responsible for wiring these props themselves on the relevant control. The label's `htmlFor` is only set when the consumer explicitly supplies `htmlFor` to FormGroup, since the auto-generated id wouldn't be visible to know which child to bind.

### Error precedence

`error` > `helper`. When both are set, only `error` renders. This matches the canonical state-precedence pattern in [`patterns/ComponentStates.md`](../patterns/ComponentStates.md) (`loading > error > empty > data` for containers; here it's `error > helper` for single fields).

### Accessibility

- Native `<label>` element binds to the control via `htmlFor` (when supplied).
- `aria-describedby` points to a stable id (`<controlId>-helper` or `<controlId>-error`).
- Error span has `role="alert"` so screen readers announce validation failures as they appear.
- Required asterisk is `aria-hidden="true"` to avoid the redundant announcement — the `required` attribute on the control conveys the semantics.

## Persistence

None.

## Dependencies

- `cn()` utility.

## Edge Cases

- **Composite children (e.g. fieldset of checkboxes)**: pass `htmlFor` matching the consumer's chosen id, OR omit `htmlFor` and the label won't bind to a specific control (acceptable for fieldset-style groups where there's no single focusable target). For CheckboxGroup specifically, FormGroup is **not** the right wrapper — CheckboxGroup already renders its own label and helper; nesting it inside FormGroup creates duplicate labels. See [`patterns/Form.md`](../patterns/Form.md) § "Composite controls".
- **No helper, no error**: nothing renders below the control; the wrapper contains only the label and control with `var(--space-1)` between them.
- **Long error message**: wraps naturally; height grows. No truncation.

## Traceability

`data-component="FormGroup"` on the wrapper.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { FormGroup, Input } from "@codesweep-ai/ui";
export function Example() { return <FormGroup label="Repository" helper="Owner/name"><Input placeholder="acme/tool" /></FormGroup>; }
```
