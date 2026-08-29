---
name: Card
status: stable
since: 1.0.0
summary: Content container with background, border, optional header, and loading/error/empty state support; the primary surface for grouping related content.
keywords: [card, panel, container, content surface, tile, widget, dashboard tile,
           loading skeleton, bordered container, card header, maximize, minimize,
           card group, content card, info card]
use_when:
  - Grouping related content with a consistent bordered surface
  - Dashboard tiles or stats cards that may have a loading state
  - Any surface that needs a header row + scrollable body (inside a CardGroup)
avoid_when:
  - You need a full sidebar/content split → SplitPane or Panel
  - You need to manage maximize/minimize across multiple cards → wrap in CardGroup
related: [CardGroup, Panel, Skeleton]
patterns: [Dashboard]
---

# Card

> Content container with background, border, optional header, and multiple variants.

## Props

```typescript
interface CardProps {
  /** Optional header content */
  header?: React.ReactNode;
  /** Card body content */
  children: React.ReactNode;
  /** Visual variant */
  variant?: "default" | "muted" | "success" | "warning" | "danger" | "tight";
  /** Additional className */
  className?: string;
  /** DOM id and maximize key inside a CardGroup */
  id?: string;
  as?: React.ElementType;
  interactive?: boolean;
  onActivate?: () => void;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  /** When true (and inside a CardGroup with an `id`), renders a maximize/minimize toggle button in the header */
  maximizable?: boolean;
  /** Loading state: replace body with 3 skeleton lines, header preserved. Added v1.2.0. */
  loading?: boolean;
}
```

## Loading state (added v1.2.0)

`loading={true}` replaces the card body with 3 skeleton text lines of varying widths (80% / 65% / 75%). The header (if any) is preserved so the layout doesn't shift. Test ID for the skeleton block: `card-loading`.

For cards that compose async-data components (Table, Tree, MarkdownViewer), prefer the inner component's own loading state — that gives finer-grained skeletons matched to the content shape. Use `Card.loading` when the whole card body is loading as one unit (e.g. a stats card waiting for a fetch).

## Visual Spec

### Layout
- Root: `display: block`, `position: relative`.
- Border-radius: `var(--radius-md)`.
- Border: `1px solid var(--border)`.
- Shadow: `var(--shadow-sm)`.
- Overflow: `hidden` (so child content respects border-radius).

### Styling

| Variant   | Background                  | Border                            | Padding                  |
|-----------|-----------------------------|-----------------------------------|--------------------------|
| `default` | `var(--card)`               | `1px solid var(--border)`         | `var(--space-4)`         |
| `muted`   | `var(--color-bg-muted)`     | `1px solid var(--border)`         | `var(--space-4)`         |
| `success` | `var(--color-success-bg)`   | `1px solid var(--color-success)`  | `var(--space-4)`         |
| `warning` | `var(--color-warning-bg)`   | `1px solid var(--color-warning)`  | `var(--space-4)`         |
| `danger`  | `var(--color-error-bg)`     | `1px solid var(--color-error)`    | `var(--space-4)`         |
| `tight`   | `var(--card)`               | `1px solid var(--border)`         | `var(--space-3)`         |

### Header
- When `header` is present: rendered as a separate top section.
- Padding: `var(--space-3) var(--space-4)`.
- Border-bottom: `1px solid var(--border)`.
- Background: `var(--bg)`.
- Font-weight: `var(--font-weight-semibold)`.

### States
| State  | CSS                                       |
|--------|-------------------------------------------|
| Default| As per variant styling above              |
| Hover  | No default hover state (Cards are static containers) |
| Focus  | No focus state (not interactive by default) |

### Responsive
- Card is a block-level element that takes the width of its parent.
- No breakpoint-specific changes.

## Behavior

### Interactions
- Cards are static containers with no built-in interactions by default.
- Click handling should be added by the consumer if needed (wrap in a button or add `onClick`).

### Maximize Behavior

When a Card has `id`, `maximizable`, and is inside a `CardGroup`:

| Condition | Behavior |
|-----------|----------|
| `isMaximizable` | `true` when inside a CardGroup with both `id` and `maximizable` set |
| `isMaximized` | This card's `id` matches the group's `maximizedId` |
| `isHidden` | The card has an `id`, the group has a maximized card, and it is not this one. Cards without an `id` are never hidden. |

**Toggle button:**
- Rendered inside the header row, right-aligned.
- Icon: `Maximize2` (from lucide-react) when not maximized, `Minimize2` when maximized.
- Icon size: `var(--icon-size-sm)` (14px).
- Button style: `padding: var(--space-1)`, `color: var(--muted)`; hover uses `var(--fg)` on `var(--color-bg-muted-hover)` — matching Panel's collapse button.
- `aria-label`: `"Show only this card"` / `"Show all cards"`, with the same text
  as a `title`, extended on the un-maximized state to `"Show only this card — its
  siblings are hidden"`. The label names the *behaviour*, not the icon: this
  control solos the card and hides its siblings, which is not what "Maximize"
  leads a reader to expect. Collapsing a card in place is a different control —
  see `collapsible` — and the two can appear together.

**Layout changes inside a CardGroup** (only when the group is *filling* — i.e. `CardGroup fill` (default) — or when this card is maximized; see [CardGroup.md](./CardGroup.md)):
- Root div adds `flex: 1`, `min-height: 0`, `display: flex`, `flex-direction: column` — cards share the CardGroup's height equally and use flex column layout internally.
- Body div adds `flex: 1`, `min-height: 0`, `overflow-y: auto` — the content area fills remaining space and scrolls when children with a fixed CSS height exceed it.
- **When maximized** the body div additionally gets `display: flex`, `flex-direction: column` so children with `flex: 1; min-height: 0` can grow to fill the maximized card.
- In a **non-filling** group (`CardGroup fill={false}`) and not maximized, the card takes its **natural height** (no `flex`/`overflow` on root or body) so the page scrolls instead of the card body. Added v1.7.0.

**When hidden:** Renders an empty element with the component's `display: none` class to preserve React tree stability.

**Standalone Cards** (outside a CardGroup): All new props are optional and the context returns `null`, so there are no layout changes, no button, and no behavioral differences.

### Keyboard
- None by default. When maximizable, the toggle button is a standard `<button>` reachable via Tab and activated with Enter/Space.

### Accessibility
- No special ARIA attributes needed for static cards.
- The maximize button includes `aria-label` describing the action.
- If made clickable by consumer, consumer should add `role="button"`, `tabIndex={0}`, and keyboard handlers.

## Persistence

None.

## Dependencies

- `cn()` utility for className merging.
- `CardGroupContext` / `useCardGroup` hook (for maximize behavior).
- `Maximize2`, `Minimize2` from `lucide-react`.

## Edge Cases

- **No header**: Header section is not rendered.
- **Empty children**: Card renders with padding but no content.
- **Nested cards**: Works fine; inner card has its own border and shadow. A Card without an `id` nested inside a CardGroup (e.g. as a child of another Card's content) is exempt from the group's maximize/hide logic — it will never be hidden when a sibling is maximized.
- **Very long content**: Content overflows naturally (no max-height by default). Inside a CardGroup, content scrolls within the card's body wrapper.

## Traceability

- Root: `data-component="Card"`.
- Header wrapper, when `header` is supplied: `data-card-header`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Card } from "@codesweep-ai/ui";
export function Example() { return <Card header="Summary" variant="warning">Review required</Card>; }
```
