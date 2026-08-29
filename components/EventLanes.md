---
name: EventLanes
status: experimental
since: 0.2.0
summary: Canvas-rendered events on a shared global-index axis, with lanes, spans, overview navigation, token palettes, and an accessible virtual listbox.
keywords: [event lanes, event timeline, event strip, canvas timeline, trace events,
           agent events, multi-agent timeline, spans, overview, virtual listbox]
use_when:
  - Showing an ordered event stream on one or more named lanes
  - A dense trace needs thousands of selectable events without thousands of laid-out DOM marks
  - Related events need spans, linked highlighting, markers, or a shared ruler
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

> Canvas-rendered categorical events on a shared global-index axis. One lane with 1,366 events and seven lanes with 73 events use the same renderer and interaction model.

`EventLanes` owns the event canvas, horizontal scrolling, optional overview, selection and linked-state drawing, hit-testing, keyboard navigation, and tooltip shell. Consumers own the data, token mapping, selected index, ruler content, and tooltip body.

## Prop contract

```tsx
import type { ReactNode } from "react";

type EventShape = "square" | "circle" | "hollow" | "hollow-circle";

/** A CSS custom-property name. The component resolves it with var(...). */
type EventToken = `--${string}`;

interface EventLane {
  /** Stable lane key referenced by events and spans. */
  id: string;
  /** Visible lane label and the lane name included in option announcements. */
  label: string;
  /** Optional native tooltip for the visible lane label. */
  title?: string;
  /** Optional context included in event option announcements. */
  description?: string;
  /** Optional presentation hook for the visible lane label. */
  className?: string;
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
  /** Permanent token-coloured ring, below linked and selected halos. */
  halo?: EventToken;
}

interface EventLaneSpan {
  /** Lane containing the connector. */
  lane: string;
  /** Inclusive global-index endpoints. */
  from: number;
  to: number;
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

  /** Horizontal cell pitch in CSS pixels. Default 10. */
  cellWidth?: number;
  /** Default "auto": show only when the global axis overflows. */
  overview?: "auto" | boolean;

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

Lane labels are DOM text, not canvas pixels. They remain visible in a sticky leading gutter while the global axis scrolls horizontally. `title` supplies a native tooltip; `description` adds context to every event option announcement for that lane. The canvas rows, ruler, and overview begin after the same gutter and share the same x-coordinate system.

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
- `error`: draws an error cross with `var(--color-error)` above the base shape. It does not replace the kind color.
- `tick`: draws a trailing `var(--fg)` vertical boundary bar at the event cell edge.
- `marker`: draws a small `var(--color-accent)` marker above the base shape. The string is its accessible/tooltip label; dense canvases do not paint the marker text.

Marks are centered in their `cellWidth` column and lane row. `cellWidth` is a finite positive number in CSS pixels; invalid values fall back to 10. Ten pixels is the dense profile's default. The multi-lane profile supplies 22 to preserve its ruler pitch and larger hit cells.

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

The listbox scroller has a persistent, visible `:focus-visible` ring using `var(--color-link)` with `var(--bg)` separation. Canvas focus is never communicated by color or opacity alone.

### Ruler

`ruler` occupies a dedicated row above the lanes, inside the horizontally scrolling axis. Its sticky gutter label defaults to “Index” and can be replaced with `rulerLabel`. A render function receives the exact padded axis width and `xForIndex`, so true-time tick labels align with event centers at any `cellWidth`. A plain `ReactNode` is placed in the same full-width slot for consumers that already calculate positions.

The ruler wrapper is presentation-only to assistive technology because each event option already includes `at`. The ruler does not become another horizontal scroller or Tab stop.

### Tooltip

Pointer hover and keyboard activity identify an event through the same index lookup. The default tooltip body is the event `label`, `kind`, and `at`, plus `error`, `tick`, or `marker` text when present. `renderTooltip` replaces only that body.

While the strip holds **keyboard** focus, the tooltip stays on the active event with the pointer
away, so a keyboard user has a readout of where they are. It is keyboard focus specifically: a click
also focuses the scroller, and treating that as keyboard left the highlighted event's tooltip pinned
on screen for the rest of the page's life (OPEN.md §7.19). Pressing **Escape** dismisses it; carrying
on with the arrows brings it back.

`EventLanes` always owns the shell: the returned body is rendered in `ChartTooltip`, positioned relative to the visible viewport and clamped to that viewport. Consumers do not position or restyle the tooltip. Returning `null` suppresses the visual tooltip for that event. The tooltip has `role="tooltip"`, and the active virtual option references it with `aria-describedby` while it is open.

`onHover` receives the newly hit-tested event and fires once when that event changes. It receives `null` when the pointer leaves an event, enters an empty/hidden cell, or leaves the component. Dimming does not suppress hover. Spans and the overview window do not call `onHover`.

## Scrolling, canvas, and overview

The lane viewport is the single horizontal scroll owner. Selecting an off-screen visible event scrolls the smallest distance needed to reveal its full cell; it does not center an already-visible event or scroll an ancestor page.

Event marks and spans are canvas-rendered in both acceptance fixtures. Rendering is windowed to the visible global-index range plus a small overscan; a 1,366-event trace does not allocate a laid-out mark or full-size backing canvas for every event. Its census nodes are visually hidden and do not participate in layout or hit-testing. Canvas dimensions account for `devicePixelRatio` while all public geometry remains in CSS pixels.

Pointer hit-testing derives lane from y and global index from x, then looks up the unique event at `(lane, i)`. It tests only visible, non-hidden events. Empty columns, spans, and hidden events resolve to no hit. The selected and linked halos do not enlarge or change the hit target.

`overview` has three modes:

| Value | Behavior |
|-------|----------|
| `"auto"` (default) | Render the overview only when axis width exceeds viewport width |
| `true` | Always render it, including when the viewport window covers the whole axis |
| `false` | Never render it |

The overview is a compact lane-preserving map: each lane becomes a miniature row, hidden kinds are absent, emphasis dimming is reflected, and selected/linked positions remain visible. Spans and text labels are omitted at overview scale. A two-tone viewport window shows the visible axis range.

Clicking the overview recenters the main viewport. Dragging its window scrolls continuously and clamps at both ends. These actions scroll only; they never select an event. The overview is `aria-hidden` and not a Tab stop because the primary listbox exposes the complete keyboard path.

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

## Traceability

- Root: the outer element carries the supplied `id` and `data-component="EventLanes"`.
- Sticky labels container: `data-event-lanes-labels`.
- Per-lane visible label: `data-event-lane-label="{lane.id}"`, plus `data-event-lane-title` and `data-event-lane-description` when those optional metadata fields are supplied.
- Listbox scroller: the inner element carries `data-event-lanes-scroller`, `role="listbox"`, `tabIndex={0}`, `aria-label`, `aria-activedescendant`, `data-event-count`, and `data-span-count`. It is the horizontal scroll owner; read `scrollLeft` and `clientWidth` or observe its scroll/resize events through this hook. The sticky gutter, ruler, and overview are outside its accessible subtree.
- Main drawing surface: `data-event-lanes-canvas`, `aria-hidden="true"`.
- Overview caption: `data-event-lanes-overview-label`. Overview canvas: `data-event-lanes-overview`, `aria-hidden="true"`.
- DOM census: `data-event-lanes-census`; every visible `role="option"` carries `data-event-index`, `data-event-kind`, and `data-event-lane`, with `data-event-linked` and `data-event-emphasized` following the stable census contract above.
- Span census: `data-span-lane`, `data-span-from`, and `data-span-to`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { EventLanes } from "@codesweep-ai/ui";
export function Example() { return <EventLanes lanes={[{ id: "agent", label: "Agent", title: "Agent lane", description: "Work performed by the agent" }]} events={[{ i: 0, lane: "agent", kind: "tool", shape: "square", label: "Read file", at: "12:00" }]} spans={[{ lane: "agent", from: 0, to: 0 }]} palette={{ tool: "--color-cat-3" }} linked={new Set([0])} emphasis={new Set([0])} selected={0} overview />; }
```
