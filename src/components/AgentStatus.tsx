import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import type { ReactNode } from "react";
import { CheckCircle2, HelpCircle, AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { PulseBadge } from "./PulseBadge";

type AgentState = "in-flight" | "paused" | "settled" | "error";

interface AgentStatusProps {
  /** Current activity state. Drives the leading indicator (pulse, icon) and color. */
  state: AgentState;
  /** Status text. Use a specific verb phrase: "Reading 142 files…", not "Loading…". */
  children: ReactNode;
  /** Optional icon override for "paused" or "settled". Ignored for "in-flight" (always PulseBadge). */
  icon?: ReactNode;
  /** Optional className on the row. */
  className?: string;
}

const STATE_ICON: Record<Exclude<AgentState, "in-flight">, LucideIcon> = {
  paused: HelpCircle,
  settled: CheckCircle2,
  error: AlertTriangle,
};

const STATE_ICON_COLOR: Record<Exclude<AgentState, "in-flight">, string> = {
  paused: "cs-component-agent-status-11",
  settled: "cs-component-agent-status-12",
  error: "cs-component-agent-status-13",
};

/**
 * Single-line status row for visible agent work. Composed of a leading
 * indicator (PulseBadge when in-flight, icon otherwise) and a verb-phrase
 * text body. Used as the header of an agent-activity panel; see
 * `patterns/AgentActivity.md`.
 */
function AgentStatusImpl({
  state,
  children,
  icon,
  className,
}: AgentStatusProps) {
  const leading =
    state === "in-flight" ? (
      <PulseBadge aria-label="Working" />
    ) : icon ? (
      icon
    ) : (() => {
        const Icon = STATE_ICON[state];
        return (
          <Icon
            className={cn(
              "cs-component-agent-status-16 ",
              STATE_ICON_COLOR[state],
            )}
            aria-hidden="true"
          />
        );
      })();

  return (
    <div
      data-component="AgentStatus"
      data-state={state}
      role="status"
      aria-live="polite"
      className={cn(
        "cs-component-agent-status-21 ",
        "cs-component-agent-status-22 ",
        className,
      )}
    >
      {leading}
      <span className="cs-component-agent-status-23">{children}</span>
    </div>
  );
}

export const AgentStatus = forwardRefToRoot<HTMLDivElement, AgentStatusProps>(AgentStatusImpl);
