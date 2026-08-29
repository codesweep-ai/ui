---
name: AgentActivity
status: stable
since: 1.4.0
summary: Visual language for surfacing real-time AI agent work — in-flight, paused, and settled states.
keywords: [agent activity, ai agent, streaming output, real-time progress, agent status, live work, agent trace, step history, in-flight, agentic ui]
use_when:
  - An AI agent is actively doing work the user should be able to observe
  - Showing a history of completed agent steps alongside a live current step
  - Replacing a generic spinner with a specific verb-phrase about what the agent is doing
avoid_when:
  - Dense event sequences on a shared axis → EventLanes
  - Static, non-animated state labels → StatusBadge
  - Unknown async wait without agent involvement → Skeleton
related: [AgentStatus, AgentTrace, EventLanes, PulseBadge, StreamingText, StatusBadge, Skeleton]
---

# Pattern: Agent Activity

> How CodeSweep surfaces real-time agent work to the user. The visual language of "an AI agent is doing visible work", which no other component in the set covers.

Added in `@codesweep-ai/ui@1.4.0`.

## Three modes

| Mode | When | Components |
|------|------|------------|
| **In flight** | The agent is actively working. | [`AgentStatus state="in-flight"`](../components/AgentStatus.md) + [`StreamingText`](../components/StreamingText.md) for output |
| **Paused**    | The agent is waiting on user input or human review. | `AgentStatus state="paused"` (no pulse, `HelpCircle` icon) |
| **Settled**   | The agent has finished a step; output is final. | [`AgentTrace`](../components/AgentTrace.md) row, or `AgentStatus state="settled"` |

Use exactly one mode at a time per panel. If a panel shows a settled trace history *and* an in-flight current step, render them in separate sub-sections — AgentTrace below, the in-flight AgentStatus row above (matching the canonical composition below).

## Visual language

### Pulsing dot — [`PulseBadge`](../components/PulseBadge.md)

`var(--color-accent)`, 8px circle, animation `scale(0.8 → 1.2 → 0.8)` + `opacity(0.6 → 1 → 0.6)` over 1.4s. Used inline next to AgentStatus text when in-flight. One pulse per viewport — never two competing in the same panel.

### Streaming text — [`StreamingText`](../components/StreamingText.md)

Characters reveal at ~40 chars/sec by default. Trailing cursor is `var(--color-accent)`, 2px wide, blinks at 1s. Once `done={true}`, cursor disappears and text snaps to full.

### No spinners

A spinner says "we don't know what's happening." Use `AgentStatus` with a specific verb-phrase — "Reading auth.legacy…", "Inferring contracts…", "Verifying parity…" — so the user always knows what the agent is doing.

## Anti-patterns

- ❌ **Generic "Loading…"** for agent work. Say what the agent is doing.
- ❌ **Progress bars.** % complete is rarely meaningful for agent work.
- ❌ **Modal blockers** during agent activity. The agent should never block the rest of the UI.
- ❌ **Toasts for in-progress agent work.** Toasts are for completed events. Use AgentStatus for work that's happening; reserve toasts for "Saved", "Failed", "Copied to clipboard".
- ❌ **Two PulseBadges in the same panel.** Pick the one work-in-progress item that matters.

## Composition

The canonical agent-driven panel:

```
┌───────────────────────────────────────────┐
│ ● Inferring contracts for auth.legacy…    │ ← AgentStatus state="in-flight"
├───────────────────────────────────────────┤
│ The handleAuth function maps cookie-      │
│ based sessions to OIDC subjects. I'll     │ ← StreamingText (live)
│ generate parity tests covering both…│     │
├───────────────────────────────────────────┤
│ ✓ Read 142 files                  10:01   │
│ ✓ Generated 412 specs             10:03   │ ← AgentTrace (settled)
│ ⚠ 3 callsites need review         10:04   │
└───────────────────────────────────────────┘
```

```tsx
import {
  AgentStatus,
  StreamingText,
  AgentTrace,
} from "@codesweep-ai/ui";

<section className="agent-activity">
  <AgentStatus state="in-flight">
    Inferring contracts for {currentFile}…
  </AgentStatus>

  <StreamingText text={partial} done={streamDone} />

  <AgentTrace steps={history} />
</section>
```

## Relation to existing components

- [`EventLanes`](../components/EventLanes.md) is the dense horizontal variant of agent activity, with a shared index axis and optional named lanes. AgentTrace is the verbose, vertical, expandable counterpart.
- [`StatusBadge`](../components/StatusBadge.md) is for stable, non-animated state labels (e.g. "Approved", "Failed"). Use PulseBadge only when activity is *live*.
- [`Skeleton`](../components/Skeleton.md) is for unknown async wait (e.g. waiting for a network request). Once agent activity starts, swap to AgentStatus.
