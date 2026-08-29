import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

interface ChartFrameProps {
  /** Title shown in the frame header. */
  title?: string;
  /** Optional actions rendered on the right of the header (legend toggle, export, …). */
  actions?: ReactNode;
  /** Fixed height for the chart body. Accepts a number (px) or any CSS length. Default: 240 */
  height?: number | string;
  /** The chart. Rendered only in the happy path. */
  children: ReactNode;

  // ── State coverage (patterns/ComponentStates.md) ──
  loading?: boolean;
  error?: Error | string | null;
  errorMessage?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  emptyHint?: string;
  emptyAction?: { label: string; onClick: () => void };
  /**
   * Whether the chart is empty. When true (and not loading/error), the empty
   * state renders. Defaults to false — pass `empty={data.length === 0}`.
   */
  empty?: boolean;

  className?: string;
}

/**
 * Card frame around a chart: card background, padding, optional title, and the
 * canonical loading / error / empty states (precedence loading > error > empty
 * > data). The chart renders *inside* the frame and only needs to handle the
 * happy path. See patterns/Chart.md.
 */
function ChartFrameImpl({
  title,
  actions,
  height = 240,
  children,
  loading = false,
  error = null,
  errorMessage = "Couldn't load chart",
  onRetry,
  emptyMessage = "No data to chart.",
  emptyHint,
  emptyAction,
  empty = false,
  className,
}: ChartFrameProps) {
  const bodyHeight = typeof height === "number" ? `${height}px` : height;

  let body: ReactNode;
  if (loading) {
    body = (
      <div data-testid="chartframe-loading" className="cs-component-chart-frame-12 ">
        {/* Bar-chart-like skeleton: a row of rising bars */}
        <div className="cs-component-chart-frame-13 ">
          {[40, 65, 50, 80, 55, 70, 45, 60].map((h, i) => (
            <Skeleton key={i} variant="rect" width="100%" height={`${h}%`} />
          ))}
        </div>
      </div>
    );
  } else if (error) {
    const detail = typeof error === "string" ? error : error.message;
    body = (
      <div
        data-testid="chartframe-error"
        className="cs-component-chart-frame-20 "
      >
        <AlertCircle className="cs-component-chart-frame-21 " />
        <span className="cs-component-chart-frame-22 ">{errorMessage}</span>
        {detail && (
          <span className="cs-component-chart-frame-23 ">{detail}</span>
        )}
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  } else if (empty) {
    body = (
      <div
        data-testid="chartframe-empty"
        className="cs-component-chart-frame-20 "
      >
        <Inbox className="cs-component-chart-frame-27 " />
        <span className="cs-component-chart-frame-22 ">{emptyMessage}</span>
        {emptyHint && (
          <span className="cs-component-chart-frame-23 ">{emptyHint}</span>
        )}
        {emptyAction && (
          <Button variant="secondary" size="sm" onClick={emptyAction.onClick}>
            {emptyAction.label}
          </Button>
        )}
      </div>
    );
  } else {
    body = children;
  }

  return (
    <div
      data-component="ChartFrame"
      className={cn(
        "cs-component-chart-frame-31 ",
        "cs-component-chart-frame-32 ",
        "cs-component-chart-frame-33",
        className,
      )}
    >
      {(title || actions) && (
        <div className="cs-component-chart-frame-34 ">
          {title ? (
            <span className="text-label-upper cs-component-chart-frame-35">{title}</span>
          ) : (
            <span />
          )}
          {actions && <div className="cs-component-chart-frame-36 ">{actions}</div>}
        </div>
      )}
      <div className="cs-component-chart-frame-37 " style={{ height: bodyHeight }}>
        {body}
      </div>
    </div>
  );
}

export const ChartFrame = forwardRefToRoot<HTMLDivElement, ChartFrameProps>(ChartFrameImpl);
