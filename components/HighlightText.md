---
name: HighlightText
status: stable
since: 1.0.0
summary: Renders text with matched substrings visually highlighted using semantic mark elements. Used in search results, filtered lists, and autocomplete suggestions.
keywords: [highlight, text highlight, search highlight, mark, match, substring,
           autocomplete, filter, query match, search results, bolden, emphasize, annotate]
use_when:
  - Showing which part of a result matched a user's search query
  - Highlighting matches in a filtered list or autocomplete dropdown
avoid_when:
  - Full rich-text or markdown rendering → MarkdownViewer
related: [SearchInput, Table]
patterns: [DataTable, FormResults]
---

# HighlightText

> Renders text with matched substrings visually highlighted. Used in search results, filtered lists, and autocomplete suggestions.

## Props

```typescript
interface HighlightTextProps {
  /** The full text to display */
  text: string;
  /** The substring to highlight. Empty string or undefined = no highlighting. */
  query?: string;
  /** Case-insensitive matching. Default: true */
  ignoreCase?: boolean;
  /** Additional className applied to the root span */
  className?: string;
  /** Additional className applied to the highlighted mark elements */
  highlightClassName?: string;
}
```

## Visual Spec

### Layout

- Renders an inline `<span>` containing the text split into segments.
- Matched segments are wrapped in `<mark>` elements.
- Non-matched segments are wrapped in plain `<span>` elements.

### Styling

- **Root**: Inherits parent font styles. No added styles.
- **Mark (highlighted)**: `background: var(--color-highlight)`, `color: var(--fg)`, `border-radius: 2px`, `padding: 0 1px`.
- Uses semantic `<mark>` element for accessibility.
- Custom highlight styling can be applied via `highlightClassName`.

### States

| State       | Rendering                            |
|-------------|--------------------------------------|
| No query    | Plain text, no wrapping marks        |
| No matches  | Plain text, no wrapping marks        |
| Matches     | Text split into highlighted/plain segments |

### Responsive

- No breakpoint changes. Inline element that flows with surrounding text.

## Behavior

### Matching

- Splits the text using a regex built from the query string.
- Special regex characters in the query are escaped.
- Case-insensitive by default (`ignoreCase: true`).
- All occurrences are highlighted, not just the first.

### Keyboard

None — purely presentational.

### Accessibility

- Uses `<mark>` element which has implicit ARIA semantics for highlighted text.
- Screen readers announce marked text as "highlight" in supporting browsers.

## Persistence

None.

## Dependencies

- `cn()` utility for className merging.

## Edge Cases

- **Empty query**: Renders plain text with no marks.
- **No matches**: Renders plain text with no marks.
- **Multiple occurrences**: All are highlighted.
- **Adjacent matches**: Each match gets its own `<mark>`.
- **Special characters in query**: Regex characters (`.*+?` etc.) are escaped and matched literally.
- **HTML in text**: Rendered as text content (React escapes it), not parsed as HTML.

## Traceability

- Root span: `data-component="HighlightText"` (all code paths).
- Each rendered match: `data-highlight-match`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { HighlightText } from "@codesweep-ai/ui";
export function Example() { return <HighlightText text="src/components/Button.tsx" query="Button" />; }
```
