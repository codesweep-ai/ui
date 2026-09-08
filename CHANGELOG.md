# Changelog

What a consumer upgrading between versions has to act on. Every entry says
what changed and what to do about it, and nothing here restates a change that
asks nothing of a reader.

Each published build's README links back to the commit it was built from, so
this file describes the version you installed rather than whatever `main`
holds today.

## 0.3.0

Not published yet. The props below are marked `since: 0.3.0` in their
specifications, and `package.json` still reads `0.2.0` until a release is cut.

### Breaking changes

- `MarkdownMinimap` takes `content: HTMLElement | null` where it took
  `contentRef`. A ref object no longer type-checks, so this fails a build
  rather than failing quietly.
- `SectionedTree` widens `expandAllControl` to
  `boolean | "sections" | "trees"`, and `false` now removes both kinds of
  control. It used to leave the one above the sections in place, which no prop
  could remove. See [components/SectionedTree.md](components/SectionedTree.md).
- `Table` gives its truncation tooltip text rather than the cell's own nodes.
  A cell that renders elements used to appear a second time inside the bubble.
  Give the column a `tooltip` accessor, or `wrap: true` where the column is not
  really text. See [components/Table.md](components/Table.md).

### Changed behaviour

- A component's stylesheet now imports the stylesheets of the components it
  renders. Loading `card.css` brings `tooltip.css` with it, so a consumer
  loading per-component sheets no longer has to work out what a component
  composes.
- `MarkdownViewer` in `inline` mode still needs its own stylesheet. The root
  drops its class there, which makes the sheet look unnecessary, and the
  scroller keeps one rule that matters inside a flex row.
- A `Table` truncation tooltip opens on keyboard focus as well as hover. It was
  a native `title` before, which never reached a keyboard user.
- `Tree` defaults `labelOverflow` to `"truncate"` and `scrollSelectedIntoView`
  to `true`.
- `Tree` renders its expand-all control without `filterable`. Both used to sit
  in one toolbar that `filterable` gated, so passing `onToggleExpandAll` alone
  rendered nothing.
- `AppShell` stacks its header below `48rem`.
- Four parser fixes change rendered markdown for the same input. Single-marker
  emphasis now renders as italic, triple markers agree between the two parsers,
  and `<` inside code is no longer over-escaped. Four or more markers still
  disagree.

### Added

- `Page` is the container a page's content sits in. It owns the inset from the
  window edge, how wide content may grow, and which element scrolls. Section 2
  of [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) named this layout mode
  before anything rendered it. A hand-rolled `<main>` inside `AppShell` stays
  supported. See [components/Page.md](components/Page.md).
- `Tooltip` renders a bubble on hover and on keyboard focus, and several
  components now compose it. See [components/Tooltip.md](components/Tooltip.md).
- `TableColumn.tooltip` names the text for a truncated cell. It falls back to
  `searchValue`, and then to the plain text inside the cell.
- A development-only warning names any bounded ancestor that clips a
  component's content without scrolling it. Section 7.11 of
  [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) has both ways to answer it.
  A consumer's own bundler strips the check from a production build.
- `catalog.json` ships in the package. It carries the same index as
  [CATALOG.md](CATALOG.md), as data, so an install can search components by
  intent without reaching the repository.
