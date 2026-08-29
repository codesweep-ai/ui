---
name: CheckboxGroup
status: stable
since: 1.0.0
summary: List of checkboxes with select-all/none controls, optional filter input, and collapsible grouped sections; integrates with FormGroup for label/helper/error rendering.
keywords: [checkbox group, multi-select, checkboxes, filter checkboxes, select all,
           select none, grouped checkboxes, collapsible sections, filter sidebar,
           multi-select filter, checkbox list, form multi-select, faceted filter,
           options list, toggle group]
use_when:
  - Multi-select filter sidebar, for example file types, statuses or categories
  - Any form field requiring multiple boolean selections from a list
  - Grouped/sectioned option lists with collapse/expand behavior
avoid_when:
  - Single boolean toggle → a plain checkbox input; this package ships no toggle component
  - Mutually exclusive options → RadioGroup
related: [FormGroup, Input, SearchInput]
patterns: [Form, Dashboard]
---

# CheckboxGroup

> A list of checkboxes with select all/none controls and optional filter input for narrowing visible options.

## Props

```typescript
interface CheckboxOption {
  /** Unique value identifier */
  value: string;
  /** Display label */
  label: string;
  /** Optional color dot rendered beside the label */
  color?: string;
  /** Optional group name — when set on any option, collapsible sections are rendered */
  group?: string;
  /** Disable this individual option */
  disabled?: boolean;
}

interface CheckboxGroupProps {
  /** Available options */
  options: CheckboxOption[];
  /** Currently selected values */
  selected: Set<string>;
  /** Called when selection changes */
  onChange: (selected: Set<string>) => void;
  /** Group label displayed above the checkboxes */
  label?: string;
  /** Grey hint below the group (hidden when error is set). Added v1.3.0. */
  helper?: string;
  /** Red error message below the group (replaces helper). Added v1.3.0. */
  error?: string;
  /** Show a filter input to narrow visible options. Default: false */
  filterable?: boolean;
  /** Placeholder for the filter input */
  filterPlaceholder?: string;
  /** Disable the entire group */
  disabled?: boolean;
  /** Additional className on the root container */
  className?: string;
}
```

As of v1.3.0, CheckboxGroup wraps its body in [`FormGroup`](./FormGroup.md) so that label + helper + error rendering is identical to other form fields. Do **not** nest a CheckboxGroup inside an outer FormGroup — that would render two labels. Pass label/helper/error directly to CheckboxGroup.

```typescript
// before v1.3.0 (still works, no helper/error)
<CheckboxGroup options={opts} selected={sel} onChange={set} label="Filter by status" />

// v1.3.0+
<CheckboxGroup
  options={opts}
  selected={sel}
  onChange={set}
  label="Filter by status"
  helper="Toggle one or more statuses"
  error={statusErr ?? undefined}
/>
```

## Visual Spec

### Layout

```
┌───────────────────────┐
│  FILTER               │ ← label (optional)
│  ┌─────────────────┐  │
│  │ Filter...     ✕ │  │ ← filter input (when filterable=true)
│  └─────────────────┘  │
│  All | None           │ ← select all / select none
│  ☑ ● .tsx             │
│  ☑ ● .ts              │ ← checkbox list with color dots
│  ☐ ● .css             │
│  ...                  │
└───────────────────────┘
```

- Root: `flex-direction: column`, gap `var(--space-2)`.
- Label: uppercase, tracked, `font-size: var(--font-size-xs)`, `color: var(--muted)`.
- Filter input: full width, `font-size: var(--font-size-xs)`, with clear (X) button.
- All/None: inline text buttons separated by `|`, `font-size: var(--font-size-xs)`.
- Checkboxes: `accent-color: var(--color-accent)`, label with optional color dot.

When any option has `group` set, sections are rendered automatically:

```
┌───────────────────────┐
│  FILTER               │
│  ┌─────────────────┐  │
│  │ Filter...     ✕ │  │
│  └─────────────────┘  │
│  All | None           │
│  Collapse all         │
│  ▼ CODE        3/4    │ ← sticky section header (collapsible)
│    ☑ ● .tsx           │
│    ☑ ● .ts            │
│    ☑ ● .jsx           │
│    ☐ ● .test.ts       │
│  ▼ STYLES      2/2    │
│    ☑ ● .css           │
│    ☑ ● .scss          │
│  ▶ CONFIG      0/4    │ ← collapsed section
│  ...                  │
└───────────────────────┘
```

- **Grouped container**: `background: var(--bg)`, `border-radius: var(--radius-sm)`, `padding: var(--space-1)`. Creates a recessed content area that contrasts with `var(--card)` parent backgrounds (Cards, Panels), matching the visual hierarchy used by SectionedTree/Explorer (darker content, lighter headers).
- **Section headers**: sticky (`position: sticky; top: 0`), `background: var(--card)` so they occlude items while scrolling and appear elevated above the `var(--bg)` content area. Chevron icon (▶/▼) + name + selected/total count.
- **Expand/Collapse all**: Text button above sections to toggle all at once.
- **Checkboxes within sections**: indented `padding-left: var(--space-1)`.
- Sections that have no filtered matches are hidden entirely.

### Styling

- **Filter input**: `border: 1px solid var(--border)`, `border-radius: var(--radius-sm)`, `background: var(--card)`, `color: var(--fg)`, `padding: var(--space-1) var(--space-2)`.
- **All/None buttons**: transparent background, no border, `color: var(--muted)`, hover `color: var(--fg)`. Disabled when already in that state (`opacity: 0.4`).
- **Color dot**: `width: 10px`, `height: 10px`, `border-radius: 50%`.
- **Checkbox labels**: `font-size: var(--font-size-sm)`, `color: var(--fg)`, `cursor: pointer`.

### States

| State                 | CSS                                            |
|-----------------------|------------------------------------------------|
| Default               | All options visible, All/None enabled          |
| All selected          | "All" button disabled                          |
| None selected         | "None" button disabled                         |
| Filter active         | Only matching options shown; All/None applies to visible set |
| No filter matches     | "No matches" italic message                    |
| Disabled (group)      | `opacity: 0.5`, `pointer-events: none`         |
| Disabled (option)     | Individual option `opacity: 0.5`               |

### Container Requirements

CheckboxGroup grows with its content — it does **not** manage its own scroll. The consumer must place it inside a height-bounded container with `overflow-y: auto` if the option list may exceed the visible area.

```css
/* Container wrapping CheckboxGroup */
width: 11rem;
overflow-y: auto;
/* Height must be bounded by one of: */
/*   - explicit height on this element (e.g. max-height: 20rem) */
/*   - a flex/grid parent with a fixed height (preferred for multi-column layouts) */
```

Without a bounded height, `overflow-y: auto` has no effect and the list will overflow its visual container. See [Convention 7.11 — Scrollable Regions](../DESIGN_SYSTEM_SPEC.md#711-scrollable-regions) for the general rule.

This also affects **sticky section headers** in grouped mode — `position: sticky` only works inside a scrollable ancestor. If the container isn't actually scrolling, section headers won't stick.

### Responsive

- No breakpoint changes. Width follows parent container.

## Behavior

### Interactions

- **Toggle checkbox**: Adds/removes value from `selected` set, fires `onChange`.
- **All**: Adds all currently visible (filtered) options to `selected`.
- **None**: Removes all currently visible (filtered) options from `selected`.
- **Filter input**: Narrows visible options by case-insensitive substring match on label. All/None apply only to the visible subset.
- **Clear filter (X)**: Resets filter text, shows all options.
- **Section header click**: Toggles collapse/expand for that section.
- **Expand/Collapse all**: Toggles all sections at once.

### Keyboard

| Key    | Action                              |
|--------|-------------------------------------|
| Tab    | Navigate between filter, All/None, and checkboxes |
| Space  | Toggle focused checkbox             |

### Accessibility

- Each checkbox is wrapped in a `<label>` for click-to-toggle.
- Clear filter button has `aria-label="Clear filter"`.
- Color dots are decorative (no `aria-label` needed since the text label provides the name).
- Consumer should provide an associated label or `aria-label` on the container if the `label` prop is not used.

## Persistence

None. Filter input resets when unmounted.

## Dependencies

- `cn()` utility for className merging.
- `lucide-react`: `X` (filter clear), `ChevronRight` / `ChevronDown` (section collapse/expand).

## Edge Cases

- **No options**: Renders empty (only label and All/None if present).
- **All options disabled**: Group renders but individual checkboxes cannot be toggled. All/None still works (toggles on the data level).
- **Filter matches nothing**: Shows "No matches" italic text. All/None buttons are disabled.
- **filterable=false**: No filter input rendered. All/None still present.
- **Color not provided**: No dot rendered, just text label.
- **No group on any option**: Flat list, no sections. Sections only appear when at least one option has `group`.
- **Mixed grouped/ungrouped**: Options without `group` are placed in an "Other" section.
- **Filter hides entire section**: If no options in a section match the filter, that section is hidden.
- **All sections collapsed**: "Collapse all" text changes to "Expand all".

## Traceability

`data-component="CheckboxGroup"` on the root `<div>`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { CheckboxGroup } from "@codesweep-ai/ui";
export function Example() { return <CheckboxGroup label="Kinds" options={[{ value: "tool", label: "Tool" }]} selected={new Set(["tool"])} onChange={() => {}} />; }
```
