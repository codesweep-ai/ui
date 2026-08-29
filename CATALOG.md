<!-- GENERATED FILE — do not edit. Source: components/*.md + patterns/*.md frontmatter, cross-checked against src/index.ts. Regenerate with `npm run catalog`. -->

# @codesweep-ai/ui — Component Catalog

This index lists every component and pattern the package exports, and it is the **look-here-first** place for reuse. Search it by intent, for example "graph", "table" or "steps", before building any UI.

**Decision order:** match an entry → import from `@codesweep-ai/ui` and compose · close but missing a prop → enhance that component · no match → add a new one (see [CONTRIBUTING.md](CONTRIBUTING.md)). Never hand-roll a duplicate.

## Components

### AgentStatus  ·  since 1.4.0
Single-line status row for visible agent work; shows a verb-phrase and animated indicator so users always know what the agent is doing.
- intents: `agent status`, `activity indicator`, `loading state`, `in-flight`, `progress`, `verb phrase`, `streaming status`, `live update`, `aria-live`, `pulse badge`, `spinner alternative`, `agent feedback`, `task status`, `llm progress`
- use when: Displaying the work an agent has in hand (reading, generating, inferring)
- use when: Replacing generic spinners or "Loading…" text with a specific verb phrase
- use when: Surfacing paused / settled / error milestones in an agent trace
- avoid when: You need streaming model output text → StreamingText
- avoid when: You need a full step-by-step trace of completed agent actions → AgentTrace
- related: PulseBadge, StreamingText, AgentTrace · patterns: AgentActivity
- spec: [components/AgentStatus.md](components/AgentStatus.md)

### AgentTrace  ·  since 1.4.0
Vertical, expandable list of chronological agent steps with status icons.
- intents: `agent`, `trace`, `steps`, `activity`, `log`, `history`, `timeline`, `audit`, `run log`, `agent steps`, `chronological`
- use when: Showing the chronological list of steps an agent has taken (settled history)
- avoid when: One thing happening right now → AgentStatus
- avoid when: Token-by-token model output → StreamingText
- avoid when: Dense horizontal event overview or shared lane axis → EventLanes
- avoid when: Static program structure (file tree / AST) → Tree or SectionedTree
- related: AgentStatus, StreamingText, EventLanes, PulseBadge · patterns: AgentActivity
- spec: [components/AgentTrace.md](components/AgentTrace.md)

### AppShell  ·  since 1.0.0
Application shell with always-dark sticky header, scrollable content area, and optional footer; the top-level layout wrapper for every page.
- intents: `app shell`, `layout`, `header`, `footer`, `navigation`, `nav bar`, `top bar`, `app frame`, `page layout`, `sticky header`, `dark header`, `logo`, `nav links`, `global chrome`, `app wrapper`, `spa layout`
- use when: Wrapping any full-page app view that needs a header with nav + branding
- use when: Any page that uses ThemeToggle or top-level navigation
- use when: Building the outermost layout frame of a SPA
- avoid when: You only need a content card or panel without global chrome → Card or Panel
- ⚠ The Header is reserved for global chrome only. Feature-specific controls (dropdowns, search bars, breadcrumbs) belong in a feature toolbar inside the <main> content area, not in the Header.
- related: ThemeToggle · patterns: Dashboard
- spec: [components/AppShell.md](components/AppShell.md)

### Button  ·  since 1.0.0
Standard interactive button with six visual variants (primary, secondary, danger, ghost, success, warning) and two sizes.
- intents: `button`, `cta`, `call to action`, `submit`, `click`, `action`, `primary button`, `ghost button`, `danger button`, `secondary button`, `interactive`, `trigger`, `form submit`, `icon button`, `control`
- use when: Any user-triggered action (submit, confirm, cancel, navigate)
- use when: Icon-only controls in toolbars (ghost variant, add aria-label)
- use when: Destructive confirmations (danger variant)
- avoid when: You need ordinary text navigation without button emphasis → use an <a>
- related: FormGroup, Modal · patterns: Form
- spec: [components/Button.md](components/Button.md)

### Card  ·  since 1.0.0
Content container with background, border, optional header, and loading/error/empty state support; the primary surface for grouping related content.
- intents: `card`, `panel`, `container`, `content surface`, `tile`, `widget`, `dashboard tile`, `loading skeleton`, `bordered container`, `card header`, `maximize`, `minimize`, `card group`, `content card`, `info card`
- use when: Grouping related content with a consistent bordered surface
- use when: Dashboard tiles or stats cards that may have a loading state
- use when: Any surface that needs a header row + scrollable body (inside a CardGroup)
- avoid when: You need a full sidebar/content split → SplitPane or Panel
- avoid when: You need to manage maximize/minimize across multiple cards → wrap in CardGroup
- related: CardGroup, Panel, Skeleton · patterns: Dashboard
- spec: [components/Card.md](components/Card.md)

### CardGroup  ·  since 1.0.0
Layout container that manages maximize/minimize state for a group of Cards; supports fill (fixed-viewport) and natural-height stack modes.
- intents: `card group`, `maximize`, `minimize`, `card layout`, `dashboard layout`, `expand collapse`, `viewport fill`, `card container`, `multi-card`, `card state`, `controlled layout`, `card grid`, `stacked cards`, `dashboard panel`
- use when: Laying out multiple Cards that should share a fixed viewport height (fill mode)
- use when: Providing maximize/minimize affordance across sibling Cards
- use when: Stacking Cards in a scrolling page without nested scrollbars (fill=false)
- avoid when: You only have a single card with no siblings to maximize against → use Card directly
- related: Card · patterns: Dashboard
- spec: [components/CardGroup.md](components/CardGroup.md)

### ChartFrame  ·  since 1.5.0
Card frame + loading/error/empty states around a chart you render inside.
- intents: `chart`, `graph`, `plot`, `visualization`, `viz`, `dataviz`, `d3`, `recharts`, `sankey`, `bar chart`, `line chart`, `area chart`, `scatter`, `timeseries`, `force-directed graph`, `network graph`, `dashboard tile`
- use when: Rendering any chart/visualization that needs consistent card chrome + states
- use when: Always pair with useChartTheme() for theme-aware colors and axes
- avoid when: You need the chart primitive itself — ChartFrame is the frame only
- ⚠ The DS provides the frame + theme bridge (useChartTheme), NOT chart primitives. For a force-directed graph: render d3-force inside a ChartFrame and color via useChartTheme(). Don't reinvent the card/state shell.
- related: ChartTooltip · patterns: Chart, Dashboard
- spec: [components/ChartFrame.md](components/ChartFrame.md)

### ChartTooltip  ·  since 1.5.0
Token-styled tooltip shell for charts, positioned absolutely; handles bg, border, shadow, and radius so every chart's tooltip looks identical.
- intents: `chart tooltip`, `graph tooltip`, `data tooltip`, `hover tooltip`, `chart hover`, `visualization tooltip`, `recharts tooltip`, `d3 tooltip`, `dataviz tooltip`, `absolute tooltip`, `chart annotation`, `cursor tooltip`, `plot tooltip`
- use when: Adding a hover tooltip to any custom chart or visualization inside a ChartFrame
- use when: Ensuring consistent tooltip chrome across all charts without custom CSS
- avoid when: Don't style the tooltip box yourself — supply only content rows as children
- related: ChartFrame · patterns: Chart, Dashboard
- spec: [components/ChartTooltip.md](components/ChartTooltip.md)

### CheckboxGroup  ·  since 1.0.0
List of checkboxes with select-all/none controls, optional filter input, and collapsible grouped sections; integrates with FormGroup for label/helper/error rendering.
- intents: `checkbox group`, `multi-select`, `checkboxes`, `filter checkboxes`, `select all`, `select none`, `grouped checkboxes`, `collapsible sections`, `filter sidebar`, `multi-select filter`, `checkbox list`, `form multi-select`, `faceted filter`, `options list`, `toggle group`
- use when: Multi-select filter sidebar, for example file types, statuses or categories
- use when: Any form field requiring multiple boolean selections from a list
- use when: Grouped/sectioned option lists with collapse/expand behavior
- avoid when: Single boolean toggle → a plain checkbox input; this package ships no toggle component
- avoid when: Mutually exclusive options → RadioGroup
- related: FormGroup, Input, SearchInput · patterns: Form, Dashboard
- spec: [components/CheckboxGroup.md](components/CheckboxGroup.md)

### Chip  ·  since 0.2.0  ·  experimental
Dense toggle pill for toolbar filters, with pressed, count, and disabled states.
- intents: `chip`, `filter chip`, `pill`, `toggle`, `toolbar filter`, `count`, `pressed`
- use when: Toggling independent filters in a compact toolbar
- use when: Showing a filter label with a small result count
- avoid when: Choosing exactly one of several modes → SegmentedControl
- avoid when: Choosing from a long list → Dropdown
- related: SegmentedControl, Dropdown, Legend · patterns: DataTable, FormResults
- spec: [components/Chip.md](components/Chip.md)

### CodeBlock  ·  since 1.0.0
Syntax-highlighted code display with line numbers, copy button, line highlights, and query match highlighting; supports all highlight.js languages.
- intents: `code block`, `syntax highlighting`, `code display`, `highlight.js`, `code viewer`, `copy code`, `line numbers`, `code snippet`, `source code`, `programming language`, `code diff`, `search highlight`, `code highlight`, `monospace`, `code panel`
- use when: Displaying source code with syntax highlighting and a copy affordance
- use when: Showing a code snippet with specific lines highlighted, as search results do
- use when: Rendering code from a file path with a source subtitle
- avoid when: You need editable code → use a third-party editor (CodeMirror, Monaco)
- avoid when: Markdown documents with inline code — MarkdownViewer handles code fences natively
- related: MarkdownViewer, HighlightText · patterns: MasterDetail
- spec: [components/CodeBlock.md](components/CodeBlock.md)

### Dropdown  ·  since 1.0.0
Styled native select element for choosing a single value from a list of options, with optional label, helper, and error states.
- intents: `dropdown`, `select`, `native select`, `option`, `picker`, `choose`, `single select`, `combo`, `form field`, `filter`, `menu`, `selector`, `listbox`, `choice`
- use when: Choosing one value from a short or long predefined list
- use when: A form field needs a label, helper text, or inline validation error
- use when: Filtering or controlling a view from a discrete set of options
- avoid when: Multi-select needed → CheckboxGroup
- avoid when: Free-text entry with suggestions → SearchInput
- related: FormGroup, Input, CheckboxGroup, SearchInput · patterns: Form
- spec: [components/Dropdown.md](components/Dropdown.md)

### EventLanes  ·  since 0.2.0  ·  experimental
Canvas-rendered events on a shared global-index axis, with lanes, spans, overview navigation, token palettes, and an accessible virtual listbox.
- intents: `event lanes`, `event timeline`, `event strip`, `canvas timeline`, `trace events`, `agent events`, `multi-agent timeline`, `spans`, `overview`, `virtual listbox`
- use when: Showing an ordered event stream on one or more named lanes
- use when: A dense trace needs thousands of selectable events without thousands of laid-out DOM marks
- use when: Related events need spans, linked highlighting, markers, or a shared ruler
- avoid when: Showing chronological step details with expandable text → AgentTrace
- avoid when: Showing continuous numeric data → ChartFrame
- ⚠ The palette accepts CSS custom-property names such as --color-cat-1, never resolved colors or hex values. EventLanes is canvas-rendered but exposes every visible event and span through a stable DOM census.
- related: ChartTooltip, AgentTrace · patterns: AgentActivity
- spec: [components/EventLanes.md](components/EventLanes.md)

### FormGroup  ·  since 1.3.0
Label + control + helper/error composition wrapper. The canonical way to render any single form field with accessible label binding, error messaging, and aria wiring.
- intents: `form group`, `label`, `field wrapper`, `helper text`, `error message`, `validation`, `aria`, `accessible form`, `input wrapper`, `form field`, `required`, `hint`, `describedby`
- use when: Wrapping any single Input, Dropdown, or custom control with a visible label
- use when: Displaying inline validation errors or helper hints below a field
- use when: Building accessible forms with proper htmlFor / aria-describedby wiring
- avoid when: Wrapping CheckboxGroup → CheckboxGroup already renders its own label; nesting creates duplicate labels
- related: Input, Dropdown, CheckboxGroup · patterns: Form
- spec: [components/FormGroup.md](components/FormGroup.md)

### HighlightText  ·  since 1.0.0
Renders text with matched substrings visually highlighted using semantic mark elements. Used in search results, filtered lists, and autocomplete suggestions.
- intents: `highlight`, `text highlight`, `search highlight`, `mark`, `match`, `substring`, `autocomplete`, `filter`, `query match`, `search results`, `bolden`, `emphasize`, `annotate`
- use when: Showing which part of a result matched a user's search query
- use when: Highlighting matches in a filtered list or autocomplete dropdown
- avoid when: Full rich-text or markdown rendering → MarkdownViewer
- related: SearchInput, Table · patterns: DataTable, FormResults
- spec: [components/HighlightText.md](components/HighlightText.md)

### Input  ·  since 1.3.0
Standard text input supporting plain text, email, password, number, tel, url, and multiline (textarea) variants, with optional prefix/suffix slots and error state.
- intents: `input`, `text input`, `text field`, `textarea`, `multiline`, `email`, `password`, `number`, `form control`, `prefix`, `suffix`, `search field`, `field`, `controlled input`
- use when: Collecting freeform text from the user in a form
- use when: Needing a multiline textarea (set multiline=true)
- use when: Showing an inline icon or unit prefix/suffix inside the input
- avoid when: Search-specific UX with clear button → SearchInput
- avoid when: Choosing from a fixed list → Dropdown or CheckboxGroup
- related: FormGroup, Dropdown, SearchInput, CheckboxGroup · patterns: Form
- spec: [components/Input.md](components/Input.md)

### Legend  ·  since 0.2.0  ·  experimental
Compact token-colour legend that can be static or toggle a selected item set.
- intents: `legend`, `key`, `swatch`, `color key`, `filter legend`, `toggle legend`, `categories`
- use when: Explaining token-coloured categories beside a chart, event lane, or trace
- use when: Letting users show or hide categories without building custom legend buttons
- avoid when: Choosing exactly one mode → SegmentedControl
- avoid when: Showing status text without category filtering → StatusBadge
- ⚠ Swatch colors are CSS custom-property names, never resolved colors or hex values.
- related: EventLanes, Chip, SegmentedControl, StatusBadge · patterns: AgentActivity, Chart
- spec: [components/Legend.md](components/Legend.md)

### MarkdownMinimap  ·  since 1.0.0
Canvas-based minimap (overview scrollbar) for a long-form scrollable markdown container. Draws a block silhouette of headings and content, overlays the current viewport, and lets the user click or drag to scroll.
- intents: `minimap`, `overview`, `scrollbar`, `canvas`, `scroll indicator`, `document map`, `navigation`, `long document`, `outline`, `viewport`, `scroll position`, `markdown nav`
- use when: Providing a bird's-eye navigation control alongside a long markdown document
- use when: Users need to jump to arbitrary scroll positions quickly
- avoid when: Heading-based jump navigation is sufficient → use MarkdownViewer with outline=true
- ⚠ Requires a React ref to the scrollable markdown container it controls; it reads scroll position and heading layout from that element.
- related: MarkdownViewer, SplitPane, Panel · patterns: MarkdownViewer
- spec: [components/MarkdownMinimap.md](components/MarkdownMinimap.md)

### MarkdownViewer  ·  since 1.0.0
Lightweight safe markdown renderer with an opt-in CommonMark/GFM plugin pipeline.
- intents: `markdown`, `markdown viewer`, `gfm`, `github flavored markdown`, `syntax highlight`, `mermaid`, `katex`, `math`, `outline`, `minimap`, `document viewer`, `rich text`, `code block`, `alert`
- use when: Rendering markdown documents with headings, code blocks, or tables
- use when: A long document needs heading-based navigation (outline) or a scroll minimap
- use when: Displaying agent-generated or user-authored markdown content
- avoid when: Plain unstyled text display — use a plain element
- avoid when: Only syntax highlighting is needed → CodeBlock
- ⚠ Requires markdown-content.css imported at the feature level: @import "@codesweep-ai/ui/styles/markdown-content.css" Without this, headings, tables, code blocks, and alerts render unstyled.
- related: MermaidDiagram, MarkdownMinimap, CodeBlock, Skeleton · patterns: MarkdownViewer
- spec: [components/MarkdownViewer.md](components/MarkdownViewer.md)

### MermaidDiagram  ·  since 1.0.0
Renders a Mermaid diagram from a source string. Theme-aware (re-renders on data-theme change) and shows a friendly error block with raw source if the diagram fails to parse.
- intents: `mermaid`, `diagram`, `flowchart`, `sequence diagram`, `gantt`, `graph`, `chart`, `uml`, `visualization`, `dsl`, `svg diagram`, `architecture diagram`, `flow diagram`, `sketch`, `hand-drawn`, `roughjs-style`
- use when: Rendering a Mermaid DSL string as an SVG diagram
- use when: Embedding diagrams inside a MarkdownViewer via a fenced code block
- use when: Showing an agent-architecture diagram in the hand-drawn motif (sketch={true})
- avoid when: General chart/data visualization → ChartFrame
- avoid when: Static SVG or image → use an img/svg element directly
- ⚠ Mermaid's securityLevel is "loose" — treat the chart prop as trusted input and sanitize before passing user-submitted Mermaid source.
- related: MarkdownViewer, ChartFrame · patterns: MarkdownViewer
- spec: [components/MermaidDiagram.md](components/MermaidDiagram.md)

### Modal  ·  since 1.0.0
Dialog overlay for confirmations, forms, or detail views. Provides a backdrop, scrollable content area, header with close button, and optional footer actions.
- intents: `modal`, `dialog`, `overlay`, `popup`, `lightbox`, `confirm`, `confirmation`, `alert dialog`, `drawer`, `sheet`, `portal`, `focus trap`, `backdrop`, `dismiss`
- use when: Asking for user confirmation before a destructive or irreversible action
- use when: Presenting a form or detail view without navigating away
- use when: Blocking the background while the user completes a focused task
- avoid when: Inline expandable content → Panel or Card
- avoid when: Persistent side panel → Panel or SplitPane
- related: Button, Panel
- spec: [components/Modal.md](components/Modal.md)

### Panel  ·  since 1.0.0
Collapsible side panel with a header and scrollable content area. Used for file trees, doc outlines, and filter panels inside flex layouts.
- intents: `panel`, `sidebar`, `collapsible`, `side panel`, `pane`, `drawer`, `filter panel`, `file tree panel`, `outline`, `collapse`, `expand`, `header`, `layout`
- use when: Providing a collapsible sidebar alongside main content in a flex layout
- use when: Wrapping a Tree, SectionedTree, or filter controls in a titled panel
- use when: Building a two- or three-column layout with SplitPane
- avoid when: Full-screen overlay → Modal
- avoid when: Simple card container without collapse → Card
- related: SplitPane, Tree, SectionedTree, Card · patterns: Explorer, MasterDetail, Dashboard
- spec: [components/Panel.md](components/Panel.md)

### PulseBadge  ·  since 1.4.0
Small pulsing dot that signals live, in-progress activity.
- intents: `pulse`, `badge`, `dot`, `live`, `activity`, `animated`, `indicator`, `status dot`, `pulsing`, `real-time`, `streaming`, `agent activity`
- use when: Indicating that an agent or process is running
- use when: Decorating a label with a live-activity signal, as AgentStatus does
- avoid when: Unread / notification count → StatusBadge
- avoid when: Multiple simultaneous live signals in one viewport (one pulse per panel only)
- related: AgentStatus, StreamingText, AgentTrace, StatusBadge · patterns: AgentActivity
- spec: [components/PulseBadge.md](components/PulseBadge.md)

### RadioGroup  ·  since 0.2.0  ·  experimental
Exclusive choice among two or more options, each able to carry a description.
- intents: `radio`, `radio group`, `radiogroup`, `exclusive options`, `single select`, `choice`, `mode`
- use when: Choosing one of several mutually exclusive options that each need explaining
- use when: More options than SegmentedControl accepts, or options too long for a compact toolbar
- use when: The choice is the subject of the view rather than a control on it
- avoid when: Two to five short labels in a compact toolbar → SegmentedControl
- avoid when: Many values where the options need not stay visible → Dropdown
- avoid when: Options that are not mutually exclusive → CheckboxGroup
- related: SegmentedControl, CheckboxGroup, Dropdown, FormGroup · patterns: MarkdownViewer
- spec: [components/RadioGroup.md](components/RadioGroup.md)

### SearchInput  ·  since 1.0.0
Integrated search bar with inline search button, clear button, and optional auto-search after a character threshold.
- intents: `search`, `input`, `filter`, `query`, `search bar`, `autocomplete`, `debounce`, `clear`, `find`, `lookup`, `search field`, `text input`
- use when: Providing a standalone search bar that fires a query callback
- use when: Auto-searching as the user types past a character threshold
- use when: Showing an inline no-results message below the input
- avoid when: Search lives inside a Table or container that already has its own empty state → use the container's emptyMessage
- related: Input, FormGroup, Table · patterns: Form, FormResults
- spec: [components/SearchInput.md](components/SearchInput.md)

### SectionedTree  ·  since 1.0.0
Self-managing component that renders multiple independent tree sections with collapsible headers, per-section search, and shared selection.
- intents: `sectioned tree`, `grouped tree`, `file explorer`, `multi-section`, `collapsible`, `sidebar`, `navigation`, `tree groups`, `project files`, `dependencies`, `explorer`
- use when: Showing multiple independent tree groups, such as project files and dependencies
- use when: Explorer-style sidebar with collapsible named sections
- use when: Shared single-selection across multiple tree groups
- avoid when: Single flat tree without grouping → Tree
- avoid when: Static program structure without grouping → Tree
- related: Tree, SearchInput, HighlightText, SplitPane · patterns: Explorer, MasterDetail
- spec: [components/SectionedTree.md](components/SectionedTree.md)

### SegmentedControl  ·  since 0.2.0  ·  experimental
Compact radiogroup for choosing one of two to five adjacent options.
- intents: `segmented control`, `radio group`, `view switcher`, `mode toggle`, `exclusive options`
- use when: Switching between two to five mutually exclusive views or render modes
- use when: Keeping a small mode choice visible in a compact toolbar
- avoid when: Toggling independent filters → Chip
- avoid when: More than five values, or options needing a description → RadioGroup
- avoid when: Many values that need not stay visible → Dropdown
- related: RadioGroup, Chip, Dropdown, Legend · patterns: DataTable, FormResults
- spec: [components/SegmentedControl.md](components/SegmentedControl.md)

### Skeleton  ·  since 1.1.0
Primitive shimmer placeholder for loading states — indicates where content will appear without a generic spinner.
- intents: `skeleton`, `loading`, `shimmer`, `placeholder`, `spinner alternative`, `content placeholder`, `loading state`, `pulse`, `rect`, `circle`, `text placeholder`
- use when: Filling space where async content is loading
- use when: Building component-level loading states (tables, cards, lists)
- use when: Inline text placeholders while a value loads
- related: Table, Card, CardGroup · patterns: ComponentStates
- spec: [components/Skeleton.md](components/Skeleton.md)

### SplitPane  ·  since 1.0.0
Container with two or three resizable panes separated by drag handles, with optional per-pane width persistence.
- intents: `split pane`, `resizable`, `drag handle`, `layout`, `panels`, `two-column`, `three-column`, `side by side`, `resize`, `master detail`, `panel layout`, `persistent width`
- use when: Two- or three-column layouts where the user should control pane widths
- use when: File explorer + detail view side-by-side
- use when: Any layout that needs persistent resizable panels
- ⚠ SplitPane uses height: 100%, so its parent must have a defined height. In full-viewport layouts this happens naturally; in page layouts wrap SplitPane in a container with an explicit height, such as h-96.
- related: Panel, SectionedTree, Tree · patterns: MasterDetail, Explorer
- spec: [components/SplitPane.md](components/SplitPane.md)

### StatusBadge  ·  since 1.0.0
Small static indicator for status values with a colored dot and uppercase label.
- intents: `status badge`, `badge`, `indicator`, `success`, `warning`, `error`, `neutral`, `dot`, `label`, `state indicator`, `tag`, `chip`, `status label`
- use when: Displaying a discrete status value (success / warning / error / neutral)
- use when: Labelling an item's current state in a table, card, or list row
- avoid when: Live pulsing activity signal → PulseBadge
- related: PulseBadge, Table, Card · patterns: ComponentStates
- spec: [components/StatusBadge.md](components/StatusBadge.md)

### StreamingText  ·  since 1.4.0
Live-rendered plain text that reveals characters at a configurable speed with a blinking trailing cursor, for streaming model output.
- intents: `streaming text`, `typewriter`, `token stream`, `live text`, `model output`, `llm output`, `character reveal`, `cursor`, `animated text`, `streaming`, `real-time`, `chat output`
- use when: Rendering token-by-token model output as it streams from the backend
- use when: Showing live plain-text output below an AgentStatus row
- avoid when: Static or completed markdown content → MarkdownViewer
- avoid when: Rendering inside a Modal (streaming output must not block UI)
- related: AgentStatus, AgentTrace, PulseBadge, MarkdownViewer · patterns: AgentActivity
- spec: [components/StreamingText.md](components/StreamingText.md)

### Table  ·  since 1.0.0
Data table with sortable columns, filtering, pagination, and async states.
- intents: `table`, `grid`, `data table`, `tabular`, `rows`, `columns`, `sortable`, `sort`, `filter`, `search`, `paginate`, `pagination`, `list view`, `spreadsheet`, `dataset`
- use when: Displaying rows of structured data across multiple columns
- use when: You need sorting, client-side filtering, or pagination
- avoid when: A flat single-column list → SectionedTree
- avoid when: Hierarchical / nested data → Tree or SectionedTree
- related: SectionedTree, Tree, SearchInput, Dropdown, StatusBadge, HighlightText · patterns: DataTable, Explorer, MasterDetail
- spec: [components/Table.md](components/Table.md)

### ThemeToggle  ·  since 1.0.0
Button or radio-group control for cycling through theme modes (system, light, dark), with localStorage persistence.
- intents: `theme toggle`, `dark mode`, `light mode`, `color scheme`, `theme switcher`, `appearance`, `system theme`, `mode toggle`, `dark light`, `preferences`, `ui theme`
- use when: Letting users switch between light, dark, and system color schemes
- use when: Placing a theme control in the app header or settings panel
- related: AppShell
- spec: [components/ThemeToggle.md](components/ThemeToggle.md)

### Toast  ·  since 1.11.0
Single transient notification — feedback for an action that auto-dismisses, with a colored variant + screen-reader announcement.
- intents: `toast`, `notification`, `snackbar`, `alert`, `feedback`, `transient`, `popup`, `success message`, `error message`, `status`, `dismiss`, `announce`, `sr-only`, `aria-live`, `role status`, `role alert`
- use when: Confirming an action completed ("Saved", "Copied")
- use when: Reporting a recoverable error ("Couldn't save — retry")
- use when: Surfacing a background event without blocking the user
- avoid when: The user must respond before continuing — use a Modal / Dialog instead
- avoid when: The message is persistent / structural — use an inline Alert / Banner
- related: ToastContainer
- spec: [components/Toast.md](components/Toast.md)

### ToastContainer  ·  since 1.11.0
Host for the toast system — mount once at the app root and call `toast.success(...)` etc. from anywhere.
- intents: `toast`, `notifications`, `snackbar`, `container`, `host`, `root`, `stacking`, `bottom-right`, `auto-dismiss`, `imperative api`, `pub sub`, `store`, `feedback layer`
- use when: Adding the global toast / notification system to an app — mount once at root
- avoid when: You need persistent / structural messaging — use an inline Alert / Banner
- avoid when: You need a blocking dialog — use a Modal
- related: Toast
- spec: [components/ToastContainer.md](components/ToastContainer.md)

### Tree  ·  since 1.0.0
Hierarchical tree view with expand/collapse, selection, search/filter, and optional drag-to-reorder.
- intents: `tree`, `hierarchy`, `file tree`, `expand collapse`, `treeview`, `navigation`, `folder`, `nodes`, `filterable`, `search tree`, `drag reorder`, `file browser`, `ast`
- use when: Displaying a hierarchical data structure (file system, AST, module graph)
- use when: Navigating nested nodes with expand/collapse and selection
- use when: Searchable/filterable tree within a panel or sidebar
- avoid when: Multiple grouped tree sections → SectionedTree
- related: SectionedTree, HighlightText, SearchInput, SplitPane · patterns: Explorer, MasterDetail
- spec: [components/Tree.md](components/Tree.md)

## Patterns

### AgentActivity  ·  since 1.4.0
Visual language for surfacing real-time AI agent work — in-flight, paused, and settled states.
- intents: `agent activity`, `ai agent`, `streaming output`, `real-time progress`, `agent status`, `live work`, `agent trace`, `step history`, `in-flight`, `agentic ui`
- use when: An AI agent is actively doing work the user should be able to observe
- use when: Showing a history of completed agent steps alongside a live current step
- use when: Replacing a generic spinner with a specific verb-phrase about what the agent is doing
- avoid when: Dense event sequences on a shared axis → EventLanes
- avoid when: Static, non-animated state labels → StatusBadge
- avoid when: Unknown async wait without agent involvement → Skeleton
- related: AgentStatus, AgentTrace, EventLanes, PulseBadge, StreamingText, StatusBadge, Skeleton
- spec: [patterns/AgentActivity.md](patterns/AgentActivity.md)

### Chart  ·  since 1.5.0
Theme-aware chart bridge for d3, recharts, and any other library — routes all colors through design-system tokens.
- intents: `chart`, `data visualization`, `themed chart`, `d3`, `recharts`, `chart colors`, `dark mode chart`, `chart theming`, `categorical palette`, `chart tooltip`
- use when: Building any chart that must respect light/dark theme switching
- use when: Using d3 or a declarative library and needing colors from the design-system token palette
- use when: Wrapping a chart in consistent loading, empty, and error states
- avoid when: Single static metric display → Card
- avoid when: Dashboard-level layout with filters → Dashboard
- ⚠ useChartTheme() and assignSeriesColors() are lib utilities, not components — they are not in the `related` list. Always depend your draw effect on the returned theme object (useEffect(draw, [theme])) so charts re-render on light/dark toggle.
- related: ChartFrame, ChartTooltip
- spec: [patterns/Chart.md](patterns/Chart.md)

### ComponentStates  ·  since 1.0.0
Canonical empty, loading, and error state contract for every component that renders async data.
- intents: `loading state`, `empty state`, `error state`, `async data`, `skeleton`, `retry`, `component states`, `loading skeleton`, `empty message`, `error handling`
- use when: Adding a new component that fetches or streams data
- use when: Ensuring consistent loading/empty/error UI across the app
- use when: Consumers need override props for empty messages, retry callbacks, or error copy
- avoid when: Pure client-side/static components with no async data → no state props needed
- related: Skeleton, Button, Table, Tree, SectionedTree, MarkdownViewer, Dropdown, SearchInput, Card
- spec: [patterns/ComponentStates.md](patterns/ComponentStates.md)

### Dashboard  ·  since 1.0.0
Stats bar, filterable chart, and optional sidebar for summarizing and exploring aggregate data.
- intents: `dashboard`, `metrics`, `stats bar`, `chart filter`, `kpi`, `data summary`, `analytics page`, `filterable chart`, `aggregate view`, `overview page`
- use when: Showing high-level metrics alongside a chart visualization
- use when: Letting users filter a dataset and see the chart update in real time
- avoid when: Single metric display → Card with a large number
- avoid when: Drill-down or hierarchical detail → Explorer or MasterDetail
- related: Card, CardGroup, CheckboxGroup, ChartFrame, ChartTooltip
- spec: [patterns/Dashboard.md](patterns/Dashboard.md)

### DataTable  ·  since 1.0.0
Full-featured table with filtering, sorting, pagination, and search highlighting for large flat datasets.
- intents: `data table`, `table`, `sortable table`, `paginated table`, `search table`, `filter table`, `list view`, `registry`, `audit log`, `inventory`, `tabular data`
- use when: Displaying a large flat dataset (10+ rows) with search and pagination
- use when: Package registries, user lists, audit logs, or inventory pages
- use when: Columns contain mixed content (text, badges, numbers) that needs per-column search
- avoid when: Hierarchical or nested data → Explorer
- avoid when: Each row needs rich detail on click → MasterDetail
- avoid when: Small datasets under 10 rows → plain Table without filter/pagination
- related: Table, HighlightText, StatusBadge, SearchInput, Dropdown
- spec: [patterns/DataTable.md](patterns/DataTable.md)

### Explorer  ·  since 1.0.0
Tree sidebar with resizable content pane for browsing and navigating hierarchical data structures.
- intents: `explorer`, `file tree`, `tree sidebar`, `hierarchical navigation`, `split pane`, `document browser`, `file browser`, `nested navigation`, `sidebar tree`, `tree view`
- use when: Browsing file trees, documentation structures, or package hierarchies
- use when: Items are in a parent/child hierarchy and selecting a leaf shows detail content
- use when: Multiple independent tree groups in one sidebar, such as project files and dependencies
- avoid when: Flat lists with no nesting → MasterDetail
- avoid when: Fewer than ~10 items total → simple list or Dropdown
- related: SplitPane, Panel, Tree, SectionedTree, Card, CardGroup, SearchInput
- spec: [patterns/Explorer.md](patterns/Explorer.md)

### Form  ·  since 1.3.0
Composition rules for form fields — layout, validation, submit placement, and error-summary patterns.
- intents: `form`, `form layout`, `field validation`, `form group`, `input`, `submit button`, `error summary`, `form validation`, `accessible form`, `form pattern`
- use when: Building any form with one or more user-editable fields
- use when: Needing consistent validation UX (blur-first, on-change-after-blur, on-submit)
- use when: Forms with more than 5 fields that need an error summary block
- avoid when: Read-only data display → Table, Card, or MasterDetail
- related: FormGroup, Input, Button, Dropdown, CheckboxGroup
- spec: [patterns/Form.md](patterns/Form.md)

### FormResults  ·  since 1.0.0
Pinned search/filter form at top with scrollable result cards below for query-driven workflows.
- intents: `search results`, `search page`, `form results`, `query results`, `code search`, `filter results`, `find page`, `search interface`, `result cards`, `query-driven`
- use when: Search interfaces where the user provides criteria and gets a list of results
- use when: Any workflow with a distinct input step followed by a results step (find, filter, generate)
- avoid when: Always-visible data that requires no query → Dashboard or MasterDetail
- avoid when: Single-result lookups → Card with loading state
- related: Card, SearchInput, HighlightText, Dropdown, StatusBadge, CodeBlock
- spec: [patterns/FormResults.md](patterns/FormResults.md)

### MarkdownViewer  ·  since 1.0.0
Document browser with outline navigation, minimap, and rich markdown rendering for in-app documentation.
- intents: `markdown viewer`, `document browser`, `markdown renderer`, `outline navigation`, `minimap`, `documentation`, `readme viewer`, `spec viewer`, `doc browser`, `in-app docs`
- use when: Rendering documentation, specs, or help content in-app
- use when: Building a document browser with file tree navigation
- use when: Showing README or changelog files alongside code
- avoid when: Plain text display without headings → simple pre or paragraph
- avoid when: Short snippets where outline adds no value
- avoid when: Editing markdown → read-only viewer only
- related: MarkdownViewer, MarkdownMinimap, SplitPane, Panel, Tree, Card, CardGroup
- spec: [patterns/MarkdownViewer.md](patterns/MarkdownViewer.md)

### MasterDetail  ·  since 1.0.0
Sortable list or table on one side with a detail pane on the other for inspecting individual records.
- intents: `master detail`, `list detail`, `record detail`, `split view`, `row selection`, `detail pane`, `inspect record`, `two panel`, `table detail`, `side panel`
- use when: Browsing a flat list of records where each record has rich detail
- use when: Any table where clicking a row shows more information without navigating away
- avoid when: Deep or arbitrary-depth hierarchies → Explorer
- avoid when: Data that fits entirely in table cells → plain Table
- avoid when: Nested drill-down more than 3 levels → Explorer
- related: SplitPane, Table, Card, StatusBadge, CodeBlock, HighlightText
- spec: [patterns/MasterDetail.md](patterns/MasterDetail.md)
