import type { EventLane, EventLaneEvent, EventLaneSpan, EventToken } from "@codesweep-ai/ui";

export type TracerEventKind = "message" | "tool" | "result" | "redacted";

export const denseLanes: EventLane[] = [{
  id: "trace",
  label: "Trace",
  title: "Trace event stream",
  description: "Messages, tool calls, results, and redacted events",
}];

export const densePalette: Record<TracerEventKind, EventToken> = {
  message: "--color-cat-1",
  tool: "--color-cat-3",
  result: "--color-cat-7",
  redacted: "--muted",
};

export const denseEvents: EventLaneEvent<TracerEventKind>[] = Array.from(
  { length: 1_366 },
  (_, i) => {
    const kind: TracerEventKind = i % 31 === 0
      ? "redacted"
      : i % 7 === 0
        ? "result"
        : i % 3 === 0
          ? "tool"
          : "message";
    return {
      i,
      lane: "trace",
      kind,
      shape: kind === "redacted" ? "hollow" : kind === "result" ? "circle" : "square",
      label: `Trace event ${i + 1}`,
      at: `T+${(i * 0.125).toFixed(3)}s`,
      error: i > 0 && i % 173 === 0,
      tick: i > 0 && i % 97 === 0,
      marker: i > 0 && i % 211 === 0 ? "spawn" : undefined,
    };
  },
);

export const denseEmphasis = new Set(denseEvents.map((event) => event.i));

export type CampaignEventKind =
  | "user"
  | "assistant"
  | "tool"
  | "thinking"
  | "accept"
  | "plan"
  | "assessment"
  | "verdict-ok"
  | "verdict-bad"
  | "log";

export const multiLaneLanes: EventLane[] = [
  { id: "user", label: "User" },
  { id: "orchestrator", label: "Orchestrator", className: "cs-preview-event-lane-accent" },
  { id: "codex", label: "Codex" },
  { id: "claude", label: "Claude" },
  { id: "opencode", label: "OpenCode" },
  { id: "review", label: "Review" },
  { id: "log", label: "Log", className: "cs-preview-event-lane-muted" },
];

export const multiLanePalette: Record<CampaignEventKind, EventToken> = {
  user: "--color-cat-1",
  assistant: "--color-cat-2",
  tool: "--color-cat-3",
  thinking: "--color-cat-5",
  accept: "--color-cat-6",
  plan: "--color-cat-8",
  assessment: "--color-cat-9",
  "verdict-ok": "--color-link",
  "verdict-bad": "--color-severe",
  log: "--muted",
};

const multiLaneKinds: CampaignEventKind[] = [
  "user",
  "assistant",
  "tool",
  "thinking",
  "accept",
  "plan",
  "assessment",
  "verdict-ok",
  "verdict-bad",
  "log",
];

export const multiLaneEvents: EventLaneEvent<CampaignEventKind>[] = Array.from(
  { length: 73 },
  (_, i) => {
    const kind = multiLaneKinds[i % multiLaneKinds.length];
    const lane = multiLaneLanes[i % multiLaneLanes.length].id;
    return {
      i,
      lane,
      kind,
      shape: kind === "accept" ? "hollow-circle" : kind === "log" ? "circle" : "square",
      label: `${kind} event ${i + 1}`,
      at: `12:${String(i).padStart(2, "0")}`,
      halo: kind === "verdict-ok"
        ? "--color-accent-bg"
        : kind === "verdict-bad"
          ? "--color-severe-bg"
          : undefined,
      marker: i === 21 || i === 49 ? "spawn" : undefined,
    };
  },
);

export const multiLaneEmphasis = new Set(multiLaneEvents.map((event) => event.i));

export const multiLaneSpans: EventLaneSpan[] = Array.from({ length: 23 }, (_, i) => ({
  lane: multiLaneLanes[i % multiLaneLanes.length].id,
  from: i,
  to: i + multiLaneLanes.length,
}));

export const multiLaneBlindKinds = new Set<CampaignEventKind>([
  "accept",
  "plan",
  "assessment",
]);
