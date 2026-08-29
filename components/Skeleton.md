---
name: Skeleton
status: stable
since: 1.1.0
summary: Primitive shimmer placeholder for loading states — indicates where content will appear without a generic spinner.
keywords: [skeleton, loading, shimmer, placeholder, spinner alternative, content placeholder,
           loading state, pulse, rect, circle, text placeholder]
use_when:
  - Filling space where async content is loading
  - Building component-level loading states (tables, cards, lists)
  - Inline text placeholders while a value loads
related: [Table, Card, CardGroup]
patterns: [ComponentStates]
---

# Skeleton

> Primitive shimmer placeholder for loading states. Used by component-level loading states (Table, Card, etc.) to indicate where content will appear without showing a generic spinner.

## Props

```typescript
interface SkeletonProps {
  /** Width — number is treated as px, string passed through. Default: "100%". */
  width?: string | number;
  /** Height — number is treated as px. Default: "1em" for text variant, "100%" otherwise. */
  height?: string | number;
  /** Shape variant. Default: "text". */
  variant?: "text" | "rect" | "circle";
  /** Optional className merged onto the root. */
  className?: string;
}
```

## Visual Spec

### Root

`<span>` with class `cs-skeleton` (and `cs-skeleton--circle` for the circle variant). Width / height applied as inline `style`. `border-radius` resolved by variant:

| Variant | border-radius |
|---|---|
| `text` (default) | `2px` |
| `rect` | `var(--radius-sm)` |
| `circle` | `50%` |

### Background + animation

- Background: `var(--color-bg-subtle)` (defined in `tokens.css`).
- Animation: `cs-skeleton-pulse` — `opacity: 0.4 → 0.8 → 0.4` over `1.5s`, `ease-in-out`, infinite.
- Defined in `base.css` (no separate import required if you already import `base.css`).

### Reduced motion

`@media (prefers-reduced-motion: reduce)` — animation is suppressed and opacity is held at `0.6`. Still visually distinguishable as "placeholder" without the pulse.

## Behavior

Purely presentational. No state, no event handlers, no async logic.

## Accessibility

- `role="status"`, `aria-busy="true"`, `aria-label="Loading"`.
- When several skeletons render together (as in a list / table), screen readers may announce each one; that's the intended noise — it tells the user content is loading. Container components that compose many skeletons should typically not add their own `role="status"` to avoid double-announcement.

## Persistence

None.

## Dependencies

- `cn()` utility for className merging.
- CSS class `cs-skeleton` (defined in `src/styles/base.css`).

## Edge Cases

- **Numeric width/height**: converted to `${value}px`. So `<Skeleton width={120} />` produces `width: 120px`.
- **String width/height**: passed through unchanged. So `<Skeleton width="50%" />` produces `width: 50%`.
- **No height + non-text variant**: defaults to `100%`. Caller must size the parent for the skeleton to be visible.
- **Inline use in flow text**: default `1em` height matches surrounding line-height. Use this for inline placeholders like "Hello, <Skeleton width={80} />" while a username loads.

## Traceability

`data-component="Skeleton"` on the root `<span>`.

## Composition example

```tsx
import { Skeleton } from "@codesweep-ai/ui";

// inline text placeholder
<p>Welcome back, <Skeleton width={120} />.</p>

// avatar circle
<Skeleton variant="circle" width={40} height={40} />

// card body
<div style={{ height: 200 }}>
  <Skeleton variant="rect" />
</div>
```

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Skeleton } from "@codesweep-ai/ui";
export function Example() { return <Skeleton width="100%" height="1rem" />; }
```
