---
name: Form
status: stable
since: 1.3.0
summary: Composition rules for form fields — layout, validation, submit placement, and error-summary patterns.
keywords: [form, form layout, field validation, form group, input, submit button, error summary, form validation, accessible form, form pattern]
use_when:
  - Building any form with one or more user-editable fields
  - Needing consistent validation UX (blur-first, on-change-after-blur, on-submit)
  - Forms with more than 5 fields that need an error summary block
avoid_when:
  - Read-only data display → Table, Card, or MasterDetail
related: [FormGroup, Input, Button, Dropdown, CheckboxGroup]
---

# Pattern: Form

> How to compose form fields in `@codesweep-ai/ui`. Cross-cutting rules for layout, validation, submit-button placement, and error-summary patterns.

Added in `@codesweep-ai/ui@1.3.0`.

## The canonical field

Every single form field is a [`FormGroup`](../components/FormGroup.md) wrapping one control.

```tsx
import { FormGroup, Input, Button } from "@codesweep-ai/ui";

<FormGroup label="Email" htmlFor="email" required helper="We'll never share it.">
  <Input type="email" placeholder="you@example.com" />
</FormGroup>
```

Don't render a `<label>` or helper text manually next to an input. FormGroup auto-wires `htmlFor`, `aria-describedby`, and `aria-invalid` — bypassing it loses these guarantees and creates a11y drift.

## Stacking

Forms are vertical stacks of FormGroups. Use `display: flex; flex-direction: column; gap: var(--space-4)` on the form container (or use a wrapper component if one emerges).

```tsx
<form
  onSubmit={handleSubmit}
  className="form-stack"
>
  <FormGroup label="Name" htmlFor="name" required>
    <Input />
  </FormGroup>
  <FormGroup label="Email" htmlFor="email" required>
    <Input type="email" />
  </FormGroup>
  <FormGroup label="Notes" htmlFor="notes">
    <Input multiline rows={4} />
  </FormGroup>
  <Button type="submit">Save</Button>
</form>
```

### When to use a two-column grid

Switch to a two-column layout only when:
- Both fields are *short* (e.g. first name / last name, city / postal code).
- They are semantically related (the user thinks of them together).
- The form is on a wide surface (≥640px container).

```tsx
<div className="form-grid">
  <FormGroup label="First name" htmlFor="fn" required>
    <Input />
  </FormGroup>
  <FormGroup label="Last name" htmlFor="ln" required>
    <Input />
  </FormGroup>
</div>
```

Otherwise stack single-column. A single-column form is faster to scan and works on every screen width.

## Validation

### Field-level errors

Pass `error="message"` to the FormGroup. It forwards `aria-invalid={true}` and renders a red message with `role="alert"`.

```tsx
<FormGroup
  label="Email"
  htmlFor="email"
  error={errors.email?.message}
>
  <Input type="email" />
</FormGroup>
```

When using `Input` standalone (no FormGroup), pass `error={true}` to paint the red border, but be aware: this is **visual only**. The a11y wiring (`aria-invalid`, `role="alert"`) is FormGroup's job. Standalone `Input` should be rare — only in highly customized layouts where FormGroup's column layout doesn't fit.

### When to validate

- **On blur** for first validation of a field (don't yell at a user who's still typing).
- **On change** *after* a field has had one validation pass (give feedback as they fix it).
- **On submit** as the final gate — surface any new errors and focus the first invalid field.

### Error summaries (forms with many fields)

For forms with >5 fields, render a summary block above the submit button that lists all current errors with anchor links:

```tsx
{errorList.length > 0 && (
  <div
    role="alert"
    className="form-error-summary"
  >
    <strong>{errorList.length} error{errorList.length === 1 ? "" : "s"}</strong>
    <ul className="form-error-list">
      {errorList.map((e) => (
        <li key={e.id}>
          <a href={`#${e.id}`}>{e.label}: {e.message}</a>
        </li>
      ))}
    </ul>
  </div>
)}
```

## Submit button placement

- **Single-column form**: full-width or left-aligned `Button` at the bottom of the stack.
- **Two-column form**: right-aligned in a row of its own, optionally with a secondary "Cancel" `Button variant="secondary"` to its left.
- **Modal form**: the modal's footer holds the submit button; the form body has no submit button of its own.

Always set `type="submit"` on the submit button when it's inside a `<form>` — otherwise it defaults to `type="button"` (Button's default) and submission won't fire on Enter.

## Composite controls

Some controls aren't single inputs:

- **CheckboxGroup**: has its own `label` prop and renders sections. Don't nest it in FormGroup — pass the `label` directly to CheckboxGroup. (As of v1.3.0, CheckboxGroup also accepts `helper` and `error` props for consistency with the FormGroup contract.)
- **Dropdown**: a single native `<select>`. Wrap in FormGroup like any single control.

## Disabled / loading forms

While a submission is in flight:
- Disable the submit button (`disabled` prop) and replace its label with something specific ("Saving…", not "Loading…").
- Optionally disable every input (`disabled` prop on each Input) to prevent edits mid-submit. Most forms don't need this — the disabled submit button is usually enough.
- Don't replace the form body with a spinner. The user just clicked submit; keeping the form visible is the right affordance.

## Anti-patterns

- ❌ Bare `<input>` + `<label>` without FormGroup. You'll forget `aria-describedby`, you'll style the label inconsistently, and the next field will be slightly different.
- ❌ Red text *above* the input. Errors go below, attached to the input they describe.
- ❌ Tooltips for required fields. Use the asterisk on the label.
- ❌ Validating on every keystroke before the field has ever blurred. It's noisy and reads as scolding.
- ❌ Generic "Form has errors" without saying which field. Use the error summary pattern above for >5-field forms.

## Reference

For a minimal canonical stack see [`components/FormGroup.md`](../components/FormGroup.md) and [`components/Input.md`](../components/Input.md). The in-repo unit tests at `src/components/FormGroup.test.tsx` exercise the auto-wiring contract.
