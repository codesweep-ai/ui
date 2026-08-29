---
name: MarkdownViewer
status: stable
since: 1.0.0
summary: Lightweight safe markdown renderer with an opt-in CommonMark/GFM plugin pipeline.
keywords: [markdown, markdown viewer, gfm, github flavored markdown, syntax highlight,
           mermaid, katex, math, outline, minimap, document viewer, rich text, code block, alert]
use_when:
  - Rendering markdown documents with headings, code blocks, or tables
  - A long document needs heading-based navigation (outline) or a scroll minimap
  - Displaying agent-generated or user-authored markdown content
avoid_when:
  - Plain unstyled text display — use a plain element
  - Only syntax highlighting is needed → CodeBlock
related: [MermaidDiagram, MarkdownMinimap, CodeBlock, Skeleton]
patterns: [MarkdownViewer]
note: >
  Requires markdown-content.css imported at the feature level:
  @import "@codesweep-ai/ui/styles/markdown-content.css"
  Without this, headings, tables, code blocks, and alerts render unstyled.
---

# MarkdownViewer

## Overview

Markdown renderer with heading outline navigation and canvas minimap. `@codesweep-ai/ui/markdown` uses the lightweight parser; it covers paragraphs, headings, lists, inline and fenced code, bold text, links, GFM tables, and blockquotes. `@codesweep-ai/ui/markdown/rich` is the build-time opt-in to the full CommonMark + GFM pipeline and its remark/rehype plugin seam. Both entries export `MarkdownViewer` with the same base props and shared safe React renderer; the rich entry adds plugin props. No runtime prop chooses a parser.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `string` | *required* | Raw markdown string to render |
| `outline` | `boolean` | `false` | Show heading outline panel |
| `minimap` | `boolean` | `false` | Show canvas minimap panel |
| `outlineCollapsed` | `boolean` | `false` | Initial collapsed state of outline |
| `minimapCollapsed` | `boolean` | `false` | Initial collapsed state of minimap |
| `onLinkClick` | `(href: string) => void` | — | Handler for internal (non-http, non-anchor) link clicks |
| `codeRenderers` | `Record<string, ComponentType<{ code: string }>>` | — | Custom renderers for specific code block languages |
| `inline` | `boolean` | `false` | Render as an inline embed — no internal scroll, no outline/minimap panels (suppressed even if requested), flows with the parent's natural layout. Use for embedding rendered markdown inside a scrollable page where the outer page is the only scroll surface. |
| `density` | `"default" \| "dense"` | `"default"` | Compact prose and heading scale for narrow detail panes. |
| `className` | `string` | — | Additional CSS class on root element |
| `loading` | `boolean` | — | Loading state: render skeleton lines instead of content (added v1.2.0) |
| `error` | `Error \| string \| null` | — | Error state: render the error block |
| `errorMessage` | `string` | `"Something went wrong"` | Override primary error text |
| `onRetry` | `() => void` | — | Show a Retry button in the error block |
| `emptyMessage` | `string` | `"No content."` | Primary text shown when content is empty/whitespace |
| `emptyHint` | `string` | — | Optional secondary empty-state text |
| `emptyAction` | `{ label: string; onClick: () => void }` | — | Optional CTA in the empty block |

The rich entry additionally accepts `remarkPlugins` and `rehypePlugins`, both `PluggableList`, appended after `remark-gfm` and `rehype-slug` respectively. Those props intentionally do not exist on the lightweight entry: importing the rich entry, rather than setting a runtime prop, is what opts the bundle into the full parser.

## State coverage (loading / empty / error)

Precedence: `loading > error > empty > content`. When `loading={true}`, renders ~10 `Skeleton` lines of varying widths (mimics title + paragraphs + sub-heading + more paragraphs). When `error` is set, centered `AlertCircle` block with optional Retry. When `content` is empty or whitespace-only, centered `Inbox` block with optional hint + CTA.

Test IDs: `markdownviewer-loading`, `markdownviewer-error`, `markdownviewer-empty`.

> **Behavior change in v1.2.0:** previously, empty `content` rendered an empty viewer. Now it renders the Empty state by default. Consumers that want the old behavior can pass a single space (or use the spec'd empty CTA to drive next-step UI).

## Visual Spec

### Inline mode (`inline: true`)

Suppresses the outer full-height flex wrapper, the content area's flex/overflow behavior, and the article's `var(--space-5)` padding. Outline and minimap panels are forced off because they require fixed-height layouts. The component flows as a plain block within its parent's scroll surface.

### Layout (default — 3-column flex)

```
┌──────────────────────────────────────────────────────────────┐
│ data-component="MarkdownViewer"  (flex, h-full)              │
├──────────┬──────────────────────────────────┬────────────────┤
│ Outline  │┃Content                          │ Minimap        │
│ 200px    │┃flex-1, overflow-y-auto          │ ~120px         │
│ resize → │┃                                 │                │
│          │                                  │                │
│ [header] │ <article class="markdown-content"> │ [header]     │
│ h1       │   <selected parser → React />    │ [canvas]       │
│  h2      │ </article>                       │                │
│  h2      │                                  │                │
│ h1       │                                  │                │
│ [toggle] │                                  │ [toggle]       │
└──────────┴──────────────────────────────────┴────────────────┘
```

### Outline Panel
- Header: `ListTree` icon + "Outline" label + `PanelLeftClose` toggle
- Heading items indented by level: `paddingLeft: (level - minLevel) * 12 + 12`px
- Active heading: `background: var(--color-accent-bg-strong)` and `color: var(--fg)`
- **Resizable**: drag the right edge to resize (default 200px, min 120px, max 400px). Uses the same pointer-event drag pattern as `SplitPane` — accent highlight stripe on hover, `col-resize` cursor
- Collapsed: width transitions to 0, small `PanelLeftOpen` button on content edge

### Minimap Panel
- Header: "Minimap" label + `PanelRightClose`/`PanelRightOpen` toggle
- Canvas renders heading blocks (wider, `--muted` color) and content blocks (narrower, `--border` color)
- Viewport indicator: semi-transparent rect with `--color-accent-bg-strong` fill and `--color-link` stroke

### Code Blocks
- Rounded container with header bar (language label + copy button) and code area
- Header: `background: var(--card)` with a bottom border
- Code area: `background: var(--color-bg-subtle)`

### GitHub Alerts
5 variants: note, tip, important, warning, caution — each with left border color, tinted background, icon + title row.

## Behavior

### Scroll Sync
- Outline tracks active heading via debounced (50ms) scroll listener
- Finds last heading with `getBoundingClientRect().top <= containerRect.top + 100`
- **Active outline entry auto-scrolls into view** (added v1.8.0): when the active heading changes, the outline nav adjusts *its own* `scrollTop` so the highlighted entry stays visible — and only when the entry is actually outside the nav's viewport. It never scrolls the page or the content panel. The outline (`[data-heading-id]` buttons) and content are independent scroll regions; this keeps the highlight visible without the reader having to scroll the outline manually on long documents.

### Heading Tracking
- Clicking an outline heading scrolls **the content pane only** (it sets the pane's `scrollTop` so the heading sits at the top); the page and any enclosing scroller never move — the viewer is a single scroll owner
- Active heading ID updates on click and scroll

### Copy Button
- `navigator.clipboard.writeText(text)` on click
- Swaps `Copy` icon to `Check` icon for 2 seconds

### Opt-in rich rendering

The default `./markdown` entry does not import the unified/react-markdown pipeline, Mermaid, KaTeX, or highlight.js. Import `./markdown/rich` to opt into the full CommonMark + GFM parser, then supply plugins and fenced-code renderers through the existing seam:

```tsx
import { MarkdownViewer } from "@codesweep-ai/ui/markdown/rich";
import { MermaidDiagram } from "@codesweep-ai/ui/mermaid";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

const codeRenderers = {
  mermaid: ({ code }: { code: string }) => <MermaidDiagram chart={code} />,
};

export function RichDocument({ content }: { content: string }) {
  return (
    <MarkdownViewer
      content={content}
      codeRenderers={codeRenderers}
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeHighlight, rehypeKatex]}
    />
  );
}
```

Install `mermaid` when opting into `MermaidDiagram`. If its optional peer is unavailable, the component renders an alert with `data-error-kind="missing-dependency"`; it never proceeds through a silent stub.

### Link Handling
- The viewer—not either parser—allows only `https`, `http`, `ircs`, `irc`, `mailto`, `xmpp`, anchors, and scheme-less relative URLs. Every other scheme becomes an empty href.
- External links (`http://`, `https://`): `target="_blank"`, `rel="noopener noreferrer"`
- Anchor links (`#...`): scroll within the content pane only, same rule as the outline
- Internal links: call `onLinkClick(href)` if provided
- Raw HTML is always rendered as escaped text. Markdown output is constructed as React elements; the markdown path never splices source into HTML or uses `dangerouslySetInnerHTML`.

### Alert Detection
- Blockquotes starting with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]` render as styled alerts
- Each type has a specific icon and color scheme

## Required Styles

MarkdownViewer requires `markdown-content.css` for typography styling (headings, lists, tables, code blocks, alerts, and opted-in Mermaid/KaTeX output). Import it in your feature's CSS entry point:

```css
@import "@codesweep-ai/ui/styles/markdown-content.css";
```

Without this import, markdown elements will render unstyled.

## Parser entries and dependencies

- `@codesweep-ai/ui/markdown` — dependency-light parser for the documented default subset, including GFM tables.
- `@codesweep-ai/ui/markdown/rich` — full `react-markdown`, `remark-gfm`, and `rehype-slug` pipeline plus consumer-selected plugins.
- Consumer-selected renderers remain optional for syntax highlighting, diagrams, and math.
- A shared conformance corpus is rendered through both entries and compared structurally. It includes a nested-list continuation at a table-cell boundary, an unclosed fence, and an escaped pipe inside inline code in a table row.

## Edge Cases

- **Empty content**: Renders empty article, outline shows no headings
- **No headings**: Outline panel shows empty nav, still collapsible
- **Unconfigured code-fence language**: Renders as a plain fenced code block
- **Very long documents**: Canvas minimap scales proportionally, viewport indicator shrinks
- **All panels collapsed**: Only content area visible with small toggle buttons on edges

## Traceability

- Root: `data-component="MarkdownViewer"`.
- Rendered prose region: `data-markdown-content`.
- Paragraphs: `data-markdown-paragraph`.
- Ordered and unordered lists: `data-markdown-list="ordered"` and `data-markdown-list="unordered"`.
- Block quotes, including GitHub-style alerts compiled from block quotes: `data-markdown-blockquote`.

Fenced-code renderers are opt-in. `MarkdownViewer` passes the fence text to the
selected compiler; it does not interpret that compiler's output. The packaged
`MermaidDiagram` initializes Mermaid with strict security and disables HTML
labels before mounting Mermaid's compiler output. A consumer enabling any
`codeRenderers` entry owns that renderer's output boundary: audit the renderer
and its dependencies, and include all recursively plugged-in components when
checking for `dangerouslySetInnerHTML` on a markdown path.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { MarkdownViewer } from "@codesweep-ai/ui/markdown";
import { MarkdownViewer as RichMarkdownViewer } from "@codesweep-ai/ui/markdown/rich";
export function Example() {
  return <><MarkdownViewer content={"# Scan result\n\nA paragraph.\n\n- Open\n- Closed\n\n1. First\n2. Second\n\n> Review complete."} /><RichMarkdownViewer content="| Result |\n| --- |\n| Pass |" rehypePlugins={[]} /></>;
}
```
