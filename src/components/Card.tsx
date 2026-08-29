"use client";

import { forwardRef } from "react";
import { ChevronDown, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "../lib/cn";
import { useCardGroup } from "./CardGroupContext";
import { Skeleton } from "./Skeleton";

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  header?: React.ReactNode;
  children: React.ReactNode;
  variant?: "default" | "muted" | "success" | "warning" | "danger" | "tight";
  className?: string;
  id?: string;
  maximizable?: boolean;
  as?: React.ElementType;
  interactive?: boolean;
  onActivate?: () => void;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Loading state: replace card body with skeleton lines (header preserved). Added v1.2.0. */
  loading?: boolean;
}

const variantStyles: Record<string, string> = {
  default: "cs-component-card-10 ",
  muted: "cs-component-card-11 ",
  success:
    "cs-component-card-12 ",
  warning: "cs-component-card-15 ",
  danger:
    "cs-component-card-13 ",
  tight: "cs-component-card-14 ",
};

export const Card = forwardRef<HTMLElement, CardProps>(function CardImpl({
  header,
  children,
  variant = "default",
  className,
  id,
  maximizable,
  loading,
  as: Component = "div",
  interactive,
  onActivate,
  collapsible,
  collapsed = false,
  onToggle,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ...rest
}: CardProps, ref) {
  const group = useCardGroup();

  const isMaximizable = !!group && !!id && !!maximizable;
  const isMaximized = isMaximizable && group.maximizedId === id;
  const isHidden = !!group && !!id && group.maximizedId !== null && group.maximizedId !== id;

  if (isHidden) {
    return (
      <Component
        {...rest}
        ref={ref}
        id={id}
        data-component="Card"
        className={cn("cs-component-card-17", className)}
      />
    );
  }

  const Icon = isMaximized ? Minimize2 : Maximize2;

  // Flex-fill the group's height only when the group is filling, or when this
  // card is maximized. In a natural-stack group (fill={false}), unmaximized
  // cards size to their content and the page scrolls.
  const fillCard = !!group && (group.fill || isMaximized);
  const isInteractive = interactive || !!onActivate;

  return (
    <Component
      {...rest}
      ref={ref}
      id={id}
      data-component="Card"
      role={role ?? (isInteractive ? "button" : undefined)}
      tabIndex={tabIndex ?? (isInteractive ? 0 : undefined)}
      onClick={(event: React.MouseEvent<HTMLElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) onActivate?.();
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented && isInteractive && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onActivate?.();
        }
      }}
      className={cn(
        "cs-component-card-19 ",
        variantStyles[variant],
        isInteractive && "cs-component-card-16",
        header && "cs-component-card-20",
        fillCard && "cs-component-card-21",
        className
      )}
    >
      {header && (
        <div
          data-card-header=""
          className={cn(
            "cs-component-card-22 ",
            (isMaximizable || collapsible) && "cs-component-card-23 "
          )}
        >
          <span>{header}</span>
          {(collapsible || isMaximizable) && (
            <span className="cs-component-card-23">
              {collapsible && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle?.();
                  }}
                  className="cs-component-card-24 "
                  aria-label={collapsed ? "Expand" : "Collapse"}
                  aria-expanded={!collapsed}
                >
                  {collapsed ? (
                    <ChevronRight className="cs-component-card-27 " />
                  ) : (
                    <ChevronDown className="cs-component-card-27 " />
                  )}
                </button>
              )}
              {isMaximizable && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    group.toggle(id);
                  }}
                  className="cs-component-card-24 "
                  // "Maximize"/"Minimize" named the icon, not the behaviour:
                  // this solos the card and *hides its siblings*, which reads
                  // as expand/collapse and is not (OPEN.md §7.13). Collapse is
                  // a separate control, above, behind `collapsible`.
                  aria-label={isMaximized ? "Show all cards" : "Show only this card"}
                  title={isMaximized ? "Show all cards" : "Show only this card — its siblings are hidden"}
                >
                  <Icon className="cs-component-card-27 " />
                </button>
              )}
            </span>
          )}
        </div>
      )}
      {!collapsed && (header ? (
        <div
          className={cn(
            variant === "tight" ? "cs-component-card-29" : "cs-component-card-30",
            fillCard && "cs-component-card-31 ",
            isMaximized && "cs-component-card-32 "
          )}
        >
          {loading ? <CardSkeletonBody /> : children}
        </div>
      ) : loading ? (
        <div className="cs-component-card-30">
          <CardSkeletonBody />
        </div>
      ) : (
        children
      ))}
    </Component>
  );
});

function CardSkeletonBody() {
  return (
    <div
      data-testid="card-loading"
      className="cs-component-card-34 "
    >
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="65%" />
      <Skeleton variant="text" width="75%" />
    </div>
  );
}
