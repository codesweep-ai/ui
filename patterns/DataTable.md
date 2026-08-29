---
name: DataTable
status: stable
since: 1.0.0
summary: Full-featured table with filtering, sorting, pagination, and search highlighting for large flat datasets.
keywords: [data table, table, sortable table, paginated table, search table, filter table, list view, registry, audit log, inventory, tabular data]
use_when:
  - Displaying a large flat dataset (10+ rows) with search and pagination
  - Package registries, user lists, audit logs, or inventory pages
  - Columns contain mixed content (text, badges, numbers) that needs per-column search
avoid_when:
  - Hierarchical or nested data → Explorer
  - Each row needs rich detail on click → MasterDetail
  - Small datasets under 10 rows → plain Table without filter/pagination
related: [Table, HighlightText, StatusBadge, SearchInput, Dropdown]
---

# Data Table Pattern

> Full-featured table with filtering, sorting, pagination, and search highlighting for large datasets.

## When to Use

- Package registries, user lists, audit logs, inventory management
- Any tabular dataset larger than ~10 rows that benefits from search and pagination
- When columns contain mixed content (text, badges, numbers) that needs per-column search

## When NOT to Use

- Small datasets (under 10 rows) — a plain Table without filter/pagination is simpler
- Hierarchical data — use Explorer pattern instead
- When each row needs rich detail — use Master-Detail pattern

## Composition

```
Section heading + description
Table
  ├── Filter bar (SearchInput + column Dropdown)
  ├── Sortable column headers
  ├── Row cells with HighlightText / StatusBadge
  └── Pagination footer (Prev / Page N of M / Next / count)
```

```
┌──────────────────────────────────────────────────┐
│  h2: "Package Registry"                          │
│  p: "Filterable, sortable, paginated table..."   │
├──────────────────────────────────────────────────┤
│  ┌─────────────────────────┬──────────────────┐  │
│  │ 🔍 Search packages...   │ All columns    ▾ │  │
│  └─────────────────────────┴──────────────────┘  │
│ ┌──────┬────┬───┬────┬──────┬──────┬──────┬────┐ │
│ │Pkg   │Ver │Lic│Size│Downld│Descr │Author│ Sts│ │
│ ├──────┼────┼───┼────┼──────┼──────┼──────┼────┤ │
│ │react │18.2│MIT│ 42K│ 2.1M │UI li…│Meta  │ ●  │ │
│ │vue   │3.4 │MIT│ 38K│ 1.8M │Progr…│Evan  │ ●  │ │
│ │...   │... │...│ ...│  ... │...   │...   │... │ │
│ ├──────┴────┴───┴────┴──────┴──────┴──────┴────┤ │
│ │ ◀ Prev │ Page 1 of 5 │ Next ▶ │   50 rows   │ │
│ └──────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

## Required Components

| Component     | Role                                        | Required? |
|---------------|---------------------------------------------|-----------|
| Table         | Core table with filter bar and pagination   | Yes       |
| HighlightText | Highlights filter query in cell text        | No        |
| StatusBadge   | Status indicator column                     | No        |

## Tokens

| Token                        | Usage                            |
|------------------------------|----------------------------------|
| `--font-size-section-title`  | Page/section heading             |
| `--font-size-body`           | Description text                 |
| `--space-3`, `--space-4`     | Cell padding, filter bar spacing |
| `--radius-md`                | Table border radius              |
| `--color-bg-muted`           | Table header, pagination footer  |
| `--color-row-hover`          | Row hover background             |
| `--border`                   | Table borders, filter bar border |

## State

```typescript
// Sort state — managed by parent, passed to Table
const [sort, setSort] = useState<{
  columnId: string;
  direction: "asc" | "desc";
}>({ columnId: "name", direction: "asc" });

// Sorted data — parent sorts, Table handles filtering and pagination internally
const sorted = useMemo(() => {
  const copy = [...records];
  copy.sort((a, b) => {
    const key = sort.columnId as keyof Record;
    const av = a[key], bv = b[key];
    if (typeof av === "string" && typeof bv === "string")
      return sort.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    if (typeof av === "number" && typeof bv === "number")
      return sort.direction === "asc" ? av - bv : bv - av;
    return 0;
  });
  return copy;
}, [sort]);
```

Table manages filter query, filter column scope, and current page internally. The parent only needs to handle sorting.

## Column Definition

```typescript
interface TableColumn<T> {
  id: string;
  header: string;
  cell: (row: T, filterQuery?: string) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string;            // percentage or fixed (e.g., "13%", "100px")
  wrap?: boolean;            // default false — nowrap with truncation tooltip
  searchValue?: (row: T) => string;  // enables filtering on this column
}
```

Key points:
- `searchValue` — returns plain text for filtering. Only columns with this function participate in search.
- `cell` receives `filterQuery` as second argument — pass it to `HighlightText` for highlighting.
- `wrap: true` — use for columns containing UI elements (StatusBadge, buttons) that shouldn't be truncated.
- `width` — when using `fixed` layout, percentages should sum to ~100%. Leave one column without width to absorb remaining space.

## Example

```tsx
import { Table, type TableColumn } from "@codesweep-ai/ui";
import { StatusBadge } from "@codesweep-ai/ui";
import { HighlightText } from "@codesweep-ai/ui";

interface Package {
  name: string;
  version: string;
  license: string;
  sizeKb: number;
  downloads: number;
  description: string;
  author: string;
  status: string;
}

function PackageRegistry({ packages }: { packages: Package[] }) {
  const [sort, setSort] = useState({ columnId: "name", direction: "asc" as const });

  const sorted = useMemo(() => {
    const copy = [...packages];
    copy.sort((a, b) => {
      const key = sort.columnId as keyof Package;
      const av = a[key], bv = b[key];
      if (typeof av === "string" && typeof bv === "string")
        return sort.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      if (typeof av === "number" && typeof bv === "number")
        return sort.direction === "asc" ? av - bv : bv - av;
      return 0;
    });
    return copy;
  }, [packages, sort]);

  const columns: TableColumn<Package>[] = [
    {
      id: "name",
      header: "Package",
      sortable: true,
      width: "13%",
      searchValue: (r) => r.name,
      cell: (r, filterQuery) => (
        <span className="font-medium">
          <HighlightText text={r.name} query={filterQuery} />
        </span>
      ),
    },
    {
      id: "version",
      header: "Version",
      width: "8%",
      searchValue: (r) => r.version,
      cell: (r, filterQuery) => (
        <span className="[color:var(--muted)] font-mono [font-size:var(--font-size-caption)]">
          <HighlightText text={r.version} query={filterQuery} />
        </span>
      ),
    },
    {
      id: "license",
      header: "License",
      width: "9%",
      searchValue: (r) => r.license,
      cell: (r, filterQuery) => <HighlightText text={r.license} query={filterQuery} />,
    },
    {
      id: "sizeKb",
      header: "Size",
      sortable: true,
      align: "right",
      width: "7%",
      cell: (r) => formatSize(r.sizeKb),
    },
    {
      id: "downloads",
      header: "Downloads",
      sortable: true,
      align: "right",
      width: "10%",
      cell: (r) => formatNumber(r.downloads),
    },
    {
      id: "description",
      header: "Description",
      searchValue: (r) => r.description,
      cell: (r, filterQuery) => (
        <span className="[color:var(--muted)]">
          <HighlightText text={r.description} query={filterQuery} />
        </span>
      ),
    },
    {
      id: "author",
      header: "Author",
      sortable: true,
      width: "12%",
      searchValue: (r) => r.author,
      cell: (r, filterQuery) => <HighlightText text={r.author} query={filterQuery} />,
    },
    {
      id: "status",
      header: "Status",
      width: "11%",
      wrap: true,
      cell: (r) => <StatusBadge label={r.status} status={r.status} />,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h2 className="data-table-heading">
          Package Registry
        </h2>
        <p className="[font-size:var(--font-size-body)] [color:var(--muted)] mt-1">
          {packages.length} packages. Search, sort, and browse.
        </p>
      </div>
      <Table<Package>
        columns={columns}
        data={sorted}
        rowKey={(r) => r.name}
        sort={sort}
        onSort={(columnId, direction) => setSort({ columnId, direction })}
        filterable
        filterPlaceholder="Search packages..."
        pageSize={10}
        fixed
      />
    </div>
  );
}
```

## Variants

- **Full-featured**: `filterable` + `pageSize` + sorting + highlighting (default)
- **Filter only**: Omit `pageSize` — filter bar without pagination
- **Pagination only**: Omit `filterable` — pagination without filter bar
- **Plain table**: Omit both — just sorting and optional row selection
- **With row selection**: Add `onRowClick` + `selectedKey` for master-detail integration

## Column Sizing Guide

When using `fixed` layout, column widths are percentages:

- Account for cell padding (~24px per column)
- Minimum practical width: `7%` (~58px at 830px table)
- Use `wrap: true` for UI elements (StatusBadge, buttons)
- Leave one column without `width` to absorb remaining space (usually the widest, like "Description")
- Widths should sum to ~100% across all columns with explicit widths, plus the flex column

## Interactions

| User Action            | Result                                              |
|------------------------|-----------------------------------------------------|
| Type in filter         | Debounced (200ms) search across `searchValue` columns |
| Column scope dropdown  | Limit search to "All columns" or a specific column   |
| Click sortable header  | Toggles sort direction on that column                |
| Prev / Next buttons    | Navigate between pages                               |
| Filter changes         | Resets to page 1 automatically                       |
| Hover truncated cell   | Native tooltip shows full text                       |

## Do / Don't

- **Do** use `fixed` layout when columns have percentage widths — it enables truncation and stable row heights.
- **Do** add `searchValue` to every text column that should be filterable.
- **Do** pass `filterQuery` to `HighlightText` in cell renderers for search highlighting.
- **Do** use `wrap: true` on columns with structured UI elements (StatusBadge, buttons).
- **Don't** make numeric columns searchable unless the formatted string is meaningful.
- **Don't** set `width` on every column — leave one flexible to absorb space.
- **Don't** use `pageSize` smaller than 5 or larger than 50 — both hurt usability.
