---
name: MermaidDiagram
status: stable
since: 1.0.0
summary: Renders a Mermaid diagram from a source string. Theme-aware (re-renders on data-theme change) and shows a friendly error block with raw source if the diagram fails to parse.
keywords: [mermaid, diagram, flowchart, sequence diagram, gantt, graph, chart,
           uml, visualization, dsl, svg diagram, architecture diagram, flow diagram,
           sketch, hand-drawn, roughjs-style]
use_when:
  - Rendering a Mermaid DSL string as an SVG diagram
  - Embedding diagrams inside a MarkdownViewer via a fenced code block
  - Showing an agent-architecture diagram in the hand-drawn motif (sketch={true})
avoid_when:
  - General chart/data visualization → ChartFrame
  - Static SVG or image → use an img/svg element directly
related: [MarkdownViewer, ChartFrame]
patterns: [MarkdownViewer]
note: >
  Mermaid's securityLevel is "loose" — treat the chart prop as trusted input
  and sanitize before passing user-submitted Mermaid source.
---

# MermaidDiagram

> Renders a [Mermaid](https://mermaid.js.org/) diagram from a string of Mermaid source. Theme-aware (re-renders on `data-theme` change). Shows a friendly error block if the diagram fails to parse.

## Props

```typescript
interface MermaidDiagramProps {
  /** Mermaid source (e.g. "flowchart TD\n  A --> B"). */
  chart: string;
  /** Apply the CodeSweep hand-drawn "sketch" styling to the rendered diagram. */
  sketch?: boolean;
  /** With `sketch`, use the handwriting font (Caveat) for node labels. */
  sketchHandwriting?: boolean;
  /** Optional className merged onto the root container. */
  className?: string;
}
```

The component is wrapped in `React.memo`, so re-renders only happen when the props actually change.

## Sketch styling (`sketch`)

`sketch={true}` post-processes the SVG Mermaid produces into a hand-drawn motif: a subtle `feTurbulence` + `feDisplacementMap` jitter on the strokes, plus an accent recolor (`--color-accent` strokes and a faint `--color-accent-bg` fill). `sketchHandwriting={true}` uses the browser's generic cursive family; otherwise labels use the mono font.

**When to use it:** the agent-architecture / "how CodeSweep reasons" diagrams — the one place the marketing sketch aesthetic is earned inside the product. **When NOT to:** any ordinary diagram (sequence, gantt, plain flowchart) — leave `sketch` off so it renders in the standard Mermaid theme.

## Visual Spec

### Container

- Root `<div>` with class `md-mermaid` (styling lives in `markdown-content.css`).
- Optional consumer `className` appended.
- Contains the rendered SVG injected via `dangerouslySetInnerHTML`.

### Error state

- Root `<div>` with class `md-mermaid-error` (styling in `markdown-content.css`).
- Header row: lucide `AlertTriangle` icon (`--icon-size-md`) + the text "Diagram Error".
- Body: `<pre>` block (`md-mermaid-error__code`) showing the original diagram source for debugging.

### Theming

- On mount, reads `document.documentElement[data-theme]` and initializes Mermaid with `theme: "dark"` or `theme: "default"` accordingly.
- A `MutationObserver` watches `<html>` for `data-theme` attribute changes; the diagram re-renders when the theme flips.

## Behavior

### Lifecycle

1. On mount (and whenever `chart` changes):
   1. If `chart` is empty/whitespace → set error to "Empty diagram".
   2. Otherwise call `mermaid.render(uniqueId, chart)` and stash the resulting SVG in state.
2. On `data-theme` mutation → re-render.
3. On unmount → cancel any in-flight render via a `cancelled` flag; disconnect the MutationObserver.

### Render ID

Uses React's `useId()` (with colons stripped) to produce a stable, unique render ID per component instance. Required because Mermaid's `render()` uses the ID for internal DOM bookkeeping.

### Security

`mermaid.initialize({ securityLevel: "loose" })` — allows HTML and click handlers in node labels. Consumers MUST treat the `chart` prop as trusted source (don't pass user-submitted Markdown directly without sanitizing the Mermaid blocks).

### Interaction (click handlers)

The component applies the `bindFunctions` returned by `mermaid.render()` to the mounted SVG after each render (and after sketch styling). Mermaid only *returns* these handlers — they must be bound to the live DOM or `click` directives no-op. So a `click <nodeId> <callbackName>` directive in the chart fires `window.<callbackName>(<nodeId>)` on click (the node id is mermaid's internal id). Register the callback on `window` before/while the diagram is mounted.

## Persistence

None.

## Dependencies

- `mermaid` (v11+) — the rendering engine
- `lucide-react` `AlertTriangle` for the error icon
- CSS classes `md-mermaid`, `md-mermaid-error`, `md-mermaid-error__header`, `md-mermaid-error__code` — defined in `src/styles/markdown-content.css`

Consumers using `MermaidDiagram` must import the markdown CSS:

```css
@import "@codesweep-ai/ui/styles/markdown-content.css";
```

## Edge Cases

- **Empty / whitespace chart**: shows the "Empty diagram" error block (not a blank render).
- **Invalid Mermaid syntax**: Mermaid throws → component shows the error block with the source pre-rendered for debugging.
- **Missing optional peer**: A missing/stubbed `mermaid` module renders a `role="alert"` error with `data-error-kind="missing-dependency"`; it does not fail later with a `TypeError`.
- **Same chart re-rendered after theme change**: re-runs `mermaid.render()` with the new theme — no caching.
- **chart prop changes rapidly**: the `cancelled` flag prevents stale SVG from a slower render from clobbering a faster one.
- **No `<html data-theme>`**: defaults to `"default"` (light theme).

## Traceability

`data-component="MermaidDiagram"` on the root `<div>` — on both the rendered-diagram branch (also carries the `md-mermaid` class) and the parse-error branch (`md-mermaid-error`).

`data-mermaid-rendered` on the root of both branches, always present. Its value is `true` once Mermaid has returned SVG, and `false` while rendering and on the parse-error branch.

Assert on the value, not on presence: a check written against bare presence keeps passing the day the attribute stops being emitted. The attribute is present on both branches so that this contract stays verifiable where the optional `mermaid` peer is absent and the component renders its error branch — which is also why the value, rather than the attribute, carries the meaning.


## Compiling usage example

<!-- docs-compile -->
```tsx
import { MermaidDiagram } from "@codesweep-ai/ui/mermaid";
export function Example() { return <MermaidDiagram chart="graph TD; A-->B" />; }
```
