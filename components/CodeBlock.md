---
name: CodeBlock
status: stable
since: 1.0.0
summary: Syntax-highlighted code display with line numbers, copy button, line highlights, and query match highlighting; supports all highlight.js languages.
keywords: [code block, syntax highlighting, code display, highlight.js, code viewer,
           copy code, line numbers, code snippet, source code, programming language,
           code diff, search highlight, code highlight, monospace, code panel]
use_when:
  - Displaying source code with syntax highlighting and a copy affordance
  - Showing a code snippet with specific lines highlighted, as search results do
  - Rendering code from a file path with a source subtitle
avoid_when:
  - You need editable code → use a third-party editor (CodeMirror, Monaco)
  - Markdown documents with inline code — MarkdownViewer handles code fences natively
related: [MarkdownViewer, HighlightText]
patterns: [MasterDetail]
---

# CodeBlock

> Syntax-highlighted code display with line numbers and copy button.

## Props

```typescript
interface CodeBlockProps {
  /** Code content */
  code: string;
  /** Language for syntax highlighting (e.g. "typescript", "python", "go") */
  language?: string;
  /** Source file path (displayed as subtitle) */
  source?: string;
  /** Line numbers to highlight */
  highlightedLines?: number[];
  /** Substring to highlight within the code text (for search matches) */
  highlightQuery?: string;
  /** Max height before scrolling. Default: "20rem". Ignored when fillHeight or inline is set. */
  maxHeight?: string;
  /** Expand to fill the parent's height instead of using maxHeight. Mutually exclusive with inline. */
  fillHeight?: boolean;
  /** Render as an inline embed — no max-height, no internal vertical scroll,
   *  flows with the parent's natural layout. Horizontal scroll is still
   *  available for long lines. Use for embedding code inside a scrollable
   *  page where the outer page is the only scroll surface. When both
   *  fillHeight and inline are set, fillHeight wins. */
  inline?: boolean;
  /** Opt-in custom grammars keyed by language. Built-ins load on demand. */
  languages?: Record<string, LanguageFn>;
  /** Additional className */
  className?: string;
}
```

## Visual Spec

### Layout
- Root: `display: flex`, `flex-direction: column`.
- Header bar: always present, contains label (source path or language) on the left and copy button on the right.
- Code area: `display: flex` (line numbers column + code column).

### Container Styling
- Border: `1px solid var(--border)`.
- Border-radius: `var(--radius-sm)`.
- Background: `var(--bg)`.
- Overflow + height by mode:
  - **default**: inner content area `overflow: auto`, `max-height: var(maxHeight, 20rem)`.
  - **`fillHeight`**: inner content area uses `overflow: auto`, `flex: 1`, and `min-height: 0`; `maxHeight` is ignored.
  - **`inline`**: inner content area uses horizontal overflow only; no max-height or internal vertical scroll. `maxHeight` is ignored.
- `fillHeight` and `inline` are mutually exclusive; if both set, `fillHeight` wins.

### Header Bar
- `display: flex`, `align-items: center`, `justify-content: space-between`.
- Padding: `var(--space-2) var(--space-3)`.
- Background: `var(--card)`.
- Border-bottom: `1px solid var(--border)`.
- **Label** (left): displays `source` (mono font) if provided, else `language`, else empty.
  - Font-size: `var(--font-size-xs)`.
  - Color: `var(--muted)`.
  - `text-overflow: ellipsis` (truncated).
- **Copy button** (right): see Copy Button section below.
- Matches the `MarkdownViewer` code block header pattern (`md-code-block__header`).

### Line Numbers
- `text-align: right`.
- Color: `var(--muted)`.
- `user-select: none`.
- Padding: `0 var(--space-2) 0 var(--space-4)`.
- `min-width: 3ch`.
- Border-right: `1px solid var(--border)`.
- `flex-shrink: 0`.

### Code Content
- Font-family: `var(--font-family-mono)`.
- Font-size: `13px`.
- Line-height: `1.6`.
- Padding: `var(--space-3)`.
- `white-space: pre`.
- `overflow-x: auto`.
- `flex: 1`, `min-width: 0`.
- `tab-size: 2`.

### Syntax Highlighting
- Powered by `highlight.js` via `hljs.highlight(code, { language })`.
- Grammars are opt-in. Pass the active grammar through `languages` or call `registerCodeLanguage()`; `language` still labels unregistered plaintext without growing the bundle.

```tsx
import json from "highlight.js/lib/languages/json";

<CodeBlock code={payload} language="json" languages={{ json }} />
```
- Highlighted HTML is split per-line with balanced `<span>` tags for line-level rendering.
- Token colors use CSS custom properties for theming:

| Token class                          | CSS variable         | Dark          | Light         |
|--------------------------------------|----------------------|---------------|---------------|
| `.hljs-keyword`, `.hljs-selector-tag`| `--syntax-keyword`   | `#f97583`     | `#d73a49`     |
| `.hljs-string`, `.hljs-doctag`       | `--syntax-string`    | `#85e89d`     | `#22863a`     |
| `.hljs-number`, `.hljs-literal`      | `--syntax-number`    | `#79b8ff`     | `#005cc5`     |
| `.hljs-title`, `.hljs-section`       | `--syntax-title`     | `#b392f0`     | `#6f42c1`     |
| `.hljs-attribute`, `.hljs-attr`      | `--syntax-attr`      | `#79b8ff`     | `#005cc5`     |
| `.hljs-variable`, `.hljs-built_in`   | `--syntax-builtin`   | `#ffab70`     | `#e36209`     |
| `.hljs-comment`, `.hljs-quote`       | `--syntax-comment`   | `#6a737d`     | `#6a737d`     |

### Highlighted Lines
- Background: `var(--color-success-bg)`.
- Font-weight: `var(--font-weight-semibold)`.
- Full-width highlight (extends across the code area).

### Query Highlight
- When `highlightQuery` is set, matched substrings within code text are wrapped in `<mark class="code-query-match">`.
- Background: `var(--color-highlight)`.
- Matches are injected only in text nodes, not inside HTML tags (safe with syntax highlighting).
- Works in combination with syntax highlighting — both apply simultaneously.

### Copy Button
- Lives in the header bar (right side), always visible.
- Inline text-style button: transparent background, no border, and zero padding.
- Icon: `Copy` (16px) from lucide-react.
- Color: `var(--muted)`, hover: `var(--fg)`.
- After copy: icon changes to `Check`, color `var(--color-success)` for 2 seconds.
- Matches the `MarkdownViewer` copy button style.

### States
| State             | CSS                                                     |
|-------------------|---------------------------------------------------------|
| Default           | Copy button visible in header bar                       |
| Copy btn hover    | `color: var(--fg)`                                      |
| Copy success      | Icon changes to `Check`, `color: var(--color-success)`  |
| Highlighted line  | `background: var(--color-success-bg)`                   |

### Responsive
- No breakpoint changes. Code scrolls horizontally when wider than container.

## Behavior

### Interactions
- **Copy button click**: Copies `code` to clipboard via `navigator.clipboard.writeText()`.
- **Scroll**: Horizontal and vertical scrolling when content exceeds container.

### Keyboard
| Key   | Action                         |
|-------|--------------------------------|
| Tab   | Focus copy button              |
| Enter | Activate copy button (when focused) |
| Space | Activate copy button (when focused) |

### Accessibility
- The root does not create a region landmark per instance.
- The scroll area has `role="group"`, `tabIndex=0` and `aria-label="Scrollable code"`.
  The role is what lets the label name it.
- Code: rendered inside `<pre><code>` for screen readers.
- Copy button: `aria-label="Copy code to clipboard"`.
- After copy: `aria-label="Copied!"`.
- Line numbers: `aria-hidden="true"`.
- Language: applied as `data-language={language}` on the `<code>` element.

## Persistence

None.

## Dependencies

- `lucide-react`: `Copy`, `Check` icons.
- `cn()` utility for className merging.
- `highlight.js` (core + per-language grammars) for syntax highlighting.

## Edge Cases

- **No code**: Renders empty container.
- **No language**: Renders as plain text (HTML-escaped, no syntax spans).
- **Unregistered language**: Falls back to plain text.
- **Very long lines**: Horizontal scroll enabled (all modes).
- **Very many lines**: Vertical scroll enabled in default + `fillHeight` modes (respects `maxHeight` / parent height). In `inline` mode no internal vertical scroll; outer page handles it.
- **Inline embed in a scrolling page**: Use `inline` so the code flows with the page instead of creating a nested scrollbox.
- **No clipboard API**: Copy button fails silently or shows error.
- **No highlighted lines**: No lines get highlight background.
- **Source path but no code**: Subtitle renders, code area empty.

## Traceability

`data-component="CodeBlock"` on the root `<div>`.


`class="language-{language}"` on the same `<code>`, when `language` is set — the convention markdown toolchains read, so a fence rendered by this component looks the same to tooling as one produced by a highlighter plugin.
## Compiling usage example

<!-- docs-compile -->
```tsx
import { CodeBlock } from "@codesweep-ai/ui/code";
export function Example() { return <CodeBlock code="const ready = true;" language="typescript" />; }
```
