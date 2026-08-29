---
name: AgentStatus
status: stable
since: 1.4.0
summary: Single-line status row for visible agent work; shows a verb-phrase and animated indicator so users always know what the agent is doing.
keywords: [agent status, activity indicator, loading state, in-flight, progress,
           verb phrase, streaming status, live update, aria-live, pulse badge,
           spinner alternative, agent feedback, task status, llm progress]
use_when:
  - Displaying the work an agent has in hand (reading, generating, inferring)
  - Replacing generic spinners or "Loading…" text with a specific verb phrase
  - Surfacing paused / settled / error milestones in an agent trace
avoid_when:
  - You need streaming model output text → StreamingText
  - You need a full step-by-step trace of completed agent actions → AgentTrace
related: [PulseBadge, StreamingText, AgentTrace]
patterns: [AgentActivity]
---

# AgentStatus

> Single-line status row for visible agent work. Replaces generic "Loading…" with a specific verb-phrase ("Reading 142 files…", "Generating tests…") so the user always knows what the agent is doing.

Added in `@codesweep-ai/ui@1.4.0`.

## Props

```typescript
interface AgentStatusProps {
  /** Activity state. Drives the leading indicator. */
  state: "in-flight" | "paused" | "settled" | "error";
  /** Status text. Use a specific verb phrase. */
  children: React.ReactNode;
  /** Icon override for "paused", "settled", or "error". Ignored for "in-flight". */
  icon?: React.ReactNode;
  /** Additional className. */
  className?: string;
}
```

## States

| State        | Leading indicator                       | When to use |
|--------------|-----------------------------------------|-------------|
| `in-flight`  | `PulseBadge` (animated)                 | The agent is actively working. |
| `paused`     | `HelpCircle` (`var(--color-warning)`)   | The agent is waiting on user input or human review. |
| `settled`    | `CheckCircle2` (`var(--color-success)`) | The step is done; surfacing the final outcome on a line. |
| `error`      | `AlertTriangle` (`var(--color-error)`)  | The step failed. |

## Visual Spec

- Layout: `inline-flex`, `align-items: center`, `gap: var(--space-2)`.
- Font: `var(--font-size-sm)`, `var(--fg)`.
- Indicator size: `var(--icon-size-sm)` for icon states; PulseBadge defaults to 8px.
- Text uses `overflow: hidden`, `text-overflow: ellipsis`, and `white-space: nowrap` when the parent constrains width.

## Behavior

`role="status"` + `aria-live="polite"` so screen-reader users hear updates as the verb-phrase changes ("Reading…" → "Inferring…" → "Generating…"). Use [`StreamingText`](./StreamingText.md) for streaming model output that lives *below* the AgentStatus row.

## Anti-patterns

- ❌ Generic "Loading…" — say what the agent is doing.
- ❌ Spinners. Use AgentStatus instead. A spinner says "we don't know what's happening."
- ❌ Progress bars. % complete is rarely meaningful for agent work.
- ❌ Modal blockers around AgentStatus — agent activity should never block the rest of the UI.

## Traceability

`data-component="AgentStatus"`, plus `data-state` reflecting the current state.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { AgentStatus } from "@codesweep-ai/ui";
export function Example() { return <AgentStatus state="in-flight">Reading files…</AgentStatus>; }
```
