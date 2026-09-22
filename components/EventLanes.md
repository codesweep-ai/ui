---
name: EventLanes
status: experimental
since: 0.3.0
summary: Canvas-rendered events on a shared axis, placed by global index or by position on a continuous scale, with lanes, spans, links, zoom, overview navigation, token palettes, and an accessible virtual listbox.
keywords: [event lanes, event timeline, event strip, canvas timeline, trace events,
           agent events, multi-agent timeline, spans, overview, virtual listbox,
           time axis, zoom, positioned layout, links]
use_when:
  - Showing an ordered event stream on one or more named lanes
  - A dense trace needs thousands of selectable events without thousands of laid-out DOM marks
  - Related events need spans, linked highlighting, markers, or a shared ruler
  - A timeline on a time axis must show how long each step and each span took
avoid_when:
  - Showing chronological step details with expandable text → AgentTrace
  - Showing continuous numeric data → ChartFrame
related: [ChartTooltip, AgentTrace]
patterns: [AgentActivity]
note: >
  The palette accepts CSS custom-property names such as --color-cat-1, never
  resolved colors or hex values. EventLanes is canvas-rendered but exposes every
  visible event and span through a stable DOM census.
---

# EventLanes

> Canvas-rendered categorical events on a shared axis. One lane with 1,366 events and seven lanes with 73 events use the same renderer and interaction model. The positioned layout places the same events on a continuous scale instead, such as time.

`EventLanes` owns the event canvas, horizontal scrolling, optional overview, selection and linked-state drawing, hit-testing, keyboard navigation, and tooltip shell. Consumers own the data, token mapping, selected index, ruler content, and tooltip body.

## Prop contract

```tsx
import type { ReactNode } from "react";

type EventShape = "square" | "circle" | "hollow" | "hollow-circle" | "hatched";

/** A CSS custom-property name. The component resolves it with var(...). */
type EventToken = `--${string}`;

interface EventLane {
  /** Stable lane key referenced by events and spans. */
  id: string;
  /** Visible lane label and the lane name included in option announcements. */
  label: string;
  /** Optional tooltip for the visible lane label. */
  title?: string;
  /** Optional context included in event option announcements. */
  description?: string;
  /** Optional presentation hook for the visible lane label. */
  className?: string;
  /** Row height in CSS pixels. Default 28. */
  height?: number;
  /** Draw this lane's events as bars rising from the floor or hanging from the top. */
  bars?: "up" | "down";
  /** A bar's length at magnitude 0, in CSS pixels. Default: the mark size. */
  barFloor?: number;
  /** false leaves this lane out of the overview. Default true. */
  overview?: boolean;
  /** Positioned layout: lanes naming one group form one timeline. */
  group?: string;
  /** No height, no drawing, no keyboard stop; still counts for its timeline's widths. */
  hidden?: boolean;
  /** A band behind the lane in this token, from the gutter to the axis end. */
  shade?: EventToken;
  /** Empty space above the lane, in CSS pixels. */
  gapBefore?: number;
  /** Positioned layout: measure a mark's width against the next mark in the timeline (default) or in this lane. */
  widthBy?: "timeline" | "lane";
}

interface EventLaneEvent<K extends string = string> {
  /** Unique, non-negative integer on the shared global axis. */
  i: number;
  /** EventLane.id. */
  lane: string;
  /** Categorical key resolved through palette. */
  kind: K;
  shape: EventShape;
  /** Human-readable event name used by accessibility and the default tooltip. */
  label: string;
  /** Display-ready timestamp. Position still comes from i, not from time. */
  at: string;
  /** Draw the error overlay and include "error" in the accessible option. */
  error?: boolean;
  /** Draw a trailing boundary tick (for example, a turn boundary). */
  tick?: boolean;
  /** Short accessible label for an auxiliary marker (for example, "spawn"). */
  marker?: string;
  /** The marker's token. Default --color-accent. */
  markerToken?: EventToken;
  /** Permanent token-coloured ring, below linked and selected halos. */
  halo?: EventToken;
  /** 0 to 1: how far a bar reaches from its floor. Read only in a bars lane. */
  magnitude?: number;
  /** The value ran past the consumer's ceiling: draw the broken-bar notch. */
  clipped?: boolean;
  /** Positioned layout: where the mark begins, in the consumer's axis units. */
  position?: number;
  /** Positioned layout: the mark's length in axis units, drawn at its true width. */
  extent?: number;
  /** Positioned layout: which edge sits at position. Default "start". */
  anchor?: "start" | "end";
}

interface EventLaneSpan {
  /** Lane containing the connector; in the positioned layout, the timeline boxed. */
  lane: string;
  /** Inclusive global-index endpoints, or axis units in the positioned layout. */
  from: number;
  to: number;
  /** Positioned layout: identity for selectedSpan and onSelectSpan. */
  id?: string;
  /** Positioned layout: text drawn inside the box's top edge. */
  label?: string;
  /** Positioned layout: a trailing segment from `to` to this position. */
  trail?: number;
  /** The trailing segment's token. Default --color-warning. */
  trailToken?: EventToken;
}

interface EventLaneLink {
  /** Global indices of the two marks joined, in any lanes. */
  from: number;
  to: number;
  /** Default "solid". */
  style?: "solid" | "dashed";
  /** Heavier, in --color-link. */
  emphasized?: boolean;
}

interface EventLanesPositionContext {
  /** CSS pixels per axis unit. */
  scale: number;
  /** Smallest position in the data: the axis begins here. */
  origin: number;
  /** Largest position, extent end or span end in the data. */
  end: number;
  /** Axis units at the viewport's left and right edges. */
  visibleStart: number;
  visibleEnd: number;
  xForPosition: (position: number) => number;
  positionForX: (x: number) => number;
}

interface EventLanesView {
  start: number;
  end: number;
}

interface EventLanesViewState extends EventLanesView {
  /** CSS pixels per axis unit. */
  scale: number;
}

interface EventLanesRulerContext {
  /** Always zero: i is an absolute zero-based global coordinate. */
  start: 0;
  /** Greatest event index or span endpoint, or -1 for no data. */
  end: number;
  /** Current cell pitch in CSS pixels. */
  cellWidth: number;
  /** Width of the global axis in CSS pixels. */
  width: number;
  /** Center x-coordinate for a global index in the scrolling content. */
  xForIndex: (i: number) => number;
  /** Present in the positioned layout only. */
  position?: EventLanesPositionContext;
}

interface EventLanesProps<K extends string = string> {
  lanes: readonly EventLane[];
  events: readonly EventLaneEvent<K>[];
  spans?: readonly EventLaneSpan[];

  /** Kind → CSS custom-property name, for example user: "--color-cat-1". */
  palette: Record<K, EventToken>;

  /** Controlled selected global index. */
  selected?: number | null;
  /** Global indices related to the selected event. */
  linked?: ReadonlySet<number>;
  /** Kinds omitted from paint, hit-testing, tooltips, and keyboard navigation. */
  hiddenKinds?: ReadonlySet<K>;
  /** Indices to keep at full strength; all other visible events are dimmed. */
  emphasis?: ReadonlySet<number>;

  /** Horizontal cell pitch in CSS pixels. Default 10. Also sets the mark size. */
  cellWidth?: number;
  /** Default "index". "position" places each mark at its position. */
  layout?: "index" | "position";
  /** Positioned layout: the range to show, applied each time a new object is passed. */
  view?: EventLanesView;
  /** Positioned layout: fires whenever the scale or the visible range changes. */
  onViewChange?: (view: EventLanesViewState) => void;
  /** Positioned layout: false leaves the Ctrl or Cmd wheel to the browser. Default true. */
  wheelZoom?: boolean;
  /** Positioned layout: false leaves a plain vertical wheel to the page. Default true. */
  wheelScroll?: boolean;
  /** Lines joining pairs of marks, beneath the marks. */
  links?: readonly EventLaneLink[];
  /** Positioned layout: the id of the span drawn as selected. */
  selectedSpan?: string | null;
  /** Positioned layout: a click on a span's box where no mark is hit. */
  onSelectSpan?: (span: EventLaneSpan) => void;
  /** What the overview draws. Default "marks". */
  overviewContent?: "marks" | "spans" | "both";
  /** Default "auto": show only when the global axis overflows. */
  overview?: "auto" | boolean;
  /** Overview height in CSS pixels. Default 40. */
  overviewHeight?: number;
  /** Default "below" the lanes. "above" puts it above the ruler. */
  overviewPlacement?: "below" | "above";
  /** "overview" hides the lanes' scrollbar while the overview is shown. Default "native". */
  scrollbar?: "native" | "overview";

  /** Content aligned to the same global axis and horizontal scroll position. */
  ruler?: ReactNode | ((context: EventLanesRulerContext) => ReactNode);
  /** Sticky ruler-row label. Default: "Index". */
  rulerLabel?: string;
  /** Tooltip body; EventLanes renders it inside ChartTooltip. */
  renderTooltip?: (event: EventLaneEvent<K>) => ReactNode;

  /** Selection request from click, Enter/Space, or an arrow-selection move. */
  onSelect?: (event: EventLaneEvent<K>) => void;
  /** Fires only when the hit-tested pointer event changes; null on leave. */
  onHover?: (event: EventLaneEvent<K> | null) => void;

  /** Accessible name. Default: "Event timeline". */
  "aria-label"?: string;
  id?: string;
  className?: string;
}
```

All collection props are read-only. `EventLanes` never mutates a consumer-owned `Set` or array.

## Data model and invariants

### Global index

`i` is the event's coordinate, identity, selection value, and keyboard order. It is not the event's position in the `events` array. Events may arrive in any array order; `EventLanes` orders them by increasing `i`.

- Every event `i` must be a unique, non-negative integer across all lanes.
- Gaps are valid and render as empty cells. Consumers do not create placeholder events for them.
- `selected`, `linked`, and `emphasis` all contain global indices, not array offsets or lane-local positions.
- The axis extent is zero through the greatest event `i` or span endpoint. The scrolling width is `(end + 1) * cellWidth` plus equal boundary padding reserved for selection halos.
- `at` never determines x-position. This preserves the multi-lane profile's global event ordering while allowing its ruler to show true time.

This choice matches the multi-lane profile directly. The dense profile treats array position as its strip coordinate; it maps that position to `i` and retains any domain ID outside `EventLanes`.

### Lanes

`lanes` defines visible row order. Lane IDs are unique. Events and spans whose `lane` does not match a declared lane are invalid and are not painted or exposed as options. A lane with no events still renders its label and empty row so multi-agent layouts do not jump when filtering.

A lane is 28 pixels high unless it sets `height`, and lanes of different heights stack in order. The label beside a lane takes the same height, and hit-testing reads the row from the stacked heights. A lane with `gapBefore` sits that many pixels below the lane above it. The gap is empty: nothing is drawn in it, and a pointer in it hits nothing. A hidden lane keeps no gap.

### Bands

A lane with `shade` has a band behind it in that token, drawn from the left edge of the gutter to the right edge of the axis, so it runs under the lane's label, through whatever a page keeps between the gutter and the axis, and to the end of the row. Neighbouring lanes carrying the same token form one band, and a gap between them is left unshaded. Several lanes per member can therefore read as one band each, alternating from member to member, with the selected member's band in another token.

While any lane is shaded the gutter's own background is transparent, so the band shows through it. The band's top edge sits below the rows' top border. A page that changes that border's width sets `--event-lanes-band-inset` on `.cs-component-event-lanes-main` to match, as a length: `0rem` for no border, since a unitless zero is not one.

Lane labels are DOM text, not canvas pixels. They remain visible in a sticky leading gutter while the global axis scrolls horizontally. `title` supplies a [Tooltip](Tooltip.md) on hover or focus; `description` adds context to every event option announcement for that lane. The canvas rows, ruler, and overview begin after the same gutter and share the same x-coordinate system.

### Spans

A span connects the centers of `from` and `to` on one lane. Endpoints are inclusive, non-negative integers and `from <= to`; an endpoint does not have to contain an event. Spans render below event marks so cells remain hit-testable.

Spans use a two-tone token treatment: a `var(--bg)` casing below a `var(--fg)` stroke. They are not pointer or keyboard targets because the contract has no span callback or label. At an active event, its virtual option announces any span endpoints involving that index (for example, “span from 12 to 20”). Hidden event kinds do not hide spans; a blind mode hides event marks, not open→reply relationships.

### Palette

`palette` maps every kind to a CSS custom-property **name**, not to a resolved color:

```tsx
const palette = {
  user: "--color-cat-1",
  assistant: "--color-cat-2",
  tool: "--color-cat-3",
  thinking: "--color-cat-5",
} as const;
```

The component resolves values as `var(--color-cat-N)` at paint time and repaints when the active theme changes. Hex, rgb/hsl strings, and resolved `useChartTheme()` colors are outside the contract. This lets a consumer delete its own colour module and replace its kind color table with semantic token names. A runtime kind without a palette entry uses `var(--muted)` and emits a development warning.

An event's `kind` is its filter identity. Do not collapse distinct kinds merely because they share a presentation color or shape; map kinds to presentation through `palette` and `shape` at paint time so hiding one kind cannot hide another accidentally.

**And the converse, which is easier to miss.** Collapsing two kinds onto one colour is fine, and often right: not every kind deserves a categorical hue, and structural events read better receding to neutral ink than competing with the ones carrying content. `--color-structural` exists as a second neutral step for exactly that, one move further from the foreground than `--muted`, so a consumer with several structural kinds can separate them without reaching for a hue.

But if a legend then **lists those kinds separately**, it promises a distinction the colour does not deliver: two labels, one swatch, and no way to tell which mark is which. Either give the kind its own value, or do not name it separately. The exception is a kind already identified by **shape** — an event drawn with a `tick` or a `hollow` mark is distinguishable without a colour of its own, and giving it one adds a swatch that carries no information.

## Visual contract

### Event marks

- `square`: filled token-colored square with the small design-system radius.
- `circle`: filled token-colored circle.
- `hollow`: transparent `var(--bg)` center with a token-colored square outline. The dense profile maps `redacted` to this shape; this existing geometry is unchanged.
- `hollow-circle`: transparent `var(--bg)` center with a token-colored circular outline. The multi-lane profile maps its hollow `accept` mark to this shape.
- `hatched`: a diagonal token-coloured hatch on `var(--bg)`, inside a one-pixel token outline. It reads as absence rather than as work, which is what a band of waiting is. The overview draws it filled, since a hatch has no room there.
- `error`: draws an error cross with `var(--color-error)` above the base shape. It does not replace the kind color.
- `tick`: draws a trailing `var(--fg)` vertical boundary bar at the event cell edge.
- `marker`: draws a small marker above the base shape, in `markerToken` or `var(--color-accent)` when there is none. The string is its accessible/tooltip label; dense canvases do not paint the marker text. A page that marks failed steps so they can be found at any zoom gives them `--color-error`.

Marks are centered in their `cellWidth` column and lane row. `cellWidth` is a finite positive number in CSS pixels; invalid values fall back to 10. Ten pixels is the dense profile's default. The multi-lane profile supplies 22 to preserve its ruler pitch and larger hit cells.

### Bar lanes

A lane with `bars` draws each of its events as a bar rather than a centred mark. The bar is the mark's width and grows along the row: from its bottom edge for `"up"`, from its top edge for `"down"`. Its length runs linearly from `barFloor` at `magnitude` 0 to the row's height less a 3-pixel inset at each end at `magnitude` 1. The consumer chooses the scale, such as a logarithm of a duration, and passes the fraction.

`barFloor` defaults to the mark size, so an event with no `magnitude` draws the square it would draw in any other lane, aligned to the lane's edge. A row sized for waiting might set it to 2, so a short value reads as a sliver rather than a square.

- `magnitude` is clamped to 0 through 1. An absent or non-finite value is 0.
- `clipped` draws the broken-bar notch at the bar's far end: a `var(--bg)` stripe just inside it and a `var(--fg)` cap just past it. It marks a value the consumer's ceiling cut short, and the tooltip is where the true value belongs.
- Every shape draws as a rectangle, both hollow shapes draw as a token outline on `var(--bg)`, and `hatched` draws the hatch.
- Halos, the error cross, the tick and the marker keep their meaning. Halos follow the bar's outline, the cross and the linked centre mark sit at its middle, and the marker sits past its far end.

A lane without `bars` ignores `magnitude` and `clipped`, and draws exactly as it did before they existed.

### State precedence

1. `hiddenKinds` removes an event completely.
2. `emphasis` controls dimming of remaining events.
3. `linked` and `selected` restore full opacity and add halos.
4. `error`, `tick`, and `marker` overlays remain visible above the shape and halos.

When `emphasis` is `undefined`, no event is dimmed. When it is an empty set, every otherwise-visible event is dimmed. Events whose index is in `emphasis`, `linked`, or equals `selected` stay at full opacity. Dimming changes paint opacity only; it never changes hit-testing, options, tooltip availability, or keyboard order. The overview mirrors hidden and dimmed state.

### Selection, linked state, and focus

The selected event uses a two-tone halo independent of its kind color: an inner `var(--bg)` casing and an outer `var(--fg)` ring. Equal boundary padding reserves the halo's maximum overhang, with a viewport-edge clamp covering reserved scrollbar gutters, so the first and last rings paint whole. This is the required contrast fix for fills that equal or are too close to `--color-link` or `--fg` in one theme.

An event's optional `halo` is a permanent ring resolved from its token name. It is painted below linked and selected halos, so the controlled selection treatment always wins. This supports semantic rings such as verdict glows without coupling them to a kind-level fill token.

A linked event uses the same `var(--bg)` casing with a `var(--color-link)` outer ring. If an event is both selected and linked, the selected `--fg` halo wins and a small `--color-link` center mark preserves linked state.

The listbox scroller has a persistent, visible `:focus-visible` ring using `var(--color-link)` with `var(--bg)` separation. Canvas focus is never communicated by color or opacity alone. The ring shows for a focus that arrived by keyboard, or after any key press, and not for one a pointer press gave the scroller by script, which the browser would otherwise ring as well. While the focus is a pointer's the scroller carries `data-focus-source="pointer"`.

### Ruler

`ruler` occupies a dedicated row above the lanes, inside the horizontally scrolling axis. Its sticky gutter label defaults to “Index” and can be replaced with `rulerLabel`. A render function receives the exact padded axis width and `xForIndex`, so true-time tick labels align with event centers at any `cellWidth`. A plain `ReactNode` is placed in the same full-width slot for consumers that already calculate positions.

The ruler wrapper is presentation-only to assistive technology because each event option already includes `at`. The ruler does not become another horizontal scroller or Tab stop.

### Tooltip

Pointer hover and keyboard activity identify an event through the same index lookup. The default tooltip body is the event `label`, `kind`, and `at`, plus `error`, `tick`, or `marker` text when present. `renderTooltip` replaces only that body.

While the strip holds **keyboard** focus, the tooltip stays on the active event with the pointer
away, so a keyboard user has a readout of where they are. It is keyboard focus specifically: a click
also focuses the scroller, and treating that as keyboard left the highlighted event's tooltip pinned
on screen for the rest of the page's life. Pressing **Escape** dismisses it; carrying
on with the arrows brings it back.

`EventLanes` always owns the shell: the returned body is rendered in `ChartTooltip`, portalled to `document.body` and fixed to the window, as [Tooltip](Tooltip.md) is. It sits above the event's row, moves below it when the window has no room above, and shifts sideways to stay 8 pixels inside the window at its own width. No ancestor that hides its overflow can cut it off. Consumers do not position or restyle the tooltip. Returning `null` suppresses the visual tooltip for that event. The tooltip has `role="tooltip"`, and the active virtual option references it with `aria-describedby` while it is open.

`onHover` receives the newly hit-tested event and fires once when that event changes. It receives `null` when the pointer leaves an event, enters an empty/hidden cell, or leaves the component. Dimming does not suppress hover. Spans and the overview window do not call `onHover`.

## Scrolling, canvas, and overview

The lane viewport is the single horizontal scroll owner. Selecting an off-screen visible event scrolls the smallest distance needed to reveal its full cell; it does not center an already-visible event or scroll an ancestor page.

A consumer may pad the scroller for room before the axis. The viewport is the content box inside that padding: the axis is fitted to it, the canvas sticks at its edge, and the overview begins under it, so the two keep one zero and one width.

Event marks and spans are canvas-rendered in both acceptance fixtures. Rendering is windowed to the visible global-index range plus a small overscan; a 1,366-event trace does not allocate a laid-out mark or full-size backing canvas for every event. Its census nodes are visually hidden and do not participate in layout or hit-testing. Canvas dimensions account for `devicePixelRatio` while all public geometry remains in CSS pixels.

Pointer hit-testing derives lane from y and global index from x, then looks up the unique event at `(lane, i)`. It tests only visible, non-hidden events. Empty columns, spans, and hidden events resolve to no hit. The selected and linked halos do not enlarge or change the hit target.

`overview` has three modes:

| Value | Behavior |
|-------|----------|
| `"auto"` (default) | Render the overview only when axis width exceeds viewport width |
| `true` | Always render it, including when the viewport window covers the whole axis |
| `false` | Never render it |

The overview is a compact lane-preserving map: each lane becomes a miniature row, hidden kinds are absent, emphasis dimming is reflected, and selected/linked positions remain visible. Spans and text labels are omitted at overview scale. A single stroked rectangle shows the visible axis range.

`overviewPlacement` puts the overview `"above"` the ruler and the lanes rather than `"below"` them, its default. A page whose zoom controls sit above the timeline can keep the thing that moves the view next to the controls that set it.

`overviewHeight` sets the overview's height, 40 pixels by default. Its lane bands share whatever height it has, inside the outline's reserved chrome. A lane with `overview: false` is left out, and the lanes that remain share the height between them. A sparse lane drawn in a short overview otherwise leaves every band a line.

With `scrollbar="overview"`, the lanes' native scrollbar is hidden whenever the overview is shown, since the overview scrolls them. A wheel, a trackpad and the keyboard still scroll the lanes. When the overview is not shown the scrollbar returns, so the axis always has a visible way to scroll.

Clicking the overview recenters the main viewport. Dragging its window scrolls continuously and clamps at both ends. These actions scroll only; they never select an event. The overview is `aria-hidden` and not a Tab stop because the primary listbox exposes the complete keyboard path.

## Positioned layout

With `layout="position"`, each mark sits at its `position` on a continuous scale rather than in the column its `i` names. The consumer chooses the unit and the zero, for example seconds since a run began. `i` stays the mark's identity for selection, focus, `linked`, `emphasis` and every callback, and it must still be unique across the component.

The axis begins at the smallest position in the data, its origin, after the same boundary padding the index layout reserves for halos. It ends a mark size after the largest position, plus that padding again, because a mark begins at its position and the last one in a timeline draws a mark size to the right of it. A position becomes a pixel through the scale, in CSS pixels per unit. The layout is chosen for the whole component: a mark without a finite `position` is left out and reported in development, as an invalid span is.

### Timelines

Lanes that name the same `group` form one timeline. A lane with no `group` is a timeline of its own, which is how every lane behaves in the index layout. A timeline is typically a pair: work drawn with `bars: "up"`, and waiting drawn with `bars: "down"` in the lane below it.

Its marks share one order, by position and then by `i`, and that order sets their widths, their boxes and the arrow keys. Keep a timeline's lanes next to each other, because a box encloses every row from the timeline's first lane to its last.

### Width

A mark begins at its position and is as wide as the gap to the next mark anywhere in its timeline, less a one-pixel gutter. A mark with `anchor: "end"` ends at its position instead, drawn to the left of its moment. An opening drawn at the same moment a box begins would otherwise sit inside the box, over its label; anchored at its end it sits just before it, as a reply sits just after. The width is clamped between one pixel and the mark size that `cellWidth` gives. Dense runs therefore read as hairlines, and sparse runs stay readable. The last mark in a timeline draws at the mark size. A mark with an `extent` draws at its true length instead, with no upper clamp.

Widths read every valid mark in the timeline, including hidden kinds and hidden lanes. Filtering a kind, or hiding a lane, never moves or resizes the marks that remain.

A lane with `widthBy: "lane"` measures its marks against the next mark in that lane alone. A sparse row of protocol marks that shares a timeline with dense step rows would otherwise draw every mark as a hairline, since a step follows each protocol mark within seconds. The timeline still boxes the lane and the arrow keys still walk it.

Every shape draws as a rectangle of that width, as in a bar lane, and both hollow shapes draw as a token outline. A lane without `bars` centres a rectangle of the mark size's height in its row, except that a `circle` or `hollow-circle` with room for the mark size draws round, as the legend shows it. Narrower, it is a column like any other mark. The error cross is sized to the column it marks, and is at least six pixels across, so a hairline is not lost under a cross the mark size wide.

### Hidden lanes

A lane with `hidden` takes no height, draws nothing, has no label, and adds no options, so the keyboard never reaches its events. Its marks still count for their timeline's widths. A page can therefore offer a switch that shows or hides waiting without the work bars jumping. `hidden` behaves the same way in the index layout, where it has no widths to keep.

### Spans as boxes

In the positioned layout a span runs from one position to another and draws as a box behind the marks of the timeline its `lane` belongs to. The box fills with `var(--color-bg-subtle)` inside a `var(--border)` outline. A `label` is drawn inside its top edge when the box is wide enough to hold a few characters.

`trail` adds a trailing segment from `to` to that position, drawn along the box's bottom edge in `trailToken`, `var(--color-warning)` by default. It shows time that belongs to the span without being part of it, such as a reply waiting to be taken up.

The span whose `id` equals `selectedSpan` fills with `var(--color-accent-bg)` inside a `var(--color-link)` outline. A pointer press on a box or its trailing segment, where no mark is hit, calls `onSelectSpan` with the span. Spans are not keyboard targets. Instead, each mark's option names the labelled spans it falls inside, for example "in Task 3".

### Links

`links` joins pairs of marks by `i`, in either layout and across lanes. A link leaves and enters each row through the edges that face each other, as a curve beneath the marks. It is drawn in `var(--muted)`, or heavier in `var(--color-link)` when `emphasized`, and `style: "dashed"` breaks the line. A link is drawn only while both of its marks are visible, and one naming an index that is not drawn is skipped with a development warning. `linked` is unrelated: it rings marks and draws no line.

### Scale, zoom and scroll

Until something asks for a scale, the whole extent fits the viewport between the boundary paddings, and it keeps fitting as the viewport resizes. The last mark and its selection halo stay inside the viewport, and there is nothing to scroll to. The deepest zoom puts the two closest marks in any timeline four mark sizes apart, and it never grows the axis past eight million pixels.

`view` asks for a range in axis units. It is applied each time the page passes a new object, so a page can restore a view from its URL, offer presets, or return to a range it showed before. The range is shown between the boundary paddings, so a view from the origin to the end is the fit the component opens with. A range narrower or wider than the zoom allows is clamped. `onViewChange` reports the start, end and scale whenever the view changes, from a scroll, a zoom, a resize or a request. It reports the range between the paddings, as `view` asks for it. A page that writes each report back into `view` hands over the view already shown, and nothing moves. The ruler's `visibleStart` and `visibleEnd` are the viewport's edges themselves, padding included, so the ruler can place a tick anywhere in view.

In the positioned layout only:

- Ctrl or Cmd with the wheel zooms about the pointer, and so does a trackpad pinch, which the browser delivers as a wheel event with `ctrlKey`. `wheelZoom={false}` leaves both to the browser, for a page that zooms by preset alone so that every view it shows is one it can name.
- The plain vertical wheel scrolls the axis sideways. Where the axis cannot move any further, the wheel is left to scroll the page. `wheelScroll={false}` leaves it to the page always, for a tall timeline inside a long document, where a reader scrolling down should not find the lanes sliding sideways instead.
- A horizontal wheel or trackpad swipe scrolls the axis as it always has.

`selected` still reveals the selected mark, scrolling the smallest distance that shows it whole.

### Ruler, overview and drawing

The ruler function receives `position` in its context: the scale, the origin and end, the visible range in axis units, and `xForPosition` with its inverse `positionForX`. That is enough for the ruler to choose and place its own ticks for the visible range. Labels remain the consumer's, because only the consumer knows what the unit means. `xForIndex` returns a mark's centre in either layout.

The overview maps the whole positioned extent, and its window shows the visible range. Dragging or clicking it scrolls, exactly as in the index layout. `overviewContent` chooses what it draws: `"marks"`, the default, draws each mark in its lane's band, `"spans"` draws each span and its trailing segment, and `"both"` draws both.

Drawing stays windowed. Each lane keeps its marks sorted by position, and a paint binary-searches the visible range, reaching left by the longest `extent` in the lane. Hit-testing searches the same way, and a mark narrower than six pixels answers from three pixels either side of it.

## Keyboard and accessibility

### Listbox model

The horizontal scroller is the single Tab stop:

- `role="listbox"`, `tabIndex={0}`, and the supplied `aria-label` (default “Event timeline”).
- `aria-orientation="horizontal"` because keyboard order follows the global x-axis across lanes.
- `aria-activedescendant` points to a visually hidden but accessibility-visible virtual `role="option"` for the active event.
- Every visible event has a non-tabbable census option carrying `data-event-index`, `data-event-kind`, and `data-event-lane`, plus `aria-posinset`, `aria-setsize`, and `aria-selected`. Painting remains windowed and the listbox remains the only Tab stop.
- The option name contains lane label, event label, kind, global index, and `at`, plus error/tick/marker and span-endpoint descriptions when present.

The virtual option sequence contains only visible events, sorted by increasing global `i`. Because `i` is globally unique, lane order cannot make keyboard and visual selection disagree.

The visually hidden census is stable consumer contract. An event in `linked` carries `data-event-linked="true"`; when `emphasis` is supplied, every event option carries `data-event-emphasized="true"` or `"false"` to reflect membership. Every valid span is represented by an element with `data-span-lane`, `data-span-from`, and `data-span-to`, including spans whose endpoints do not contain events. Census attributes, not the option's human-readable announcement sentence, are the machine-readable interface; announcement prose is explicitly not contract.

### Key behavior

| Key | Action |
|-----|--------|
| `ArrowRight` | Move to the next visible event by global index and request its selection |
| `ArrowLeft` | Move to the previous visible event by global index and request its selection |
| `Home` | Move to the first visible event and request its selection |
| `End` | Move to the last visible event and request its selection |
| `Enter` / `Space` | Select the active event by calling `onSelect` |
| `Escape` | Dismiss the narration tooltip. Not consumed — see below |
| `Tab` / `Shift+Tab` | Leave the component normally; events are not separate Tab stops |

In the positioned layout the keys follow the focused mark's timeline instead of the global index:

| Key | Action |
|-----|--------|
| `ArrowRight` / `ArrowLeft` | Move to the next or previous mark in the timeline by position, stopping at its ends |
| `Home` / `End` | Move to the timeline's first or last visible mark |
| `ArrowDown` / `ArrowUp` | Move to the nearest mark by position in the next or previous timeline, in lane order |
| `Enter` / `Space` | Select the active event, as in the index layout |

`ArrowDown` and `ArrowUp` are handled only when there is a timeline to move to, and otherwise propagate. The census keeps its order by `i` in both layouts.

`EventLanes` deliberately does not **consume** Escape. It dismisses the narration tooltip (below)
and then lets the event keep propagating to document and application handlers, so consumers may
clear selection or close surrounding UI — a page-level handler that clears its own selection on
Escape still works. Escape gets no `preventDefault()` and no `stopPropagation()`.

Arrow/Home/End moves update `aria-activedescendant`, keep the event visible, and call `onSelect` when supplied. `selected` is controlled, so the consumer reflects `event.i` back to show the persistent halo. Enter/Space call `onSelect` again for explicit activation. In read-only use without `onSelect`, arrows still move the active option for exploration but do not create controlled selection state.

Handled Arrow/Home/End/Enter/Space events call both `preventDefault()` and `stopPropagation()`. This prevents a measured failure where the strip and a page-level ArrowRight handler move different selections. Navigation stops at the first/last event and never wraps.

### Hidden kinds

Hidden events are absent from paint, hit-testing, hover, tooltips, the virtual option sequence, `aria-setsize`, and every keyboard calculation. ArrowLeft/Right/Home/End therefore **cannot land on a hidden kind** and can never call `onSelect` with one.

When `hiddenKinds` changes and hides the active event, the active descendant moves to the next visible event, or the previous visible event when there is no next event. This repair does not call `onSelect` by itself. If the controlled `selected` index is hidden, its halo is not painted; the value remains the consumer's until the next visible selection request.

When no events are visible, the listbox remains one labelled focus stop with `aria-disabled="true"`, has no `aria-activedescendant`, and announces “No visible events.” Keyboard selection keys do nothing and are not intercepted.

## Controlled behavior

`selected`, `linked`, `hiddenKinds`, and `emphasis` are controlled inputs. `EventLanes` owns only transient active-descendant, hover, scroll, and overview-drag state.

- Pointer click on a visible event calls `onSelect(event)`.
- Keyboard selection calls the same callback with the same event object.
- Updating `selected` scroll-follows only when that selected event exists and is visible.
- Updating `linked` or `emphasis` repaints without changing selection or scroll.
- Updating `lanes`, `events`, or `cellWidth` preserves the selected event when possible and reclamps scroll.

## Acceptance fixtures

### Dense profile: 1 lane × 1,366 events

- One declared lane; events use `i` 0 through 1,365 and `cellWidth={10}`.
- The main canvas draws only the visible range plus overscan. Hit-testing uses the index lookup and does not scan 1,366 events per pointer move.
- `overview="auto"` is visible whenever the roughly 13,660-pixel axis overflows. Its viewport window drags across the full trace and mirrors hidden/emphasized events.
- Search matches map to `emphasis`; nonmatches dim but remain selectable. `hiddenKinds` removes kinds from both overview and navigation.
- `error`, `shape="hollow"`, `tick`, and `marker` express the dense profile's error cross, square redacted event, turn-end bar, and spawn marker.
- Arrow navigation and the virtual option remain responsive at the first, middle, and last event, and selecting an off-screen event scrolls it into view.

### Multi-lane profile: 7 lanes × 73 events with spans

- Seven declared lanes share the 0–72 global axis; lane labels remain sticky. This profile supplies `cellWidth={22}`.
- Square, circle, hollow-square, and hollow-circle marks occupy their correct lane/index cells. Hit-testing checks both row and index, so an empty cell in another lane is not the event at that index.
- Open→reply spans align to event centers beneath the marks. `selected` and `linked` retain distinct two-tone states in both themes.
- The ruler render function uses `xForIndex` for true-time labels and remains aligned through horizontal scrolling.
- `overview="auto"` appears only if the 1,606-pixel axis exceeds its viewport; if it appears, all seven miniature lanes and the viewport window remain usable. It is not forced merely because there are multiple lanes.
- Blind mode passes log kinds in `hiddenKinds`. An 80-step ArrowRight walk selects zero hidden events; the virtual set size and position count only visible events.

### Positioned profile: a synthetic run of about 3,000 marks

- A coordinator and six workers, each a timeline of a work lane and a waiting lane, placed in seconds over about five hours. Every other member is shaded as a band with a gap before each, the selected member's band is the accent, waiting is hatched, a failed step carries a marker in the error colour, and the overview sits above the lanes.
- Every task is a box with a label and a trailing segment, joined to the coordinator by a solid link for the hand-off and a dashed link for the reply.
- At the whole-run scale, dense bursts read as hairlines and sparse steps at the mark size. Hiding the waiting lanes leaves every work bar where it was.
- Ctrl or Cmd with the wheel zooms about the pointer, and the plain wheel scrolls sideways. The overview draws the boxes and moves the view.
- A zoom step and a scroll step each finish inside two animation frames at this size, and at ten times it.

## Consumer differences resolved by this contract

| Difference | Contract decision |
|------------|-------------------|
| One profile is a single lane; the other is seven | `lanes` is always required; the dense profile supplies one lane |
| One profile uses array position; the other uses a global event index | `i` is the unique global coordinate and selection value; the dense profile maps its position to `i` |
| The dense profile has error/redacted/turn-end/spawn states | `error`, `shape="hollow"`, `tick`, and `marker` are independent event fields |
| One profile needs search dimming; the other needs accept↔reply highlighting | `emphasis` means search/dimming; `linked` means relation highlighting; neither hides data |
| The multi-lane profile needs connectors and true-time labels | `spans` and the axis-aligned `ruler` slot are first-class |
| The multi-lane profile's accept mark is a hollow circle | `shape="hollow-circle"`; the existing `hollow` square remains the dense profile's redacted mark |
| One profile uses 10-pixel density; the other uses 22-pixel columns | `cellWidth` is shared axis pitch, default 10 and consumer-settable |
| One profile already used canvas; the other used DOM squares and `title` | Event marks always use the windowed canvas; virtual options and `ChartTooltip` replace per-square DOM/title |
| One profile needs an overview; the other may fit without one | `overview="auto"` is based on actual overflow, not event or lane count |

These choices cover CP-01/19/25 and TR-20/24/28 without preserving either consumer's accidental DOM or global-key-handler behavior.

## Edge cases

- **No lanes:** Render the labelled empty state; events cannot be valid without a lane.
- **No events:** Render declared lane labels and an empty axis; listbox announces no visible events.
- **Sparse indices:** Preserve empty global columns so ruler and span coordinates do not shift.
- **Unknown lane or invalid index/span:** Skip the invalid datum and warn in development; never make it a virtual option.
- **Missing palette key:** Paint `var(--muted)` and warn in development.
- **Selected index absent or hidden:** Paint no selected halo; seed keyboard activity from the nearest visible event.
- **All kinds hidden:** Same accessible behavior as no visible events; spans may remain visual but are not interactive.
- **Theme change:** Re-resolve palette tokens and repaint marks, spans, halos, overview, and tooltip chrome without losing scroll, hover, or selection.
- **Resize:** Recompute the visible range and overview window; keep the selected visible event visible when possible.
- **Unusable heights:** A lane `height` or an `overviewHeight` below 8 pixels, or not finite, falls back to its default. A lane's is reported in development, since a row silently four times taller than asked misplaces everything below it.
- **A floor taller than the row:** The floor is capped at the row's room, so the bar can still be drawn.
- **Positioned mark without a position:** Leave it out and warn in development. An `extent` that is negative or not finite is treated the same way.
- **Positioned span:** Its endpoints must be finite and in order, and a `trail` must not end before `to`. Otherwise it is skipped with a warning.
- **Requested view beyond the zoom:** Clamp the scale, and report the view actually shown through `onViewChange`.
- **Every lane of a timeline hidden:** Its boxes are not drawn, and the keyboard cannot reach it.

## Traceability

- Root: the outer element carries the supplied `id` and `data-component="EventLanes"`.
- Sticky labels container: `data-event-lanes-labels`.
- Per-lane visible label: `data-event-lane-label="{lane.id}"`, plus `data-event-lane-title` and `data-event-lane-description` when those optional metadata fields are supplied.
- Bands: one `data-event-lanes-band="{token}"` element per band, and `data-event-lanes-shaded` on the root while there is any.
- Listbox scroller: the inner element carries `data-event-lanes-scroller`, `role="listbox"`, `tabIndex={0}`, `aria-label`, `aria-activedescendant`, `data-event-count`, and `data-span-count`. After a pointer press it carries an attribute naming the focus source, described under selection and focus above. It is the horizontal scroll owner; read `scrollLeft` and `clientWidth` or observe its scroll/resize events through this hook. It carries `data-scrollbar="overview"` while `scrollbar="overview"` has hidden its scrollbar. The sticky gutter, ruler, and overview are outside its accessible subtree.
- Main drawing surface: `data-event-lanes-canvas`, `aria-hidden="true"`.
- Overview caption: `data-event-lanes-overview-label`. Overview canvas: `data-event-lanes-overview`, `aria-hidden="true"`. The root carries `data-overview-placement="above"` when the overview sits above the lanes.
- DOM census: `data-event-lanes-census`; every visible `role="option"` carries `data-event-index`, `data-event-kind`, and `data-event-lane`, with `data-event-linked` and `data-event-emphasized` following the stable census contract above.
- Span census: `data-span-lane`, `data-span-from`, and `data-span-to`, plus `data-span-id`, `data-span-label`, `data-span-trail` and `data-span-selected="true"` when those apply.
- Link census: `data-link-from`, `data-link-to`, `data-link-style`, and `data-link-emphasized="true"` for an emphasised link.
- The listbox scroller carries `data-layout="position"` in the positioned layout.

## Compiling usage example

{% raw %}
<!-- docs-compile -->
```tsx
import { EventLanes } from "@codesweep-ai/ui";
export function Example() { return <>{/* The index layout. */}<EventLanes lanes={[{ id: "agent", label: "Agent", title: "Agent lane", description: "Work performed by the agent", height: 40, bars: "up", shade: "--color-bg-muted" }]} events={[{ i: 0, lane: "agent", kind: "tool", shape: "square", label: "Read file", at: "12:00", magnitude: 0.5 }]} spans={[{ lane: "agent", from: 0, to: 0 }]} palette={{ tool: "--color-cat-3" }} linked={new Set([0])} emphasis={new Set([0])} selected={0} overview overviewHeight={14} scrollbar="overview" />{/* The positioned layout. */}<EventLanes layout="position" lanes={[{ id: "work", label: "Worker", group: "worker", bars: "up", height: 32, gapBefore: 8, shade: "--color-accent-bg" }, { id: "wait", label: "", group: "worker", bars: "down", height: 16, shade: "--color-accent-bg" }]} events={[{ i: 0, lane: "work", kind: "step", shape: "square", label: "Read", at: "0:00", position: 0, magnitude: 0.4 }, { i: 1, lane: "wait", kind: "wait", shape: "hatched", label: "Waits", at: "0:03", position: 3 }, { i: 2, lane: "work", kind: "step", shape: "square", label: "Write", at: "0:40", position: 40, error: true, marker: "failed", markerToken: "--color-error" }]} spans={[{ lane: "work", from: 0, to: 45, id: "task", label: "Task", trail: 50 }]} links={[{ from: 0, to: 2, style: "dashed", emphasized: true }]} selectedSpan="task" palette={{ step: "--color-cat-3", wait: "--color-structural" }} view={{ start: 0, end: 60 }} onViewChange={(view) => view.scale} wheelZoom={false} overview overviewContent="spans" overviewPlacement="above" /></>; }
```
{% endraw %}
