---
name: SearchInput
status: stable
since: 1.0.0
summary: Integrated search bar with inline search button, clear button, and optional auto-search after a character threshold.
keywords: [search, input, filter, query, search bar, autocomplete, debounce,
           clear, find, lookup, search field, text input]
use_when:
  - Providing a standalone search bar that fires a query callback
  - Auto-searching as the user types past a character threshold
  - Showing an inline no-results message below the input
avoid_when:
  - Search lives inside a Table or container that already has its own empty state → use the container's emptyMessage
related: [Input, FormGroup, Table]
patterns: [Form, FormResults]
---

# SearchInput

> Integrated search bar with inline search button, clear button, and optional auto-search after a character threshold.

## Props

```typescript
interface SearchInputProps {
  /** Current input value */
  value: string;
  /** Called when the input value changes */
  onChange: (value: string) => void;
  /** Called when a search should execute (Enter, click search, auto-search threshold, or clear) */
  onSearch: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Min characters before auto-search fires. 0 = no auto-search (manual only). Default: 0 */
  minChars?: number;
  /** Debounce delay in ms for auto-search. Default: 300 */
  debounceMs?: number;
  /** Additional className */
  className?: string;
  /** Render a "no results" message inline below the input. Default: false. Added v1.2.0. */
  noResults?: boolean;
  /** Message shown when noResults=true. Default: "No results." */
  noResultsMessage?: string;
  /** Result/status content announced below the input. */
  status?: React.ReactNode;
  /** Native input props, including aria-label, are forwarded. */
  [inputProp: string]: unknown;
}
```

`onSearch` is read from a ref by the debounce timer, so replacing an inline callback does not restart an in-flight search delay.

## No-results state (added v1.2.0)

Consumer-driven: pass `noResults={true}` (typically derived from the result of `onSearch`) and an italic muted message renders inline below the input. Only shows when `value.length > 0` (no message before the user has typed anything). Test ID: `searchinput-noresults`.

For "no results" semantics inside a Table or other container, prefer the container's own Empty state (`Table.tsx`'s `emptyMessage`). Use `SearchInput.noResults` only when the search input lives outside a container that already shows the empty UI.

## Visual Spec

### Layout

```
┌──────────────────────────────────┬─────┬─────┐
│ Search for code...               │  ✕  │  🔍 │
└──────────────────────────────────┴─────┴─────┘
 input (flex-1)                    clear  search
```

- Single row container using `inline-flex`.
- Input takes remaining space with `flex: 1` and `min-width: 0`.
- Clear button (X icon) — appears only when value is non-empty.
- Search button (Search icon) — always visible, acts as submit.
- Icons from `lucide-react`: `Search`, `X` at 16px.

### Styling

- **Container**: `border: 1px solid var(--border)`, `border-radius: var(--radius-sm)`, `background: var(--card)`.
- **Input**: transparent background, no border, `padding: var(--space-2) var(--space-3)`, `font-size: var(--font-size-sm)`, `color: var(--fg)`, placeholder `color: var(--muted)`.
- **Buttons**: transparent background, no border, `color: var(--muted)`, `padding: 0 var(--space-2)`.

### States

| State          | CSS                                                              |
|----------------|------------------------------------------------------------------|
| Default        | `border: 1px solid var(--border)`                               |
| Hover          | `border-color: var(--muted)`                                    |
| Focus-within   | `ring: 2px var(--color-accent)`                           |
| Button hover   | `color: var(--fg)`                                              |
| Disabled       | `opacity: 0.5`, `cursor: not-allowed`                          |
| Placeholder    | `color: var(--muted)`                                           |

### Responsive

- No breakpoint changes. Width follows parent container.

## Behavior

### Interactions

- **Manual search**: Click search button or press Enter — fires `onSearch(value)`.
- **Auto-search**: When `minChars > 0` and `value.length >= minChars`, fires `onSearch(value)` after `debounceMs` delay. Deleting a previously eligible query back to empty also fires `onSearch("")` after the delay so consumers clear stale results.
- **Clear**: Click X button — calls `onChange("")` then `onSearch("")`, refocuses input.

### Keyboard

| Key    | Action                               |
|--------|--------------------------------------|
| Enter  | Fire `onSearch(value)`               |
| Escape | Clear input and fire `onSearch("")`  |
| Tab    | Move focus to next element           |

### Accessibility

- Clear button has `aria-label="Clear search"`.
- Search button has `aria-label="Search"`.
- Consumer should provide an associated `<label>` or `aria-label` on a wrapping element.

## Persistence

None.

## Dependencies

- `cn()` utility for className merging.
- `lucide-react` for `Search` and `X` icons.

## Edge Cases

- **Empty value**: Clear button hidden, search button still fires `onSearch("")`.
- **minChars=0**: Auto-search disabled; only manual search via Enter or button click.
- **Rapid typing**: Debounce timer resets on each keystroke; only the final value fires `onSearch`.
- **Enter during debounce**: Cancels pending debounce timer and fires immediately.

## Traceability

- Root: `data-component="SearchInput"`.
- Text input: `data-search-input`. This is the focus, fill, and value-read surface; consumers do not need to descend to a bare `input` selector.
- Submit button: `data-search-submit`.
- Optional status region: `data-search-status` and `role="status"`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { SearchInput } from "@codesweep-ai/ui";
export function Example() { return <SearchInput value="tool" onChange={() => {}} onSearch={() => {}} status="5 matches" />; }
```
