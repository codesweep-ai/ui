---
name: Button
status: stable
since: 1.0.0
summary: Standard interactive button with six visual variants (primary, secondary, danger, ghost, success, warning) and two sizes.
keywords: [button, cta, call to action, submit, click, action, primary button,
           ghost button, danger button, secondary button, interactive, trigger,
           form submit, icon button, control]
use_when:
  - Any user-triggered action (submit, confirm, cancel, navigate)
  - Icon-only controls in toolbars (ghost variant, add aria-label)
  - Destructive confirmations (danger variant)
avoid_when:
  - You need ordinary text navigation without button emphasis → use an <a>
related: [FormGroup, Modal]
patterns: [Form]
---

# Button

> Standard button with multiple visual variants and sizes.

## Props

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual variant */
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success" | "warning";
  /** Size */
  size?: "sm" | "md";
  /** Apply Button styling and props to the single child element. */
  asChild?: boolean;
  /** Content */
  children: React.ReactNode;
}
```

## Visual Spec

### Layout
- `display: inline-flex`, `align-items: center`, `justify-content: center`, `gap: var(--space-2)`.
- `cursor: pointer`.

### Styling by Variant

| Variant     | Background                       | Text                              | Border                           |
|-------------|----------------------------------|-----------------------------------|----------------------------------|
| `primary`   | `var(--color-btn-primary)`       | `var(--color-btn-primary-text)`   | `transparent`                    |
| `secondary` | `transparent`                    | `var(--fg)`                       | `1px solid var(--border)`        |
| `danger`    | `transparent`                    | `var(--color-error)`              | `1px solid var(--color-error)`   |
| `ghost`     | `transparent`                    | `var(--fg)`                       | `none`                           |
| `success`   | `var(--color-success)`           | `var(--color-btn-success-text)`   | `transparent`                    |
| `warning`   | `var(--color-warning)`           | `var(--color-btn-warning-text)`   | `transparent`                    |

The `*-text` tokens flip between dark (`#000000`) and light (`#ffffff`) to ensure WCAG AA contrast against their respective bright/muted backgrounds in each theme.

### Common Styles
- Border-radius: `var(--radius-sm)`.
- Font-weight: `var(--font-weight-medium)`.
- Font-family: `var(--font-family-sans)`.
- Transition: `background-color var(--transition-normal), border-color var(--transition-normal), color var(--transition-normal)`.

### Sizing

| Size  | Padding                              | Font-size                 |
|-------|--------------------------------------|---------------------------|
| `sm`  | `var(--space-1) var(--space-2)`      | `var(--font-size-xs)`     |
| `md`  | `var(--space-2) var(--space-3)`      | `var(--font-size-sm)`     |

Default size is `md`.

### States
| State    | CSS                                                                    |
|----------|------------------------------------------------------------------------|
| Default  | As per variant table                                                   |
| Hover (primary)   | `filter: brightness(1.1)`                                    |
| Hover (secondary) | `background: var(--color-bg-muted-hover)`                    |
| Hover (danger)    | `background: var(--color-error-bg)`                          |
| Hover (ghost)     | `background: var(--color-bg-muted-hover)`                    |
| Hover (success)   | `filter: brightness(1.1)`                                    |
| Hover (warning)   | `filter: brightness(1.1)`                                    |
| Active   | `transform: scale(0.98)`                                              |
| Focus    | `box-shadow: 0 0 0 2px var(--color-accent)`, `outline: none`   |
| Disabled | `opacity: 0.7`, `cursor: not-allowed`, `pointer-events: none`        |

### Responsive
- No breakpoint changes. Button sizing is fixed.

## Behavior

### Interactions
- **Click**: Fires native `onClick` handler.
- **Disabled**: All interactions suppressed via `pointer-events: none`.

### Keyboard
| Key   | Action                   |
|-------|--------------------------|
| Enter | Activate button          |
| Space | Activate button          |
| Tab   | Move focus to next element |

### Accessibility
- Uses native `<button>` element — inherits accessibility.
- `disabled` attribute applied when `disabled` prop is true.
- When button has only an icon (no text), consumer must provide `aria-label`.
- `type` defaults to `"button"` (not `"submit"`) to prevent accidental form submissions.
- `asChild` preserves a child's native element and attributes while applying Button styling. Use
  `<Button asChild><a href="/path">Open</a></Button>` for a link that looks like a button.

## Persistence

None.

## Dependencies

- `cn()` utility for className merging.
- `lucide-react` icons may be passed as children.

## Edge Cases

- **Icon-only button**: Works, but consumer must add `aria-label`.
- **Loading state**: Not built-in. Consumer can replace children with a spinner and set `disabled`.
- **Very long text**: Text wraps or truncates depending on parent container constraints.
- **No variant specified**: Defaults to `"primary"`.

## Traceability

`data-component="Button"` on the root `<button>`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Button } from "@codesweep-ai/ui";
export function Example() { return <Button variant="primary">Run scan</Button>; }
```
