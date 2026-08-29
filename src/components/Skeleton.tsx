import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { cn } from "../lib/cn";

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "rect" | "circle";
  className?: string;
}

function toCss(value?: string | number): string | undefined {
  if (value == null) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

function SkeletonImpl({
  width = "100%",
  height,
  variant = "text",
  className,
}: SkeletonProps) {
  const resolvedHeight = height ?? (variant === "text" ? "1em" : "100%");
  const isCircle = variant === "circle";

  return (
    <span
      data-component="Skeleton"
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className={cn("cs-skeleton", isCircle && "cs-skeleton--circle", className)}
      style={{
        width: toCss(width),
        height: toCss(resolvedHeight),
        borderRadius: isCircle
          ? "50%"
          : variant === "rect"
            ? "var(--radius-sm)"
            : "2px",
      }}
    />
  );
}

export const Skeleton = forwardRefToRoot<HTMLDivElement, SkeletonProps>(SkeletonImpl);
