---
name: PulseBadge
status: stable
since: 1.4.0
summary: Small pulsing dot that signals live, in-progress activity.
keywords: [pulse, badge, dot, live, activity, animated, indicator, status dot,
           pulsing, real-time, streaming, agent activity]
use_when:
  - Indicating that an agent or process is running
  - Decorating a label with a live-activity signal, as AgentStatus does
avoid_when:
  - Unread / notification count → StatusBadge
  - Multiple simultaneous live signals in one viewport (one pulse per panel only)
related: [AgentStatus, StreamingText, AgentTrace, StatusBadge]
patterns: [AgentActivity]
---

# PulseBadge

> Small pulsing dot that signals live activity. Used inline next to text labels, most commonly inside [`AgentStatus`](./AgentStatus.md).

Added in `@codesweep-ai/ui@1.4.0`.

## Props

```typescript
interface PulseBadgeProps {
  /** Disable the pulse animation (renders a static dot). Default: false */
  paused?: boolean;
  /** Dot size. Default: "md" */
  size?: "sm" | "md" | "lg";
  /** CSS color. Default: var(--color-accent) */
  color?: string;
  /** Accessible label. Default: "Live activity" */
  "aria-label"?: string;
  /** Additional className. */
  className?: string;
}
```

## Visual Spec

| Size | Diameter |
|------|----------|
| sm   | `var(--pulse-size-sm)` (6px) |
| md   | `var(--pulse-size-md)` (8px) |
| lg   | `var(--pulse-size-lg)` (10px) |

- Background: `var(--color-accent)` by default; overridable via `color` prop.
- Shape: `border-radius: 50%` (perfect circle).
- Animation: `cs-pulse` keyframes — `transform: scale(0.8 → 1.2 → 0.8)`, `opacity: 0.6 → 1 → 0.6`, 1.4s ease-in-out infinite.
- `prefers-reduced-motion: reduce`: animation disabled; dot holds static at opacity 0.85.

## Behavior

`role="status"` with an aria-label so screen readers can announce the activity. Pair with `AgentStatus` (or any specific verb-phrase label) so the actual context is conveyed.

## Anti-patterns

- ❌ Don't use PulseBadge as a notification dot ("unread message"). It's specifically about live, in-progress activity. For unread counts use a static badge variant of `StatusBadge`.
- ❌ Don't render multiple PulseBadges in the same viewport — the animation competes for attention. One pulse per panel.

## Traceability

`data-component="PulseBadge"` on the root span.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { PulseBadge } from "@codesweep-ai/ui";
export function Example() { return <PulseBadge aria-label="Indexing" />; }
```
