---
name: Table
status: stable
since: 1.0.0
summary: Data table with sortable columns, filtering, pagination, and async states.
keywords: [table, grid, data table, tabular, rows, columns, sortable, sort,
           filter, search, paginate, pagination, list view, spreadsheet, dataset]
use_when:
  - Displaying rows of structured data across multiple columns
  - You need sorting, client-side filtering, or pagination
avoid_when:
  - A flat single-column list → SectionedTree
  - Hierarchical / nested data → Tree or SectionedTree
related: [SectionedTree, Tree, SearchInput, Dropdown, StatusBadge, HighlightText]
patterns: [DataTable, Explorer, MasterDetail]
---

# Table

> Data table with sortable columns, hover rows, filtering, pagination, and fixed-layout option.

## Props

```typescript
interface TableProps<T> {
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Row data */
  data: T[];
  /** Key extractor */
  rowKey: (row: T) => string;
  /** Called when a sortable column header is clicked */
  onSort?: (columnId: string, direction: "asc" | "desc") => void;
  /** Current sort state */
  sort?: { columnId: string; direction: "asc" | "desc" };
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Key of the currently selected row (highlights it) */
  selectedKey?: string | null;
  /** Use table-layout: fixed */
  fixed?: boolean;
  /** Additional className */
  className?: string;
  /** Show filter bar above the table. Needs ≥1 column with searchValue. */
  filterable?: boolean;
  /** Placeholder for the filter input. Default: "Filter..." */
  filterPlaceholder?: string;
  /** Controlled filter value and change callback. */
  filter?: string;
  onFilterChange?: (value: string) => void;
  /** Rows per page. Omit = no pagination. */
  pageSize?: number;
  /** Controlled zero-based page and change callback. */
  page?: number;
  onPageChange?: (page: number) => void;
  /** Loading state: render 8 skeleton rows instead of data. */
  loading?: boolean;
  /** Error state: when set (Error or string), render the error block. */
  error?: Error | string | null;
  /** Override the error primary text (default: "Something went wrong"). */
  errorMessage?: string;
  /** Retry handler — when provided, renders a Retry button in the error block. */
  onRetry?: () => void;
  /** Empty state primary text. Default: "No results." */
  emptyMessage?: string;
  /** Empty state secondary text. */
  emptyHint?: string;
  /** Empty state CTA. */
  emptyAction?: { label: string; onClick: () => void };
}

interface TableColumn<T> {
  id: string;
  header: string;
  /** Render function for cell content. Receives filterQuery when filtering is active. */
  cell: (row: T, filterQuery?: string) => React.ReactNode;
  /** Column is sortable */
  sortable?: boolean;
  /** Optional fixed direction used on every activation. */
  sortDirection?: "asc" | "desc";
  /** Align cell content */
  align?: "left" | "right" | "center";
  /** Column width (any CSS value: "30%", "200px", "12rem"). Works best with fixed layout. */
  width?: string;
  /** Returns searchable plain text. If provided, column participates in filtering. */
  searchValue?: (row: T) => string;
  /** Allow text to wrap in this column. Default: false (single-line with ellipsis + tooltip). */
  wrap?: boolean;
}
```

## Visual Spec

### Layout
- Root: wrapper `<div>` with `data-component="Table"`; its descendant `<table>` uses `width: 100%`.
- `border-collapse: collapse`.
- When `fixed`: `table-layout: fixed`. Recommended when using column `width` values — ensures widths are respected exactly and truncation works reliably.

### Styling
- Background: `var(--card)`.
- Font-size: `var(--font-size-sm)`.
- Border-radius: `var(--radius-md)` on wrapper (use overflow hidden).
- Outer border: `1px solid var(--border)`.

### Header Cells
- Padding: `var(--space-2) var(--space-3)`.
- Background: `var(--color-bg-muted)`.
- Border-bottom: `2px solid var(--border)`.
- Font-weight: `var(--font-weight-semibold)`.
- Color: `var(--fg)`.
- Text-align: per column `align` prop (default `left`).

### Body Cells
- Padding: `var(--space-2) var(--space-3)`.
- Border-bottom: `1px solid var(--border)`.
- Color: `var(--fg)`.
- Text-align: per column `align` prop.
- Numeric cells (`align: "right"`): `font-variant-numeric: tabular-nums`.

### Truncation (nowrap default)
- By default (`wrap: false`), cell content is rendered inside a wrapper `<div>` with `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`.
- This produces single-line rows with consistent height across all pages.
- When text is truncated (i.e. `scrollWidth > clientWidth`), a native `title` tooltip shows the full text on hover. The tooltip is set dynamically on `mouseenter` — it only appears when content actually overflows.
- For truncation to take effect, the column must have a constrained width. Use the `width` prop on the column (e.g. `"30%"`, `"200px"`) combined with `fixed` table layout.
- Set `wrap: true` on a column to allow multi-line content (no truncation, no tooltip).
- **Columns containing structured UI elements** (e.g. `StatusBadge`, buttons, icons) should use `wrap: true` — truncating a badge or button produces broken visuals, not a meaningful ellipsis.

### Sort Indicator
- Arrow icon next to sortable header text.
- Ascending: `ChevronUp` (14px).
- Descending: `ChevronDown` (14px).
- Inactive sortable headers: `ArrowUpDown` icon (14px), `color: var(--muted)`.

### Filter Bar
- Rendered above the table header when `filterable` is true and at least one column has `searchValue`.
- Layout: `display: flex`, centered items, `gap` and `padding` from `--space-3`, with a `var(--border)` bottom border.
- Left: `SearchInput` with `minChars={1}`, `debounceMs={200}`, fills available width.
- Right: `Dropdown` with options "All columns" + one entry per column with `searchValue` (using `col.header` as label).
- If only one column has `searchValue`, the Dropdown is hidden.

### Pagination Footer
- Rendered below the table when `pageSize` is set and `filteredData.length > pageSize`.
- Layout: `display: flex`, centered and space-between items, `--space-3` padding, `var(--border)` top border, and `var(--color-bg-muted)` background.
- Left: Prev / Next buttons (`Button` with `variant="ghost"`, `size="sm"`, disabled at bounds).
- Center: `Page {n} of {total}` text.
- Right: Result count — `"{filtered} of {total}"` when filtered, `"{total} rows"` when not.

### States
| State            | CSS                                                |
|------------------|----------------------------------------------------|
| Default          | As per styling above                               |
| Row hover        | `background: var(--color-row-hover)`               |
| Row selected     | `background: var(--color-accent-bg)`         |
| Row clickable    | `cursor: pointer` (when `onRowClick` is provided)  |
| Sortable header hover | `cursor: pointer`, `color: var(--color-accent)` |
| Sort active      | Sort icon colored `var(--color-accent)`      |

### Column Sizing Guide

Use `fixed` layout + percentage `width` values to control the table layout precisely.

- **Percentage widths should sum to ~100%.** Columns without an explicit `width` receive the remainder. If the sum exceeds 100%, the table overflows and scrolls horizontally.
- **Budget width for padding.** Each cell has `var(--space-3)` padding on both sides (~24px total). A column set to `"9%"` on a 1100px table is ~99px, leaving only ~75px for content. Structured elements like `StatusBadge` (~90px) won't fit — size accordingly.
- **One flexible column.** A common pattern is to give fixed-size columns explicit percentages and leave one content-heavy column (e.g. "Description") without a `width` to absorb the remainder.
- **Without `fixed` layout**, the browser auto-sizes columns to fit content. Percentage widths become suggestions, not constraints, and `nowrap` content can push columns wider than intended.

### Responsive
- On narrow viewports: `overflow-x: auto` on wrapper div.
- Table min-width respects column widths.

## Behavior

### Filter Behavior
- When `filterable` is true and at least one column defines `searchValue`, a filter bar appears above the table header.
- Typing in the search input filters rows in real-time (debounced at 200ms, minimum 1 character).
- The column scope dropdown lets users search across all searchable columns or a single column.
- Matching uses case-insensitive substring search on the `searchValue` return value.
- The current `filterQuery` string is passed as the second argument to each column's `cell()` renderer, enabling cell-level highlighting (e.g. via `HighlightText`).
- Changing the filter or column scope resets pagination to page 1.

### Pagination
- When `pageSize` is provided and the (filtered) row count exceeds `pageSize`, a pagination footer appears.
- Prev/Next buttons navigate pages; both are disabled at their respective bounds.
- The footer shows "Page N of M" and the result count.

### Sort Interactions
- **Click sortable header**: Calls `onSort(columnId, newDirection)`.
  - If currently sorted ascending by this column: switch to descending.
  - If currently sorted descending: switch to ascending.
  - If sorted by a different column: sort ascending.
- **Click row** (when `onRowClick` provided): Calls `onRowClick(row)`. Row gets `cursor: pointer`. The selected row (matched by `selectedKey === rowKey(row)`) is highlighted with `var(--color-accent-bg)` and does not show the hover style.

### Data Pipeline
```
data (from parent, already sorted)
  → filteredData: rows where filterQuery matches searchValue on selected column(s)
  → pageData: filteredData.slice(page * pageSize, (page + 1) * pageSize)
  → render pageData, passing filterQuery to cell()
```

### Keyboard
| Key   | Action                              |
|-------|-------------------------------------|
| Tab   | Navigate between sortable headers   |
| Enter | Activate sort on focused header     |
| Space | Activate sort on focused header     |
| ArrowUp / ArrowDown | Move the roving row focus to the previous / next row |
| Home / End | Move the roving row focus to the first / last visible row |

When rows are clickable, exactly one visible row participates in the Tab order. Arrow keys move that roving tab stop without turning every row into a separate Tab stop. Enter or Space activates the focused row.

**Handled keys are consumed** — `preventDefault()` *and* `stopPropagation()`, the same rule
`EventLanes` follows. Without the second, a page-level Home/End/arrow binding runs as well and moves
a *second* selection. Measured in a consumer that binds Home/End at document level: `End` with
focus in a table row moved the roving row and simultaneously jumped that page's separate timeline
selection to its last event. Unhandled keys (Escape, Tab, everything else) still propagate normally, so consumers
can bind them.

### Accessibility
- Sortable headers: `role="columnheader"`, `aria-sort="ascending" | "descending" | "none"`.
- `tabIndex={0}` remains on sortable header cells. Clickable rows use one roving `tabIndex={0}`; all other visible clickable rows use `tabIndex={-1}`.
- The selected clickable row exposes `aria-current="true"`; the native table keeps its implicit table/row semantics.
- Header cells without sort: no extra attributes.
- Table: `role="table"` (implicit from `<table>` element).

## Persistence

Sort state is parent-managed. Filter and pagination can be controlled with `filter` / `onFilterChange` and `page` / `onPageChange`; when omitted, Table manages them internally. Filter or column-scope changes request page 0.

## State coverage (loading / empty / error)

Table supports the three canonical async-data states. Precedence is `loading > error > empty > data` — i.e. `loading={true}` always wins, then `error`, then "no rows to render", then the populated table.

In every state the **outer container chrome** (border, filter bar if `filterable`, table headers) is preserved so the table doesn't visually jump when state changes.

### Loading state

Shown when `loading={true}`. The header row + filter bar (if applicable) render normally; `<tbody>` renders 8 skeleton rows (constant `LOADING_ROW_COUNT`), each with one `<Skeleton variant="text" />` per column. Pagination footer is hidden.

- Data-testid: `table-loading-row` (one per skeleton row).
- Use this state for the initial fetch AND for in-flight refetches when you want the user to know data is being updated.
- During loading, the `data` prop is ignored — passing populated data with `loading={true}` still renders skeletons.

### Error state

Shown when `error` is set (and not loading). Replaces `<tbody>` with a single full-width centered block:

- Icon: lucide `AlertCircle` at `--icon-size-lg`, color `--color-error`.
- Primary text: `errorMessage` prop OR `"Something went wrong"`.
- Secondary text (optional): `error.message` if `error` is an `Error`, the raw string if `error` is a string. Rendered in `--muted`.
- Action button: `Retry` (secondary variant, small) — only when `onRetry` is provided.
- Data-testid: `table-error`.

### Empty state

Shown when `data` is empty AND not loading AND not error. Replaces `<tbody>` with a single centered block:

- Icon: lucide `Inbox` at `--icon-size-lg`, color `--muted`.
- Primary text: `emptyMessage` prop (default `"No results."`).
- Secondary text (optional): `emptyHint` prop.
- Action button (optional): `emptyAction.label` → calls `emptyAction.onClick`. Use for first-run scenarios ("Add the first one").
- Data-testid: `table-empty`.
- An empty state with `filterable` active is rendered the same way — the filter bar stays visible above the empty block, letting the user revise their filter.

## Dependencies

- `lucide-react`: `ChevronUp`, `ChevronDown`, `ArrowUpDown`, `ChevronLeft`, `ChevronRight`, `Inbox` (empty), `AlertCircle` (error).
- `cn()` utility for className merging.
- `SearchInput` component (for filter bar).
- `Dropdown` component (for column scope selector).
- `Button` component (for pagination controls + retry / CTA buttons in state blocks).
- `Skeleton` component (for the loading state).
- `HighlightText` component (recommended for cell renderers with filter highlighting).

## Edge Cases

- **Empty data array**: Renders the Empty state (see above) instead of an empty body. Override the message with `emptyMessage`.
- **Single row**: Renders normally.
- **Very wide table**: Wrapper gets `overflow-x: auto`.
- **Missing cell renderer**: Should not happen (TypeScript enforces `cell` function).
- **No sort prop**: Sort indicators and click handlers are not rendered.
- **filterable with no searchValue columns**: Filter bar is not rendered.
- **pageSize without filterable**: Pagination works on the full dataset.
- **Filter reduces results to fit one page**: Pagination footer hides automatically.
- **Truncation without fixed layout**: If `wrap` is false but no `width` is set and `fixed` is off, columns auto-size to content and truncation will not trigger. This is by design — use `fixed` + `width` for truncation.
- **wrap: true columns**: Content wraps naturally, row height varies. Use sparingly with pagination to avoid layout shifts.

## Traceability

- Wrapper: `data-component="Table"`.
- Every rendered data row: `data-table-row="{rowKey(row)}"`. Select all data rows with `[data-table-row]` or a stable row by its key; loading, error, and empty-state rows do not carry the hook.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { Table, type TableColumn } from "@codesweep-ai/ui";
type Row = { id: string; name: string };
const columns: TableColumn<Row>[] = [{ id: "name", header: "Name", cell: (row) => row.name }];
export function Example() { return <Table columns={columns} data={[{ id: "1", name: "Finding" }]} rowKey={(row) => row.id} />; }
```
