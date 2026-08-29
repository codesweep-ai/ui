"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { cn } from "../lib/cn";
import { PulseBadge } from "./PulseBadge";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

export type AgentTraceStepStatus =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "in-flight";

export interface AgentTraceStep {
  /** Stable id. */
  id: string;
  /** Outcome of the step (drives the leading icon). */
  status: AgentTraceStepStatus;
  /** Single-line summary of the step. */
  label: string;
  /** ISO timestamp or formatted string. Rendered right-aligned in `var(--muted)`. */
  timestamp?: string;
  /** Optional expandable detail (rendered when the row is expanded). */
  detail?: ReactNode;
}

interface AgentTraceProps {
  /** The list of steps (in order). */
  steps?: AgentTraceStep[];
  /** Render skeleton rows. */
  loading?: boolean;
  /** Skeleton count when loading. Default: 4 */
  loadingRows?: number;
  /** Render error state in place of steps. */
  error?: Error | string | null;
  /** Primary text for the error state. Default: "Something went wrong" */
  errorMessage?: string;
  /** Retry handler. When provided, an inline Retry button is rendered. */
  onRetry?: () => void;
  /** Primary text for the empty state. Default: "No activity yet." */
  emptyMessage?: string;
  /** Secondary text for the empty state. */
  emptyHint?: string;
  /** Optional CTA in the empty state. */
  emptyAction?: { label: string; onClick: () => void };
  /** Additional className on the wrapper. */
  className?: string;
}

const STATUS_ICON: Record<Exclude<AgentTraceStepStatus, "in-flight">, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
};

const STATUS_COLOR: Record<Exclude<AgentTraceStepStatus, "in-flight">, string> = {
  success: "cs-component-agent-trace-14",
  warning: "cs-component-agent-trace-15",
  error: "cs-component-agent-trace-16",
  info: "cs-component-agent-trace-17",
};

function StatusIcon({ status }: { status: AgentTraceStepStatus }) {
  if (status === "in-flight") {
    return <PulseBadge aria-label="In progress" />;
  }
  const Icon = STATUS_ICON[status];
  return (
    <Icon
      className={cn(
        "cs-component-agent-trace-20 ",
        STATUS_COLOR[status],
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Vertical list of agent steps with status icons, timestamps, and optional
 * expandable details. Use this for the "settled" history of agent activity
 * — for live, in-progress work see `AgentStatus` + `StreamingText`.
 *
 * Includes the canonical loading/error/empty state coverage per
 * `patterns/ComponentStates.md` (precedence: loading > error > empty > data).
 */
function AgentTraceImpl({
  steps = [],
  loading = false,
  loadingRows = 4,
  error = null,
  errorMessage = "Something went wrong",
  onRetry,
  emptyMessage = "No activity yet.",
  emptyHint,
  emptyAction,
  className,
}: AgentTraceProps) {
  const wrapperClass = cn(
    "cs-component-agent-trace-24 ",
    "cs-component-agent-trace-25 ",
    "cs-component-agent-trace-26",
    className,
  );

  if (loading) {
    return (
      <div
        data-component="AgentTrace"
        data-testid="agenttrace-loading"
        className={wrapperClass}
      >
        {Array.from({ length: loadingRows }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "cs-component-agent-trace-29 ",
              "cs-component-agent-trace-30 ",
              i > 0 && "cs-component-agent-trace-31 ",
            )}
          >
            <Skeleton variant="circle" width={14} height={14} />
            <Skeleton width="60%" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    const detail = typeof error === "string" ? error : error.message;
    return (
      <div
        data-component="AgentTrace"
        data-testid="agenttrace-error"
        className={cn(wrapperClass, "cs-component-agent-trace-37 ")}
      >
        <div className="cs-component-agent-trace-38 ">
          <AlertCircle className="cs-component-agent-trace-39 " />
          <span className="cs-component-agent-trace-40 ">
            {errorMessage}
          </span>
          {detail && (
            <span className="cs-component-agent-trace-41 ">
              {detail}
            </span>
          )}
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div
        data-component="AgentTrace"
        data-testid="agenttrace-empty"
        className={cn(wrapperClass, "cs-component-agent-trace-37 ")}
      >
        <div className="cs-component-agent-trace-38 ">
          <Inbox className="cs-component-agent-trace-46 " />
          <span className="cs-component-agent-trace-40 ">
            {emptyMessage}
          </span>
          {emptyHint && (
            <span className="cs-component-agent-trace-41 ">
              {emptyHint}
            </span>
          )}
          {emptyAction && (
            <Button variant="secondary" size="sm" onClick={emptyAction.onClick}>
              {emptyAction.label}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-component="AgentTrace" className={wrapperClass}>
      {steps.map((step, i) => (
        <AgentTraceRow key={step.id} step={step} isFirst={i === 0} />
      ))}
    </div>
  );
}

function AgentTraceRow({ step, isFirst }: { step: AgentTraceStep; isFirst: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const expandable = !!step.detail;

  return (
    <div className={cn(!isFirst && "cs-component-agent-trace-31 ")}>
      <button
        type="button"
        disabled={!expandable}
        onClick={() => expandable && setExpanded((v) => !v)}
        aria-expanded={expandable ? expanded : undefined}
        className={cn(
          "cs-component-agent-trace-51 ",
          "cs-component-agent-trace-30 ",
          "cs-component-agent-trace-52 ",
          "cs-component-agent-trace-53",
          expandable
            ? "cs-component-agent-trace-54 "
            : "cs-component-agent-trace-55",
        )}
      >
        {expandable && (
          <span className="cs-component-agent-trace-56 ">
            {expanded ? (
              <ChevronDown className="cs-component-agent-trace-57 " />
            ) : (
              <ChevronRight className="cs-component-agent-trace-57 " />
            )}
          </span>
        )}
        <StatusIcon status={step.status} />
        <span className="cs-component-agent-trace-58 ">{step.label}</span>
        {step.timestamp && (
          <span className="cs-component-agent-trace-59 ">
            {step.timestamp}
          </span>
        )}
      </button>
      {expandable && expanded && (
        <div
          className={cn(
            "cs-component-agent-trace-60 ",
            "cs-component-agent-trace-41 ",
            "cs-component-agent-trace-61 ",
          )}
        >
          {step.detail}
        </div>
      )}
    </div>
  );
}

export const AgentTrace = forwardRefToRoot<HTMLDivElement, AgentTraceProps>(AgentTraceImpl);
