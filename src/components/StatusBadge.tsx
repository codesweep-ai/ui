import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { cn } from "../lib/cn";

interface StatusBadgeProps {
  label: string;
  status: "success" | "info" | "warning" | "error" | "severe" | "neutral";
  /** Override the leading dot colour with any CSS colour. */
  color?: string;
  size?: "sm" | "md" | "lg";
  emphasis?: "default" | "ring" | "label";
  /** Announce changing badge content through a polite live region. */
  announce?: boolean;
  full?: boolean;
  className?: string;
}

const dotColors: Record<string, string> = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
  neutral: "var(--color-neutral)",
  info: "var(--color-info)",
  severe: "var(--color-severe)",
};

const labelColors: Record<string, string> = {
  error: "var(--color-error-text)",
  severe: "var(--color-severe)",
};

function StatusBadgeImpl({
  label,
  status,
  full,
  className,
  color,
  size = "md",
  emphasis = "default",
  announce = false,
}: StatusBadgeProps) {
  return (
    <span
      data-component="StatusBadge"
      role={announce ? "status" : "img"}
      aria-live={announce ? "polite" : undefined}
      aria-label={`${label}: ${status}`}
      style={{
        "--status-badge-color": color ?? dotColors[status],
        "--status-badge-label-color": labelColors[status] ?? "var(--muted)",
      } as React.CSSProperties}
      className={cn(
        "cs-component-status-badge-15 ",
        "cs-component-status-badge-16 ",
        "cs-component-status-badge-17 ",
        full && "cs-component-status-badge-18",
        size === "sm" && "cs-component-status-badge-22",
        size === "lg" && "cs-component-status-badge-23",
        emphasis === "ring" && "cs-component-status-badge-24",
        emphasis === "label" && "cs-component-status-badge-25",
        className
      )}
    >
      <span
        className="cs-component-status-badge-19 "
        style={{ backgroundColor: "var(--status-badge-color)" }}
        aria-hidden="true"
      />
      <span data-status-badge-label="" className="text-label-upper cs-component-status-badge-21">
        {label}
      </span>
    </span>
  );
}

export const StatusBadge = forwardRefToRoot<HTMLSpanElement, StatusBadgeProps>(StatusBadgeImpl);
