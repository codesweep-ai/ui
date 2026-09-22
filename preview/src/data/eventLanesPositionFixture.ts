import type { EventLane, EventLaneEvent, EventLaneLink, EventLaneSpan, EventToken } from "@codesweep-ai/ui";

/** A synthetic multi-agent run for EventLanes' positioned layout. Everything in
 *  it is invented by a seeded generator, so the preview and the tests draw the
 *  same run every time and nothing in it comes from a real one.
 *
 *  A coordinator hands tasks to workers. Each worker is one timeline of two
 *  lanes: steps rise above its line, and the waits between them hang below as
 *  hatched bars. Every other member is shaded as a band, with a gap before
 *  each. A task is a span on the worker, from the hand-off to the reply, with
 *  a trailing segment until the coordinator takes the reply up. A solid link
 *  joins the hand-off to the worker's first step, and a dashed one joins the
 *  reply to the coordinator's acceptance. A failed step carries a marker in
 *  the error colour. Positions are seconds from the start. */

export type PositionKind = "handoff" | "reasoning" | "action" | "reply" | "accept" | "wait" | "idle";

export const positionPalette: Record<PositionKind, EventToken> = {
  handoff: "--color-cat-1",
  reasoning: "--color-cat-5",
  action: "--color-cat-3",
  reply: "--color-cat-2",
  accept: "--color-cat-7",
  wait: "--color-structural",
  idle: "--muted",
};

export interface PositionRun {
  lanes: EventLane[];
  events: EventLaneEvent<PositionKind>[];
  spans: EventLaneSpan[];
  links: EventLaneLink[];
  /** Seconds from the start to the last position in the run. */
  duration: number;
}

/** Mulberry32: small, fast, and the same sequence on every engine. */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

const WORKER_NAMES = ["A", "B", "C", "D", "E", "F"];
const LOG_CEILING = Math.log1p(120);
const WAIT_CEILING = Math.log1p(3_600);

/** A step's magnitude: the log of its duration against a two-minute ceiling. */
function stepMagnitude(seconds: number) {
  return Math.min(1, Math.log1p(seconds) / LOG_CEILING);
}

function waitMagnitude(seconds: number) {
  return Math.min(1, Math.log1p(seconds) / WAIT_CEILING);
}

export function clock(seconds: number) {
  const whole = Math.max(0, Math.round(seconds));
  const hours = Math.floor(whole / 3_600);
  const minutes = Math.floor((whole % 3_600) / 60);
  const rest = whole % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** About `steps` worker steps across `workers` workers, from `seed`. */
export function positionRun({ steps = 2_600, workers = 6, seed = 7 }: { steps?: number; workers?: number; seed?: number } = {}): PositionRun {
  const next = random(seed);
  const count = Math.max(1, Math.min(WORKER_NAMES.length, workers));
  const lanes: EventLane[] = [
    { id: "coordinator", label: "Coordinator", height: 40, bars: "up", barFloor: 2, group: "coordinator" },
    { id: "coordinator-wait", label: "", height: 18, bars: "down", barFloor: 2, group: "coordinator", overview: false },
  ];
  for (let worker = 0; worker < count; worker += 1) {
    const name = WORKER_NAMES[worker];
    // The coordinator is the first member, so the even workers take the shade.
    const shade: EventToken | undefined = worker % 2 === 0 ? "--color-bg-muted" : undefined;
    lanes.push(
      { id: `worker-${name}`, label: `Worker ${name}`, height: 40, bars: "up", barFloor: 2, group: `worker-${name}`, gapBefore: 8, shade },
      { id: `worker-${name}-wait`, label: "", height: 18, bars: "down", barFloor: 2, group: `worker-${name}`, overview: false, shade },
    );
  }

  const events: EventLaneEvent<PositionKind>[] = [];
  const spans: EventLaneSpan[] = [];
  const links: EventLaneLink[] = [];
  let index = 0;
  const add = (lane: string, kind: PositionKind, position: number, label: string, magnitude: number, extra: Partial<EventLaneEvent<PositionKind>> = {}) => {
    const event: EventLaneEvent<PositionKind> = {
      i: index,
      lane,
      kind,
      shape: kind === "accept" ? "hollow" : kind === "wait" || kind === "idle" ? "hatched" : "square",
      label,
      at: clock(position),
      position,
      magnitude,
      ...extra,
    };
    index += 1;
    events.push(event);
    return event;
  };

  // The coordinator thinks between hand-offs; its steps are sparse.
  let now = 0;
  const workerFree = Array.from({ length: count }, () => 0);
  const perTask = Math.max(8, Math.round(steps / (count * 4)));
  let stepsLeft = steps;
  let task = 1;
  const pendingAccepts: { at: number; reply: number; span: EventLaneSpan }[] = [];

  while (stepsLeft > 0) {
    // A few coordinator steps, then a hand-off to the worker free soonest.
    for (let step = 0; step < 3; step += 1) {
      const seconds = 2 + next() * 25;
      add("coordinator", next() < 0.5 ? "reasoning" : "action", now, `Coordinator step`, stepMagnitude(seconds));
      now += seconds;
    }
    let worker = 0;
    for (let candidate = 1; candidate < count; candidate += 1) if (workerFree[candidate] < workerFree[worker]) worker = candidate;
    const name = WORKER_NAMES[worker];
    const handoff = add("coordinator", "handoff", now, `Hand-off of task ${task}`, 0.2);
    const start = Math.max(now + 1 + next() * 4, workerFree[worker]);

    // The worker: a burst of short steps, then sparser long ones, with waits.
    const length = Math.max(4, Math.min(stepsLeft, Math.round(perTask * (0.3 + next() * 1.4))));
    let at = start;
    let first: EventLaneEvent<PositionKind> | undefined;
    for (let step = 0; step < length; step += 1) {
      const dense = step < length / 3;
      const seconds = dense ? 0.2 + next() * 3 : 1 + next() * next() * 110;
      const kind: PositionKind = next() < 0.45 ? "action" : "reasoning";
      const failed = next() < 0.002;
      const mark = add(`worker-${name}`, kind, at, `Worker ${name} step ${step + 1}`, stepMagnitude(seconds), {
        clipped: seconds > 100,
        error: failed,
        marker: failed ? "failed" : undefined,
        markerToken: failed ? "--color-error" : undefined,
      });
      first ??= mark;
      at += seconds;
      if (!dense && next() < 0.12) {
        const wait = 20 + next() * 400;
        add(`worker-${name}-wait`, "wait", at, `Worker ${name} waits`, waitMagnitude(wait));
        at += wait;
      }
    }
    const reply = add(`worker-${name}`, "reply", at, `Reply to task ${task}`, 0.3, { tick: true });
    const span: EventLaneSpan = { lane: `worker-${name}`, from: start, to: at, id: `task-${task}`, label: `Task ${task} · ${length} steps` };
    spans.push(span);
    links.push({ from: handoff.i, to: first!.i });
    pendingAccepts.push({ at: at + 5 + next() * 90, reply: reply.i, span });
    workerFree[worker] = at + 10;
    stepsLeft -= length;
    task += 1;
    now += 5 + next() * 60;

    // The coordinator takes up any reply that has arrived, and waits for the
    // next one when every worker is busy.
    pendingAccepts.sort((a, b) => a.at - b.at);
    while (pendingAccepts.length > 0 && (pendingAccepts[0].at <= now || pendingAccepts.length >= count)) {
      const accepted = pendingAccepts.shift()!;
      if (accepted.at > now) {
        add("coordinator-wait", "idle", now, "Coordinator waits", waitMagnitude(accepted.at - now));
        now = accepted.at;
      }
      const accept = add("coordinator", "accept", now, `Accepts task ${accepted.span.id!.slice(5)}`, 0.2);
      accepted.span.trail = now;
      links.push({ from: accepted.reply, to: accept.i, style: "dashed" });
      now += 1 + next() * 5;
    }
  }
  for (const accepted of pendingAccepts.sort((a, b) => a.at - b.at)) {
    now = Math.max(now, accepted.at);
    const accept = add("coordinator", "accept", now, `Accepts task ${accepted.span.id!.slice(5)}`, 0.2);
    accepted.span.trail = now;
    links.push({ from: accepted.reply, to: accept.i, style: "dashed" });
    now += 2;
  }
  return { lanes, events, spans, links, duration: now };
}
