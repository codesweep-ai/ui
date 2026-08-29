---
name: CardGroup
status: stable
since: 1.0.0
summary: Layout container that manages maximize/minimize state for a group of Cards; supports fill (fixed-viewport) and natural-height stack modes.
keywords: [card group, maximize, minimize, card layout, dashboard layout,
           expand collapse, viewport fill, card container, multi-card, card state,
           controlled layout, card grid, stacked cards, dashboard panel]
use_when:
  - Laying out multiple Cards that should share a fixed viewport height (fill mode)
  - Providing maximize/minimize affordance across sibling Cards
  - Stacking Cards in a scrolling page without nested scrollbars (fill=false)
avoid_when:
  - You only have a single card with no siblings to maximize against → use Card directly
related: [Card]
patterns: [Dashboard]
---

# CardGroup

> Container that manages maximize/minimize state for a group of Cards.

## Props

```typescript
interface CardGroupProps {
  /** Card children */
  children: React.ReactNode;
  /** Controlled: currently maximized card id, or null */
  maximizedId?: string | null;
  /** Controlled: callback when maximized card changes */
  onMaximizedChange?: (id: string | null) => void;
  /**
   * Fill the group's height and distribute it across cards (each card scrolls
   * internally) — the fixed-viewport dashboard layout. Default `true`. Set
   * `false` for a natural-height stack where the page scrolls instead. A
   * maximized card fills the viewport in either mode. Added v1.7.0.
   */
  fill?: boolean;
  /** Additional className */
  className?: string;
}
```

## Visual Spec

### Layout
- Root: `display: flex`, `flex-direction: column`, `gap: var(--space-4)`.
- When **`fill` (default)** — or whenever a card is maximized — the root also gets `height: 100%`, `min-height: 0`, and each child Card flexes (`flex: 1; min-height: 0`) to share that height, scrolling its body internally. This is the fixed-viewport dashboard layout.
- When **`fill={false}`** and nothing is maximized — the root is natural height and each Card sizes to its content; the cards stack and the **page** scrolls instead of each card. Use this when a CardGroup lives inside a scrolling page (e.g. a long stack of cards) to avoid nested scrollbars.
- The CardGroup itself is a transparent layout container — it has no background, border, or shadow.

### States

| State | Behavior |
|-------|----------|
| No card maximized | All child Cards are visible in normal stacked layout |
| One card maximized | Maximized card gets `flex: 1; min-height: 0; display: flex; flex-direction: column`. All sibling Cards are hidden (`display: none`). |

### Responsive
- CardGroup fills its parent height. The parent must provide a bounded height for maximize to work correctly (see Section 7.11 of the design system spec).

## Behavior

### Controlled vs. Uncontrolled

| Mode | Props | State management |
|------|-------|-----------------|
| Uncontrolled (default) | Omit `maximizedId` | Internal `useState` tracks which card is maximized |
| Controlled | Provide `maximizedId` + `onMaximizedChange` | Parent owns the state |

A CardGroup is **controlled** when `maximizedId` is not `undefined` (even if the value is `null`).

### Interactions
- CardGroup itself has no interactive elements. Interaction happens via the maximize/minimize button rendered by child Cards (see Card.md).
- The `toggle(id)` function provided via context either maximizes the card (if not already maximized) or restores all cards (if the same card is toggled again).

### Keyboard
- None on the CardGroup itself. The Card's maximize button is a standard `<button>` and receives focus/activation via Tab + Enter/Space.

### Accessibility
- No special ARIA attributes on the CardGroup container.
- The maximize/minimize interaction is handled by accessible buttons in child Cards.

## Context

CardGroup provides `CardGroupContext` to its descendants:

```typescript
interface CardGroupContextValue {
  maximizedId: string | null;
  toggle: (id: string) => void;
}
```

Cards consume this context via `useCardGroup()`. When outside a CardGroup, the hook returns `null` and Cards behave as normal static containers.

## Persistence

None by default. Consumers can use controlled mode to persist `maximizedId` to URL params or localStorage.

## Dependencies

- `CardGroupContext` (internal context)
- `cn()` utility for className merging

## Edge Cases

- **Card without `id`**: The card cannot be maximized and remains rendered when an identified sibling is maximized.
- **Card without `header`**: The maximize button requires a header to render. Cards without headers inside a CardGroup participate in hide/show but cannot be the maximized card.
- **Card without `maximizable`**: Same as above — participates in hide/show but has no toggle button.
- **Card outside CardGroup**: Behaves identically to the original Card — no context, no button, no maximize behavior.
- **Only one Card**: Maximize still works (the card expands to fill the container), though there are no siblings to hide.
- **Nested CardGroups**: Each CardGroup manages its own context independently. A Card only responds to its nearest CardGroup ancestor.

## Traceability

`data-component="CardGroup"` on the root `<div>`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Card, CardGroup } from "@codesweep-ai/ui";
export function Example() { return <CardGroup><Card>First result</Card><Card>Second result</Card></CardGroup>; }
```
