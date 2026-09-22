# Changelog

What a consumer upgrading between versions has to act on. Every entry says
what changed and what to do about it, and nothing here restates a change that
asks nothing of a reader.

Each published build's README links back to the commit it was built from, so
this file describes the version you installed rather than whatever `main`
holds today.

## Unreleased

### Breaking changes

- A `?theme=` parameter no longer outranks a mode the reader chose. It seeds
  the theme until they choose for themselves, and their choice then holds for
  the rest of the tab, across remounts and reloads. It used to be re-read every
  time the shared store gained its first caller, so a route change, or React's
  strict mode, put the seed back over a choice that was already saved. A seed
  whose value differs from the one last applied still seeds, so a link carrying
  a different theme keeps working. The visit is recorded under two
  `sessionStorage` keys, `<storageKey>:chosen` and `<storageKey>:seed`, and
  `themeBootScript` reads them too, so a reload does not flash the seed's
  colour. A consumer who wants the old behaviour has no switch for it; say so
  if you need one.
- `FormGroup` no longer wires a child it cannot see is a control. It clones a
  native `input`, `select` or `textarea`, and an element already marked
  `role="group"` or `role="radiogroup"`. A component child, or a plain wrapper,
  is left alone and reads the wiring from the new `useFormGroupField()` hook
  instead. It used to clone any single element child, which is how
  `aria-describedby` came to point at a `<div>` that announces nothing, and how
  `required` came to sit on one, where it is not a valid attribute. A consumer
  wrapping their own control in a `FormGroup` takes the wiring from the hook:
  `id`, `describedBy`, `invalid` and `required`, to put where they belong. A
  bare native control needs no change.
- The first six `--color-cat-*` slots have new values in both themes. Every
  adjacent pair now separates by at least 15 for a reader with full colour
  vision. Three pairs in the dark theme and two in the light one sat below that
  floor, the worst at 12.1. The hues are still blue, teal, amber, rose, violet
  and orange. Mean chroma rose by about one and a half per cent, so the muted
  character the colour review chose survives. A chart drawn with these slots
  looks slightly different, and nothing needs doing unless a consumer
  hard-coded the old values. Slots seven to ten have not moved.
- `--color-cat-*` holds to six slots rather than ten. Its values have not
  moved, and slots seven to ten still resolve to the colours they always did.
  What they no longer carry is the promise that a reader can tell them apart.
  Past six, adjacent hues sit too close, so a chart with more than six series
  takes `theme.graph` or folds the remainder. It is filed as breaking rather
  than as changed behaviour, because a consumer drawing seven series has lost a
  guarantee this package gave them. Nothing they render today looks any
  different. Section 4.12 of
  [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) states what each palette holds
  to, and what to do at nine categories.

### Fixed

- `EventLanes` reads padding on its scroller. The viewport used to be the
  scroller's `clientWidth`, padding included, so a padded scroller held an axis
  wider than its content box, which scrolled by the padding and let the canvas
  ride along with it, and the overview's zero sat left of the ruler's by the
  same amount. A page that kept the two aligned with a margin on each can keep
  the margin or move to a padding.
- `EventLanes` warns in development when a lane's `height` is under 8 pixels,
  the least a row can draw, and names the floor in the prop's TSDoc. The row
  used to fall back to 28 pixels with nothing said, and a page that had asked
  for a 6-pixel row found everything below it 22 pixels lower than it had
  measured.
- `EventLanes` fits a requested `view` between its boundary paddings, and keeps
  a mark size of room after the last position. A view of the whole extent used
  to be fitted to the full viewport with the padding added on top, so the axis
  ran wider than the viewport and the last mark hung over its edge. A page that
  asked for a view slightly longer than its data to hide this can ask for the
  data's range. `onViewChange` reports the range between the paddings, so a
  report handed back as a request still asks for what is shown.
- `EventLanes` no longer lets its tooltip be cut off or squeezed. It was
  placed inside the component, so an ancestor that hides its overflow, such as
  a `Card`, clipped it, and near the right edge it wrapped word by word into a
  narrow column. It is now portalled to the body and placed in the window, as
  `Tooltip` is. A consumer styling the tooltip through the component's own
  subtree should know it now renders outside it.
- `catalog.json` can be imported. It has always shipped, and the README has
  always sent a reader to it, but it was missing from the `exports` map, so
  `@codesweep-ai/ui/catalog.json` answered `ERR_PACKAGE_PATH_NOT_EXPORTED` and
  the only route to it was a path into `node_modules`. This affected 0.3.0 as
  published.
- `Dropdown` and `CheckboxGroup` announce their helper and error text. Both
  wrap their control, so `FormGroup` put `aria-describedby` on that wrapper: a
  `<div>` with no role, which a screen reader does not announce. The message
  was on the page and reached nobody. `Dropdown` now points its `<select>` at
  it, and `CheckboxGroup`'s container is `role="group"` with the label as its
  accessible name. `Dropdown` also stops putting `required` and `aria-invalid`
  on its wrapper, both of which its `<select>` already carried.
- The version annotations name 0.3.0, the release they shipped in. Every `since`
  in `catalog.json` named a 1.x line this package never published, and 33
  `Added vX.Y.Z` notes in the documentation and in TSDoc named the same line.
  Two agents reading an installed copy each concluded the version fields could
  not be trusted, and advised ignoring them. A new check, `check:versions`,
  fails any annotation naming a version above the one in `package.json`.
- `useChartTheme` restyles a chart when the theme changes. Every caller of
  `useTheme` used to hold a private copy of the mode, so a chart kept whatever
  theme it mounted in while the toggle moved everything else. A consumer who
  worked around it by putting `var(--token)` in the SVG can keep doing so, and
  no longer has to.
- The header's nav wraps at any width rather than only below the breakpoint,
  and a nav label no longer breaks across lines. A crowded nav used to run past
  the right edge, where the shell's `overflow: hidden` clipped it with no
  scrollbar to reach it. See [components/AppShell.md](components/AppShell.md).
- `catalog.json` ships with each `spec` as an absolute URL pinned to the commit
  the build came from, and `homepage` is pinned the same way. Both used to
  point at paths and branches the installed package does not carry.

### Added

- `EventLanes` takes `wheelZoom={false}` to leave a Ctrl or Cmd wheel, and a
  pinch, to the browser. The plain wheel still scrolls the axis sideways.
- An `EventLanes` lane can carry a `shade` token and a `gapBefore`. The shade
  is a band behind the lane from the gutter to the end of the axis, and
  neighbouring lanes with the same token form one band. The gap is empty space
  above the lane. Together they let a member's rows read as one band, with a
  gap before the next member. While any lane is shaded the gutter's background
  is transparent, so the band shows through it.
- `EventLanes` takes `overviewPlacement="above"` to put the overview above the
  ruler and the lanes. It sits below them by default, as before.
- `EventLanes` has a positioned layout. With `layout="position"`, each event
  sits at its `position` on a scale the consumer chooses, such as seconds, so a
  long step takes a long stretch of the axis. A mark is as wide as the gap to
  the next one in its timeline, and lanes naming one `group` share that
  timeline. `view` and `onViewChange` set and report the visible range, and the
  wheel zooms and scrolls. Spans draw as boxes with a label and a trailing
  segment, `links` join marks across lanes, and the ruler receives the scale.
  A lane can be `hidden` without moving the marks beside it. The index layout
  is unchanged, and a timeline that sets none of this draws exactly as before.
- `EventLanes` can draw a lane's events as bars sized by a `magnitude` from 0
  to 1, rising from the row's floor or hanging from its top, with a notch for a
  value past the consumer's ceiling. Lanes can set their own `height`, the
  overview its `overviewHeight`, and `scrollbar="overview"` hides the lanes'
  scrollbar while the overview is there to scroll them. A lane with
  `overview: false` is left out of the overview. Every addition is optional,
  and a timeline that sets none draws exactly as before.
- A development warning when a chart's colour tokens resolve to nothing. An
  undefined custom property is not an error: `getPropertyValue` answers with an
  empty string, a mark drawn with `fill=""` is invalid, and the browser paints
  it black. A consumer met this across every graph view they had, with a clean
  typecheck, a clean build and nothing on the console. Importing
  `styles/components.css` without `styles/core.css` lands in the same place, and
  so does rendering a chart outside the element a scoped token sheet covers.
- A development warning when `FormGroup` renders without the wiring it exists
  to supply: a helper or error message that no control refers to, or a label
  with no `htmlFor` beside a single control. Both were silent, and both are the
  kind of defect an audit finds rather than a build. It is stripped from a
  production build by the same `process.env.NODE_ENV` guard the stylesheet
  warning uses.
- `Input`'s `error`, `CheckboxGroup`'s `label` and `StatusBadge`'s `announce`
  say in their TSDoc what they do and do not convey to assistive technology.
  The component documents carry the full contract and do not ship, so a
  consumer reading the type declarations had no account of it.
- `--color-graph-1` to `--color-graph-8` and `--color-graph-other`, a
  categorical ramp for charts where any pair of categories can meet: a
  node-link diagram, a scatter plot, a map, a small multiple. `useChartTheme()`
  exposes them as `theme.graph` and `theme.graphOther`.
- Every component in `CATALOG.md` and `catalog.json` names the specifier it is
  imported from. Six of the 38 sit behind a subpath rather than the root, and
  the index used to be silent about which, so a reader following it wrote the
  root import and learned otherwise from the compiler. In `catalog.json` the
  field is `import` and it holds a list, because `MarkdownViewer` is importable
  from both `@codesweep-ai/ui/markdown` and `@codesweep-ai/ui/markdown/rich`.

## 0.3.0

This release went out on 2026-09-09. It is the first tagged release, so a bare
`npm install` resolves here rather than to a development build.

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
