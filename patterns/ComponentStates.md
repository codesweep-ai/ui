---
name: ComponentStates
status: stable
since: 1.0.0
summary: Canonical empty, loading, and error state contract for every component that renders async data.
keywords: [loading state, empty state, error state, async data, skeleton, retry, component states, loading skeleton, empty message, error handling]
use_when:
  - Adding a new component that fetches or streams data
  - Ensuring consistent loading/empty/error UI across the app
  - Consumers need override props for empty messages, retry callbacks, or error copy
avoid_when:
  - Pure client-side/static components with no async data → no state props needed
related: [Skeleton, Button, Table, Tree, SectionedTree, MarkdownViewer, Dropdown, SearchInput, Card]
---

# Pattern: Component States

> Every component that renders async data must support empty / loading / error states explicitly. This pattern documents the canonical shape so consumers don't reinvent it per surface.

## The contract

A component that depends on async data (a fetch, a stream, a user-driven derivation) must accept these props:

```typescript
interface AsyncStateProps {
  loading?: boolean;
  error?: Error | string | null;
  errorMessage?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyHint?: string;
  emptyAction?: { label: string; onClick: () => void };
}
```

### Precedence

When more than one is set, render in this order — first match wins:

1. `loading={true}` → skeleton block
2. `error` (truthy, not loading) → error block
3. data is empty (not loading, not error) → empty block
4. otherwise → render the populated component

This precedence is **deliberate**:
- Loading wins over error so a refetch after a previous error shows the in-flight indicator (not the stale error).
- Error wins over empty so the user sees "something went wrong" rather than "no data" (different fix paths).
- Empty wins over rendering nothing so the user always sees *something* signaling the state.

## Variant: container vs primitive

Two scopes of "state":

### Container-style components (Table, Tree, SectionedTree, MarkdownViewer)

The full triad — loading replaces the body with multiple skeletons; error and empty render centered icon + text + optional action blocks. The outer container chrome (border, filter bar, header row) is preserved so the component doesn't visually jump between states.

Test IDs follow the pattern `<componentname>-loading`, `<componentname>-error`, `<componentname>-empty` (all lowercase, no underscore).

### Primitive-style components (Dropdown, SearchInput, Card)

Narrower variants — the affordance itself communicates the state without a separate block:

- `Dropdown.options=[]` → select disabled with a single "No options available." disabled option. No empty block.
- `SearchInput.noResults={true}` → italic muted message inline below the input. No error/loading variants (the input itself is fine; the absence of results is what's missing).
- `Card.loading={true}` → body replaced with 3 skeleton lines, header preserved. No error/empty (the consumer composes those with the cards inside, or by not rendering the card at all).

## Visual spec

### Loading

- Skeleton primitive (`<Skeleton>`) — see `components/Skeleton.md`
- Row count by component:
  - `Table`: 8 rows
  - `Tree`: 6 rows with varying indent
  - `SectionedTree`: 3 sections × 3 rows
  - `MarkdownViewer`: ~10 lines of mixed widths (mimics title + paragraphs)
  - `Card`: 3 lines of varying widths (80% / 65% / 75%)

### Error

- Centered flex column, gap `var(--space-2)`, padding `var(--space-6)`
- Icon: lucide `AlertCircle`, sized via `--icon-size-lg`, color `var(--color-error)`
- Primary text: `errorMessage` prop OR `"Something went wrong"`, `--font-size-body`, `var(--fg)`
- Secondary text (when `error.message` exists or `error` is a string): `--font-size-caption`, `var(--muted)`
- Retry button: `<Button variant="secondary" size="sm">Retry</Button>`, only when `onRetry` is provided

### Empty

- Same centered layout as error
- Icon: lucide `Inbox`, sized via `--icon-size-lg`, color `var(--muted)`
- Primary text: `emptyMessage` prop (component-specific default)
- Secondary text: `emptyHint` (optional)
- CTA button: `<Button variant="secondary" size="sm">{label}</Button>`, only when `emptyAction` is provided

## Anti-patterns

- ❌ Showing a spinner instead of skeletons for component-level loading. Spinners say "we don't know what's happening" — skeletons say "data is loading into this specific shape."
- ❌ Rendering an empty `<div>` for empty data. Always show the empty block (or, for primitive variants, communicate via the affordance).
- ❌ Letting the container collapse when entering a state. Preserve the chrome.
- ❌ Hard-coding error / empty messages where consumers can't override.
- ❌ Forgetting to gate pagination, sort indicators, etc. on the data state. If the table is loading, pagination shouldn't render.
- ❌ Throwing on missing data instead of falling into the empty branch.

## Cross-component example

```tsx
function ProjectsPage() {
  const { data, isLoading, error, refetch } = useQuery(["projects"], fetchProjects);

  return (
    <Table
      columns={projectColumns}
      data={data ?? []}
      rowKey={(p) => p.id}
      loading={isLoading}
      error={error}
      onRetry={refetch}
      emptyMessage="No projects yet"
      emptyHint="Create your first project to get started."
      emptyAction={{ label: "New project", onClick: openCreateModal }}
    />
  );
}
```

The same shape works for `Tree`, `SectionedTree`, and `MarkdownViewer`. Internal state branching, animations, and accessible roles all follow this pattern — consumers don't have to think about it.

## Enforcement

The ESLint rule `@codesweep-ai/components-need-state-props` (warn level, added v1.2.0) flags components that touch async-data patterns without these props. It's a heuristic, not a guarantee — manual review still required for component additions.
