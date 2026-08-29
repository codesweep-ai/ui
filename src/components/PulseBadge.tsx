import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { cn } from "../lib/cn";
import { accentToken } from "../lib/accentToken";

interface PulseBadgeProps {
  /** Disable the pulse animation (renders a static dot). Default: false */
  paused?: boolean;
  /** Dot size. Default: "md" */
  size?: "sm" | "md" | "lg";
  /** CSS color (token-friendly). Default: var(--color-accent) */
  color?: string;
  /** Accessible label. Defaults to "Live activity". */
  "aria-label"?: string;
  /** Additional className. */
  className?: string;
}

const SIZES: Record<"sm" | "md" | "lg", string> = {
  sm: "cs-component-pulse-badge-9",
  md: "cs-component-pulse-badge-10 ",
  lg: "cs-component-pulse-badge-11",
};

/**
 * Small pulsing dot used inline to signal live activity. By itself, only
 * useful as a visual marker — pair with `AgentStatus` (which renders a
 * PulseBadge in its `in-flight` state) for the canonical composition.
 */
function PulseBadgeImpl({
  paused = false,
  size = "md",
  color,
  className,
  "aria-label": ariaLabel = "Live activity",
}: PulseBadgeProps) {
  return (
    <span
      data-component="PulseBadge"
      role="status"
      aria-label={ariaLabel}
      className={cn(
        paused ? "cs-component-pulse-badge-17 " : "cs-pulse",
        SIZES[size],
        "cs-component-pulse-badge-19",
        className,
      )}
      style={{ background: color ?? accentToken() }}
    />
  );
}

export const PulseBadge = forwardRefToRoot<HTMLSpanElement, PulseBadgeProps>(PulseBadgeImpl);
