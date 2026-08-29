---
name: MasterDetail
status: stable
since: 1.0.0
summary: Sortable list or table on one side with a detail pane on the other for inspecting individual records.
keywords: [master detail, list detail, record detail, split view, row selection, detail pane, inspect record, two panel, table detail, side panel]
use_when:
  - Browsing a flat list of records where each record has rich detail
  - Any table where clicking a row shows more information without navigating away
avoid_when:
  - Deep or arbitrary-depth hierarchies → Explorer
  - Data that fits entirely in table cells → plain Table
  - Nested drill-down more than 3 levels → Explorer
related: [SplitPane, Table, Card, StatusBadge, CodeBlock, HighlightText]
---

# Master-Detail Pattern

> Sortable list/table on one side, detail pane on the other for inspecting individual records.

## When to Use

- Browsing a flat list of records where each record has rich detail (description, code, metadata)
- Any table where clicking a row should show more information without navigating away

## When NOT to Use

- Deep or arbitrary-depth hierarchies (use Explorer instead)
- Data that fits in the table cells themselves (a simple Table is enough)
- Nested drill-down with more than 3 levels — flatten or use Explorer

## Composition

```
SplitPane
  ├── Table (selectable rows)
  └── Card
        ├── StatusBadge
        └── CodeBlock
```

```
┌────────────────────────┬───────────────────────────┐
│ Name      │ Pkg  │ St  │  Detail Card              │
│───────────│──────│─────│                            │
│ ● UserSvc │ core │ ✓  ◄│  Name: UserService         │
│   OrderCtl│ api  │ ✓   │  Status: ● Active          │
│   CacheMgr│ infra│ ⚠   │  Methods: 12  Fields: 8    │
│   AuthHndl│ core │ ✓   │                            │
│   LogUtil │ util │ ●   │  ┌─── CodeBlock ────────┐  │
│            │      │     │  │ class UserService {   │  │
│            │      │     │  │   ...                 │  │
│            │      │     │  └──────────────────────┘  │
│◄──────resize─handle────►│                            │
└────────────────────────┴───────────────────────────┘
```

## Required Components

| Component   | Role                               | Required? |
|-------------|-------------------------------------|-----------|
| SplitPane   | Horizontal split with resize handle | Yes       |
| Table       | Sortable, selectable row list       | Yes       |
| Card        | Detail pane container               | Yes       |
| StatusBadge | Status indicator in detail          | No        |
| CodeBlock   | Code preview in detail              | No        |

## Tokens

| Token                        | Usage                            |
|------------------------------|----------------------------------|
| `--space-4`                  | Pane content wrapper padding (both panes must match) |
| `--space-3`                  | Table cell padding               |
| `--radius-md`               | Card, Table border radius        |
| `--color-accent`      | Sort icon color                   |
| `--color-accent-bg`  | Selected row background           |
| `--color-row-hover`         | Table row hover background       |
| `--border`                   | Table borders, Card border       |

## State

```typescript
// Sort state
const [sort, setSort] = useState<{
  columnId: string;
  direction: "asc" | "desc";
}>({ columnId: "name", direction: "asc" });

// Selection state
const [selectedKey, setSelectedKey] = useState<string | null>(null);

// Derived
const sorted = useMemo(() => sortData(records, sort), [records, sort]);
const selected = records.find((r) => r.name === selectedKey) ?? null;
```

## Example

```tsx
import { useState, useMemo } from "react";
import { SplitPane } from "@codesweep-ai/ui";
import { Table } from "@codesweep-ai/ui";
import { Card } from "@codesweep-ai/ui";
import { StatusBadge } from "@codesweep-ai/ui";
import { CodeBlock } from "@codesweep-ai/ui/code";

function MasterDetail({ records }) {
  const [sort, setSort] = useState({ columnId: "name", direction: "asc" as const });
  const [selectedName, setSelectedName] = useState<string | null>(null);

  const sorted = useMemo(() => sortBy(records, sort), [records, sort]);
  const selected = records.find((r) => r.name === selectedName) ?? null;

  return (
    <SplitPane
      className="h-full"
      panes={[
        {
          id: "list",
          defaultWidth: 420,
          minWidth: 300,
          maxWidth: 600,
          children: (
            <div className="master-detail-scroll">
              <Table
                columns={[
                  { id: "name", header: "Name", sortable: true, cell: (r) => r.name },
                  {
                    id: "package", header: "Package", sortable: true,
                    cell: (r) => <span className="[color:var(--muted)]">{r.package}</span>,
                  },
                  {
                    id: "methods", header: "Methods", sortable: true,
                    align: "right", width: "80px", cell: (r) => r.methods,
                  },
                  {
                    id: "status", header: "Status", width: "100px", wrap: true,
                    cell: (r) => <StatusBadge label={r.status} status={r.status} />,
                  },
                ]}
                data={sorted}
                rowKey={(r) => r.name}
                sort={sort}
                onSort={(columnId, direction) => setSort({ columnId, direction })}
                onRowClick={(r) => setSelectedName(r.name)}
                selectedKey={selectedName}
              />
            </div>
          ),
        },
        {
          id: "detail",
          children: (
            <div className="master-detail-scroll">
              {selected ? (
                <Card header={selected.name}>
                  <div className="master-detail-stack">
                    <div className="master-detail-heading">
                      <StatusBadge label={selected.status} status={selected.status} />
                      <span className="[font-size:var(--font-size-caption)] [color:var(--muted)]">
                        {selected.package}
                      </span>
                    </div>
                    <p className="[color:var(--fg)] [font-size:var(--font-size-body)] leading-relaxed m-0">
                      {selected.description}
                    </p>
                    <CodeBlock
                      code={selected.code}
                      language="typescript"
                      source={`${selected.package}/${selected.name}.ts`}
                    />
                  </div>
                </Card>
              ) : (
                <div className="h-full flex items-center justify-center [color:var(--muted)]">
                  Select an item from the table
                </div>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}
```

## Variants

- **Default**: Table on left, detail Card on right
- **With filtering**: Add `filterable` and `searchValue` to Table columns
- **With pagination**: Add `pageSize` to Table for large master lists
- **No detail selected**: Show a placeholder message in the Card area
- **Collapsed detail**: SplitPane right pane collapsed; table fills width
- **Nested Master-Detail**: Drill-down through 2–3 levels (see below)

### Nested Master-Detail

For hierarchical data with a known, bounded depth (2–3 levels), the nested variant stacks Tables inside the detail pane. Each level drills into the next.

#### Composition

```
SplitPane
  ├── Table (Master 1 — top-level list)
  └── Detail area
        ├── Header (selected level-1 item stats)
        ├── Table (Master 2 — child list)
        └── Conditional:
              ├── If child selected → detail section
              │     ├── Header with StatusBadges
              │     └── Table (level-3 rows)
              └── If no child selected → placeholder
```

```
┌──────────────────────┬──────────────────────────────────────┐
│ Dept    │ HC │ Cmts  │  Platform                            │
│─────────│────│───────│  Budget: $2.4M  HC: 11  Cmts: 1,842 │
│ ● Platf │ 11 │ 1,842 │                                      │
│   Prod  │  9 │ 1,356 │  Team     │ Lead     │ Cmts │ PRs    │
│   Sec   │  7 │   948 │  ─────────│──────────│──────│─────── │
│         │    │       │  ● CoreAPI│ A. Chen  │  724 │   5    │
│         │    │       │    Infra  │ E. Vance │  583 │   3    │
│         │    │       │    Data   │ H. Johal │  535 │   7    │
│         │    │       │                                      │
│         │    │       │  → Select a team to view members     │
│◄─────resize─handle──►│                                      │
└──────────────────────┴──────────────────────────────────────┘
```

#### State

```typescript
// One selection + sort per drill level
const [selectedDept, setSelectedDept] = useState<string | null>(null);
const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
const [deptSort, setDeptSort] = useState({ columnId: "name", direction: "asc" as const });
const [teamSort, setTeamSort] = useState({ columnId: "name", direction: "asc" as const });
const [memberSort, setMemberSort] = useState({ columnId: "name", direction: "asc" as const });

// IMPORTANT: selecting a parent clears child selections
const handleDeptClick = (dept: Department) => {
  setSelectedDept(dept.name);
  setSelectedTeam(null); // reset child
};
```

#### Guidelines

- **Max 3 levels** — deeper hierarchies should use Explorer instead
- **Clear child on parent change** — selecting a new department always resets team selection
- **Each level gets its own sort state** — sort changes at one level don't affect others
- **Stacked layout** — child Tables appear below the parent in the detail pane, not in a nested SplitPane

#### Long List Variant

When the Level 2 table can have many rows (enough to push Level 3 detail off-screen), split the detail pane into two independently scrollable regions so the detail is always visible without scrolling.

**When to use:** The Level 2 table regularly exceeds the viewport height, making Level 3 content invisible after a row click.

**Technique:** Replace the single detail scroller with a flex column containing two equal children that each use `min-height: 0` and `overflow-y: auto`, separated by `var(--space-4)`.

```
SplitPane
  ├── Table (Master 1)
  └── Detail area (flex column, gap-4)
        ├── Top half (flex-1, min-h-0, overflow-y-auto)
        │     ├── Header
        │     └── Table (Master 2)
        └── Bottom half (flex-1, min-h-0, overflow-y-auto)
              ├── Header with StatusBadges
              └── Detail content / Table (level-3)
```

```tsx
// Detail pane children — replaces single scrollable div
<div className="master-detail-halves">
  {/* Top half: level-2 table */}
  <div className="master-detail-half">
    <Header />
    <Table ... />
  </div>

  {/* Bottom half: level-3 detail */}
  <div className="master-detail-half">
    {selectedChild ? <Detail /> : <Placeholder />}
  </div>
</div>
```

**Rules:**
- Use `gap: var(--space-4)` between the halves, not borders.
- Both halves use `flex: 1` so they split 50/50.
- Each half scrolls independently — the table can be long without hiding the detail

## Interactions

| User Action         | Result                                      |
|---------------------|---------------------------------------------|
| Click table row     | Row highlights; detail Card updates          |
| Click sortable header | Table re-sorts by that column              |
| Drag resize handle  | Adjust table vs. detail width               |

Row selection uses the Table component's `onRowClick` and `selectedKey` props — clicking anywhere on the row selects it (not just a specific cell). The selected row is highlighted with `var(--color-accent-bg)`.

## Do / Don't

- **Do** use Table's `onRowClick` / `selectedKey` for row selection — the entire row should be clickable.
- **Do** show a "Select an item" placeholder when nothing is selected.
- **Don't** embed click-handler buttons in individual cells for selection — use `onRowClick` instead.
- **Don't** put editable forms in the detail pane — this pattern is read-only. Use Form + Results for input.
- **Don't** make the table columns too narrow; ensure the primary identifier (name) is always readable.
