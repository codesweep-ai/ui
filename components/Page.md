---
name: Page
status: experimental
since: 0.3.0
summary: Page-level content container that owns the inset from the window edge, the content width and the vertical scroll.
keywords: [page, page layout, content area, main, layout container, page padding,
           page inset, max width, readable width, centered content, content width,
           page scroll, single scrollbar, scrollbar gutter, layout mode, main landmark]
use_when:
  - Wrapping the content of a page, inside AppShell or on its own
  - A page should scroll once, rather than each box inside it scrolling separately
  - Long-form content that should stop widening on a large monitor
avoid_when:
  - Grouping cards that share a viewport height → CardGroup
  - A bordered surface around one piece of content → Card or Panel
  - Two or three resizable regions side by side → SplitPane
related: [AppShell, Card, CardGroup, Panel, SplitPane]
---

# Page

> The container a page's content sits in, which owns the inset, the width and the scroll.

Section 2 of [DESIGN_SYSTEM_SPEC.md](../DESIGN_SYSTEM_SPEC.md) names three layout
modes. `Page` is the `page` and `full` modes; `split` is [SplitPane](SplitPane.md).

Three properties decide whether a composition reads as a page, and none of them
belongs to the components inside it. How far the content sits from the window
edge, how wide it is allowed to grow, and which element scrolls. A page that
assigns none of them bleeds to the window edge, and its content can be clipped
by an ancestor with no scrollbar to reach it.

## Props

```typescript
interface PageProps extends React.HTMLAttributes<HTMLElement> {
  /** Page content */
  children: React.ReactNode;
  /**
   * Cap the content width and centre it. Default `"full"`, which runs edge to
   * edge for a dashboard or a wide table. `"readable"` caps it at
   * `--page-max-width`, so a line of text does not run the width of a large
   * monitor. Added v0.3.0.
   */
  width?: "full" | "readable";
  /** Inset the content from the window edge. Default `true`. Added v0.3.0. */
  padded?: boolean;
  /**
   * Own the vertical scroll, so the page scrolls once and no descendant clips
   * content a pointer cannot reach. Default `true`. Set `false` when this sits
   * inside a scroller that already owns it. Added v0.3.0.
   */
  scroll?: boolean;
  /** Root element. Default `"main"`. */
  as?: React.ElementType;
  /** Additional className */
  className?: string;
}
```

## Visual Spec

### Layout
- Root: `display: flex`, `flex-direction: column`, `min-height: 0`, `width: 100%`.
- **`padded` (default)** adds `padding: var(--space-4)`, which is the inset that makes a page read as content rather than as a window fill.
- **`scroll` (default)** adds `flex: 1 1 0%`, `overflow-y: auto` and `scrollbar-gutter: stable`. The root scrolls, so the scrollbar sits at the window edge rather than at the edge of a centred column.
- The content element is always present and carries `display: flex`, `flex-direction: column`, `flex: 1 0 auto` and `width: 100%`. It grows to fill a short page, and past the root on a long one, so the root is what scrolls.
- **`width="readable"`** adds `max-width: var(--page-max-width)` and automatic left and right margins to the content element, which centres it. It also widens the scrollbar reservation to both edges when the page scrolls.

### Scrollbar reservation

`scrollbar-gutter: stable` reserves the scrollbar's width whether or not one is
showing. Without it, a page that grows past one screen gains a scrollbar and
every element shifts by its width. The shift only happens where scrollbars take
layout space, so a developer on a platform with overlay scrollbars never sees
it and a user on Windows meets it constantly.

Which edges are reserved follows `width`. A centred column reserved on the
scrolling edge alone sits half a scrollbar off centre, measured at 8px in an
800px page, so `width="readable"` reserves both edges. A full-width page has
nothing to centre, so it keeps the narrower reservation and the width that
comes with it.

### Responsive
- `Page` takes its bounds from its parent. Inside [AppShell](AppShell.md) the shell already styles its direct `<main>` child as the single scroller, and `Page` sets the same three properties on that element, so the two agree rather than nesting.

## Behavior

### Composing it

`AppShell` does not create the `<main>` landmark, and `Page` defaults to one, so
the two compose without either owning both halves. A page that is not the
landmark passes `as`.

### Nesting

A `Page` inside another scroller produces a scrollbar inside a scrollbar. Pass
`scroll={false}` to the inner one, so the outer element stays the only scroller.

### Keyboard
- A scroll container holding no focusable element cannot be reached by keyboard. `Page` sets `tabIndex={0}` when it owns the scroll, which is the fix axe's `scrollable-region-focusable` rule asks for. A `tabIndex` from the consumer wins.

### Accessibility
- The default root is `<main>`, which is the document's main landmark. A page renders one, so a second `Page` on the same view passes `as`.
- No other ARIA attributes. `Page` is layout.

## Edge Cases

- **Two `Page` elements on one view**: both render `<main>` unless one passes `as`, which gives the document two main landmarks.
- **`scroll={false}` with content taller than the parent**: nothing scrolls, and a bounded ancestor clips the overflow. That is the failure this component exists to prevent, so leave `scroll` on unless another element owns it.
- **`width="readable"` with `padded={false}`**: the content is still centred, and touches the window edge only on a viewport narrower than the cap.

## Traceability

`data-component="Page"` on the root element, and `data-part="content"` on the
element that holds the children.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { AppShell, Card, Page } from "@codesweep-ai/ui";

export function Example() {
  return (
    <AppShell>
      <Page width="readable">
        <Card>The page scrolls once, and its content stops widening.</Card>
      </Page>
    </AppShell>
  );
}
```
