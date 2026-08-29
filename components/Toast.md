---
name: Toast
status: stable
since: 1.11.0
summary: Single transient notification — feedback for an action that auto-dismisses, with a colored variant + screen-reader announcement.
keywords: [toast, notification, snackbar, alert, feedback, transient, popup,
           success message, error message, status, dismiss, announce, sr-only,
           aria-live, role status, role alert]
use_when:
  - Confirming an action completed ("Saved", "Copied")
  - Reporting a recoverable error ("Couldn't save — retry")
  - Surfacing a background event without blocking the user
avoid_when:
  - The user must respond before continuing — use a Modal / Dialog instead
  - The message is persistent / structural — use an inline Alert / Banner
related: [ToastContainer]
patterns: []
---

# Toast

> The single-toast visual component. It's what `ToastContainer` renders for each item in the toast store. Most consumers never reach for `<Toast>` directly — they call `toast.success(...)` and mount `<ToastContainer/>` once at the app root. This spec covers the visual contract.

## Props

```typescript
interface ToastProps {
  /** The toast data (variant, message, id, etc.) from the toast store. */
  item: ToastItem;
  /** Called when the user clicks the dismiss button. */
  onDismiss: () => void;
  className?: string;
}
```

## Variants

Variant drives a colored left border, the leading icon, and the ARIA role:

| Variant   | Border / icon color   | Role     | aria-live   |
| --------- | --------------------- | -------- | ----------- |
| `success` | `--color-success`     | `status` | `polite`    |
| `info`    | `--muted`             | `status` | `polite`    |
| `warning` | `--color-warning`     | `alert`  | `assertive` |
| `error`   | `--color-error`       | `alert`  | `assertive` |

## Visual spec

- Card with `border-left: 4px solid <variant>`, `--card` bg, `--border` for the rest of the border, `--radius-md`, `--shadow-md`.
- Max width 360px; padded `--space-3` × `--space-2`; gap `--space-2`.
- Leading icon (`lucide-react`), body text at `--font-size-sm` / `--fg`, trailing dismiss button (`X` icon, `--muted` → `--fg` on hover).
- Enter animation: `cs-toast-enter` (slide-up + fade-in, 200ms ease-out). Respects `prefers-reduced-motion`.

## Accessibility

- `role="status"` + `aria-live="polite"` for `success` / `info`.
- `role="alert"` + `aria-live="assertive"` for `warning` / `error`.
- The dismiss button has `aria-label="Dismiss notification"`.
- Icons are `aria-hidden="true"` — the variant is conveyed by role, not icon.

## Traceability

Root notification: `data-component="Toast"`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Toast } from "@codesweep-ai/ui";
export function Example() { return <Toast item={{ id: "saved", variant: "success", message: "Saved", duration: null, important: false }} onDismiss={() => {}} />; }
```
