---
name: AgentTrace
status: stable
since: 1.4.0
summary: Vertical, expandable list of chronological agent steps with status icons.
keywords: [agent, trace, steps, activity, log, history, timeline, audit, run log,
           agent steps, chronological]
use_when:
  - Showing the chronological list of steps an agent has taken (settled history)
avoid_when:
  - One thing happening right now → AgentStatus
  - Token-by-token model output → StreamingText
  - Dense horizontal event overview or shared lane axis → EventLanes
  - Static program structure (file tree / AST) → Tree or SectionedTree
related: [AgentStatus, StreamingText, EventLanes, PulseBadge]
patterns: [AgentActivity]
---

# AgentTrace

> Vertical list of agent steps with status icons, optional timestamps, and optional expandable details. The "settled history" half of agent activity — for in-flight work see [`AgentStatus`](./AgentStatus.md) + [`StreamingText`](./StreamingText.md).

Added in `@codesweep-ai/ui@1.4.0`.

## Props

```typescript
type AgentTraceStepStatus =
  | "success" | "warning" | "error" | "info" | "in-flight";

interface AgentTraceStep {
  id: string;
  status: AgentTraceStepStatus;
  label: string;
  timestamp?: string;
  detail?: React.ReactNode;       // when set, the row is expandable
}

interface AgentTraceProps {
  steps?: AgentTraceStep[];

  // State coverage (see patterns/ComponentStates.md)
  loading?: boolean;
  loadingRows?: number;            // default 4
  error?: Error | string | null;
  errorMessage?: string;
  onRetry?: () => void;
  emptyMessage?: string;           // default "No activity yet."
  emptyHint?: string;
  emptyAction?: { label: string; onClick: () => void };

  className?: string;
}
```

## State Coverage

Per [`patterns/ComponentStates.md`](../patterns/ComponentStates.md): precedence `loading > error > empty > data`. Test IDs `agenttrace-loading`, `agenttrace-error`, `agenttrace-empty`. Container chrome (border, radius, card bg) preserved across all states.

| Status      | Leading icon                          | Color                       |
|-------------|---------------------------------------|-----------------------------|
| `success`   | `CheckCircle2`                        | `var(--color-success)`      |
| `warning`   | `AlertTriangle`                       | `var(--color-warning)`      |
| `error`     | `AlertCircle`                         | `var(--color-error)`        |
| `info`      | `Info`                                | `var(--muted)`              |
| `in-flight` | `PulseBadge`                          | `var(--color-accent)` |

## Visual Spec

```
┌─────────────────────────────────────────────┐
│ ✓ Read 142 files                    10:01   │  ← row (clickable when has detail)
├─────────────────────────────────────────────┤
│ ▼ Generated 412 specs               10:03   │  ← expanded
│    ┌─ Detail panel (muted bg) ─────────────┐│
│    │ The full detail.                      ││
│    └───────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│ ⚠ 3 callsites need review           10:04   │
└─────────────────────────────────────────────┘
```

- Wrapper: card bg, 1px border, rounded `var(--radius-sm)`.
- Row: `px-3 py-2`, hover `var(--color-row-hover)` when expandable.
- Chevron (`ChevronRight` collapsed, `ChevronDown` expanded) shown only when `detail` is set on the step.
- Timestamp: `font-size-xs`, `var(--muted)`, tabular-nums, right-aligned.
- Detail panel: `[bg]: var(--color-bg-subtle)`, `[font-size]: var(--font-size-xs)`, `[color]: var(--muted)`.

## Behavior

- **Click a step with `detail`**: toggles the expanded panel. `aria-expanded` reflects state.
- **Click a step without `detail`**: no-op. The button is `disabled` and `aria-expanded` is unset.
- Multiple steps can be expanded simultaneously (each row is independent state).

## Anti-patterns

- ❌ Don't put `<StreamingText>` inside `detail`. Detail panels are for *settled* content; if the step is still streaming, render it as `state="in-flight"` AgentStatus elsewhere.
- ❌ Don't use AgentTrace for static program structure (file tree, AST). Use [`Tree`](./Tree.md) or [`SectionedTree`](./SectionedTree.md). AgentTrace is specifically for chronological agent work.

## Relation to `EventLanes`

[`EventLanes`](./EventLanes.md) is the dense horizontal variant of agent activity: it paints selectable categorical events against a shared index axis and can divide them among named lanes. `AgentTrace` is the verbose, vertical, expandable counterpart used inside a panel.

| Use… | When |
|------|------|
| `AgentStatus`    | The agent is actively doing one thing right now. |
| `StreamingText`  | Model is producing text output token-by-token. |
| `AgentTrace`     | Showing the chronological list of steps the agent has taken. |
| `EventLanes`     | Dense horizontal overview on a shared event axis. |

## Traceability

`data-component="AgentTrace"` on the wrapper. Test IDs for state branches.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { AgentTrace } from "@codesweep-ai/ui";
export function Example() { return <AgentTrace steps={[{ id: "read", status: "success", label: "Read files" }]} />; }
```
