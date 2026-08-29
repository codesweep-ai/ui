import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { PanelLeftClose } from "lucide-react";
import { cn } from "../lib/cn";

interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Heading, and the accessible name of the group. */
  title: string;
  width?: number | string;
  collapsed?: boolean;
  onCollapse?: () => void;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

function PanelImpl({
  title,
  width,
  collapsed,
  onCollapse,
  children,
  className,
  actions,
  ...props
}: PanelProps) {
  return (
    <div
      role="group"
      aria-label={title}
      {...props}
      data-component="Panel"
      className={cn(
        "cs-component-panel-4 ",
        collapsed && "cs-component-panel-5 ",
        className
      )}
      style={{
        width: collapsed ? 0 : typeof width === "number" ? `${width}px` : width,
        flexShrink: collapsed ? 0 : width ? 0 : undefined,
        flex: collapsed ? undefined : width ? undefined : 1,
        minWidth: collapsed ? 0 : width ? undefined : 0,
        overflow: collapsed ? "hidden" : undefined,
        transition: "width var(--transition-normal)",
      }}
    >
      <div className="cs-component-panel-11 ">
        <span className="text-label-upper cs-component-panel-12">
          {title}
        </span>
        <div className="cs-component-panel-13 ">
          {actions}
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="cs-component-panel-14 "
              aria-label={collapsed ? `Expand ${title} panel` : `Collapse ${title} panel`}
              aria-expanded={!collapsed}
            >
              <PanelLeftClose className="cs-component-panel-19 " />
            </button>
          )}
        </div>
      </div>
      {!collapsed && <div className="cs-component-panel-20 ">{children}</div>}
    </div>
  );
}

export const Panel = forwardRefToRoot<HTMLDivElement, PanelProps>(PanelImpl);
