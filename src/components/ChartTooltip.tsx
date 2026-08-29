import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import type { ReactNode, CSSProperties } from "react";
import { cn } from "../lib/cn";

interface ChartTooltipProps {
  /** Whether the tooltip is shown. Default: true */
  visible?: boolean;
  /**
   * Position relative to the chart's positioned container. The tooltip is
   * absolutely positioned; the consumer supplies the cursor coordinates.
   */
  x: number;
  y: number;
  /**
   * Anchor: where the (x, y) point sits relative to the tooltip box.
   * Default "top" — tooltip is centered horizontally above the point.
   */
  anchor?: "top" | "bottom" | "left" | "right";
  /** Tooltip content. Consumers build the rows; the box handles chrome. */
  children: ReactNode;
  className?: string;
}

const ANCHOR_TRANSFORM: Record<NonNullable<ChartTooltipProps["anchor"]>, string> = {
  top: "translate(-50%, calc(-100% - 8px))",
  bottom: "translate(-50%, 8px)",
  left: "translate(calc(-100% - 8px), -50%)",
  right: "translate(8px, -50%)",
};

/**
 * Token-styled, absolutely-positioned chart tooltip. The chart computes the
 * cursor position and the content; this component handles bg / border / shadow
 * / radius so every chart's tooltip looks identical. See patterns/Chart.md.
 *
 * Render inside a `position: relative` container (the same one the chart's SVG
 * sits in) so the absolute coordinates line up.
 */
function ChartTooltipImpl({
  visible = true,
  x,
  y,
  anchor = "top",
  children,
  className,
}: ChartTooltipProps) {
  if (!visible) return null;

  const style: CSSProperties = {
    left: x,
    top: y,
    transform: ANCHOR_TRANSFORM[anchor],
  };

  return (
    <div
      data-component="ChartTooltip"
      role="tooltip"
      style={style}
      className={cn(
        "cs-component-chart-tooltip-15 ",
        "cs-component-chart-tooltip-16",
        "cs-component-chart-tooltip-17 ",
        "cs-component-chart-tooltip-18",
        "cs-component-chart-tooltip-19 ",
        "cs-component-chart-tooltip-20 ",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const ChartTooltip = forwardRefToRoot<HTMLDivElement, ChartTooltipProps>(ChartTooltipImpl);
