---
name: FormResults
status: stable
since: 1.0.0
summary: Pinned search/filter form at top with scrollable result cards below for query-driven workflows.
keywords: [search results, search page, form results, query results, code search, filter results, find page, search interface, result cards, query-driven]
use_when:
  - Search interfaces where the user provides criteria and gets a list of results
  - Any workflow with a distinct input step followed by a results step (find, filter, generate)
avoid_when:
  - Always-visible data that requires no query → Dashboard or MasterDetail
  - Single-result lookups → Card with loading state
related: [Card, SearchInput, HighlightText, Dropdown, StatusBadge, CodeBlock]
---

# Form + Results Pattern

> Search/filter form at the top, result cards below for query-driven workflows.

## When to Use

- Search interfaces where the user provides criteria and gets a list of results
- Any workflow with an input step followed by a results step (find, filter, generate)

## When NOT to Use

- Always-visible data that doesn't require a query (use Dashboard or Master-Detail)
- Single-result lookups (a simple Card with loading state is enough)

## Composition

```
flex column (full height)
  ├── Card (form) — pinned, flex-shrink: 0
  │     ├── Dropdown(s)
  │     └── SearchInput (integrated search bar with clear + submit)
  └── scroll region — flex: 1, overflow-y: auto
        └── Card[] (results)
              ├── StatusBadge
              ├── HighlightText (matched query in file paths)
              └── CodeBlock (with highlightQuery for matched text in code)
```

```
┌──────────────────────────────────────────────┐
│  Card (form) — pinned at top                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Language ▼│ │ Scope   ▼│ │ search... ✕🔍│ │
│  └──────────┘ └──────────┘ └──────────────┘ │
├──────────────────────────────────────────────┤
│  ↕ scrollable results area                   │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │  Result Card 1                           ││
│  │  ● High  src/auth/login.ts:42            ││
│  │  ┌─── CodeBlock ──────────────────────┐  ││
│  │  │ export function authenticate(...)  │  ││
│  │  └────────────────────────────────────┘  ││
│  └──────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────┐│
│  │  Result Card 2                           ││
│  │  ● Medium  src/utils/hash.ts:17          ││
│  │  ...                                     ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

The form Card is pinned at the top (`flex-shrink: 0`) so it is always visible. Results scroll independently below it.

## Required Components

| Component     | Role                                          | Required? |
|---------------|-----------------------------------------------|-----------|
| Card          | Form container + result container              | Yes       |
| SearchInput   | Integrated search bar (input + clear + submit) | Yes       |
| HighlightText | Highlight matched query in result text         | No        |
| Dropdown      | Filter/criteria selectors                      | No        |
| StatusBadge   | Relevance/status on results                    | No        |
| CodeBlock     | Code snippet in results (supports `highlightQuery`) | No  |

## Tokens

| Token                   | Usage                           |
|-------------------------|---------------------------------|
| `--space-3`, `--space-4`| Form field gaps, Card padding   |
| `--radius-sm`           | Input and dropdown radius       |
| `--radius-md`           | Card radius                     |
| `--color-accent`  | Search button background        |
| `--border`              | Input, Card borders             |
| `--bg`, `--card`        | Input and Card backgrounds      |

## State

```typescript
// Form state
const [query, setQuery] = useState("");
const [language, setLanguage] = useState("all");
const [scope, setScope] = useState("all");

// Results — null means "no search yet", [] means "searched but no results"
const [results, setResults] = useState<SearchResult[] | null>(null);

// Search handler — called by SearchInput on trigger
const handleSearch = useCallback(
  (searchValue: string) => {
    if (searchValue === "") {
      setResults(null);
      return;
    }
    // API call or local filter
    const filtered = searchAPI(searchValue, { language, scope });
    setResults(filtered);
  },
  [language, scope]
);
```

The `null` vs `[]` distinction matters for UX:
- `null` → show nothing (initial state, before first search)
- `[]` → show "No results found" message

## Example

```tsx
import { useState, useCallback } from "react";
import { Card } from "@codesweep-ai/ui";
import { SearchInput } from "@codesweep-ai/ui";
import { Dropdown } from "@codesweep-ai/ui";
import { StatusBadge } from "@codesweep-ai/ui";
import { CodeBlock } from "@codesweep-ai/ui/code";
import { HighlightText } from "@codesweep-ai/ui";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("all");
  const [scope, setScope] = useState("all");
  const [results, setResults] = useState<Result[] | null>(null);

  const handleSearch = useCallback(
    (value: string) => {
      if (!value) { setResults(null); return; }
      setResults(searchAPI(value, { language, scope }));
    },
    [language, scope]
  );

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Pinned form */}
      <div className="form-results-toolbar">
        <Card header="Code Search">
          <div className="form-results-controls">
            <Dropdown value={language} onChange={setLanguage} options={languageOptions} />
            <Dropdown value={scope} onChange={setScope} options={scopeOptions} />
            <SearchInput
              value={query}
              onChange={setQuery}
              onSearch={handleSearch}
              placeholder="Search for code..."
              minChars={3}
              className="flex-1 min-w-[200px]"
            />
          </div>
        </Card>
      </div>

      {/* Scrollable results */}
      <div className="form-results-scroll">
        {results !== null && (
          <div className="form-results-list">
            <span className="[font-size:var(--font-size-body)] [color:var(--muted)]">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
            {results.length === 0 ? (
              <div className="form-results-empty">
                No results found. Try adjusting your filters.
              </div>
            ) : (
              results.map((r, i) => (
                <Card key={i} variant="tight">
                  <div className="form-result-content">
                    <div className="form-result-heading">
                      <StatusBadge label={r.relevanceLabel} status={r.relevance} />
                      <span className="[font-size:var(--font-size-caption)] [color:var(--muted)] font-mono">
                        <HighlightText text={`${r.file}:${r.line}`} query={query} />
                      </span>
                    </div>
                    <CodeBlock
                      code={r.code}
                      language={r.language}
                      source={r.file}
                      highlightQuery={query}
                    />
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

## Variants

- **Default**: Form Card + scrollable result Cards
- **Manual search**: SearchInput with `minChars` — user presses Enter to trigger
- **Auto search**: SearchInput with `autoSearch` — debounced, triggers on type
- **Empty state**: No results yet — show nothing below the form
- **Loading**: Button disabled + spinner while results load
- **Inline form**: Dropdowns and input on one row (wide screens) or stacked (narrow)

## Interactions

| User Action                | Result                                           |
|----------------------------|--------------------------------------------------|
| Type 3+ chars in SearchInput | Auto-search fires after debounce delay          |
| Press Enter or click 🔍    | Results appear below the form                    |
| Click ✕ in SearchInput     | Clears query and results                         |
| Change dropdown            | (Optional) auto-filter or wait for submit        |
| Click result Card          | (Optional) navigate to detail                    |

## Do / Don't

- **Do** use `SearchInput` with `minChars` for auto-search after a character threshold.
- **Do** show a count of results (e.g., "3 results") above the list.
- **Don't** auto-submit on every keystroke without debounce — use SearchInput's built-in debounce.
- **Don't** show more than ~20 results at once; paginate or virtualize.
