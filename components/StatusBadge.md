---
name: StatusBadge
status: stable
since: 1.0.0
summary: Small static indicator for status values with a colored dot and uppercase label.
keywords: [status badge, badge, indicator, success, warning, error, neutral, dot,
           label, state indicator, tag, chip, status label]
use_when:
  - Displaying a discrete status value (success / warning / error / neutral)
  - Labelling an item's current state in a table, card, or list row
avoid_when:
  - Live pulsing activity signal → PulseBadge
related: [PulseBadge, Table, Card]
patterns: [ComponentStates]
---

# StatusBadge

> Small indicator for status values with colored dot and label.

## Props

```typescript
interface StatusBadgeProps {
  /** Status label */
  label: string;
  /** Status type */
  status: "success" | "info" | "warning" | "error" | "severe" | "neutral";
  /** Override the leading dot with any CSS colour. */
  color?: string;
  size?: "sm" | "md" | "lg";
  emphasis?: "default" | "ring" | "label";
  /** Opt into a polite live region when this badge announces changing status. */
  announce?: boolean;
  /** Full-width variant */
  full?: boolean;
  /** Additional className */
  className?: string;
}
```

## Visual Spec

### Layout
- `display: inline-flex`, `align-items: center`, `gap: var(--space-2)`.
- When `full`: `width: 100%`.

### Styling
- Border: `1px solid var(--border)`.
- Border-radius: `var(--radius-sm)`.
- Padding: `var(--space-1) var(--space-2)`.
- Background: `transparent`.

### Label
- The component always renders a leading status dot; do not add another symbol to the label.
- Font-size: `var(--font-size-xs)`.
- Text-transform: `uppercase` (the supplied label is visually uppercased).
- Letter-spacing: `0.5px`.
- Color: `var(--muted)`.
- Font-weight: `var(--font-weight-medium)`.
- With `emphasis="label"`, the two highest severities use status color: `error` uses `--color-error-text` and `severe` uses the existing `--color-severe` token. Other statuses remain `--muted`.

### Status Dot
- Size: `8px x 8px`.
- Border-radius: `50%` (circle).
- Flex-shrink: `0`.

### Status Colors

| Status    | Dot Color               | Border (optional tint)          |
|-----------|-------------------------|---------------------------------|
| `success` | `var(--color-success)`  | `var(--border)`                 |
| `warning` | `var(--color-warning)`  | `var(--border)`                 |
| `error`   | `var(--color-error)`    | `var(--border)`                 |
| `info`    | `var(--color-info)`     | `var(--border)`                 |
| `severe`  | `var(--color-severe)`   | `var(--border)`                 |
| `neutral` | `var(--color-neutral)`  | `var(--border)`                 |

### States
| State   | CSS                     |
|---------|-------------------------|
| Default | As per styling above    |
| Hover   | No hover effect (static indicator) |
| Focus   | Not focusable (not interactive) |

### Responsive
- No breakpoint changes.

## Behavior

### Interactions
- StatusBadge is a static indicator with no built-in interactions.
- If made interactive by consumer, consumer adds click handler and keyboard support.

### Keyboard
- None (not interactive).

### Accessibility
- A static badge has `role="img"`, which takes the `aria-label` below as its
  name without announcing changes. Set `announce` only when the label or status
  changes dynamically; it swaps the role for `role="status"` and adds
  `aria-live="polite"`.
- `aria-label="{label}: {status}"` for screen readers.
- Status dot: `aria-hidden="true"` (decorative).

## Persistence

None.

## Dependencies

- `cn()` utility for className merging.

## Edge Cases

- **Very long label**: Text truncates with `text-overflow: ellipsis`, `white-space: nowrap`, `overflow: hidden`.
- **Unknown status**: Not possible (TypeScript union type enforces valid values).
- **Full width**: Badge stretches to fill parent container.

## Traceability

- Root: `data-component="StatusBadge"`.
- Visible label: `data-status-badge-label`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { StatusBadge } from "@codesweep-ai/ui";
export function Example() { return <StatusBadge label="Critical" status="severe" emphasis="ring" />; }
```
