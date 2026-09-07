import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { ChevronDown, ChevronRight, PanelLeftClose } from "lucide-react";
import { cn } from "../lib/cn";

interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Heading, and the accessible name of the group. */
  title: string;
  width?: number | string;
  /**
   * Height in px, or any CSS length. Omitted, the panel fills its container and
   * its body scrolls. `"auto"` sizes the panel to its content and leaves the
   * scrolling to an ancestor, which is what a stack of titled sections in one
   * scrolling sidebar needs.
   */
  height?: number | string;
  collapsed?: boolean;
  onCollapse?: () => void;
  /**
   * What is left on screen when `collapsed`. `"edge"` folds the whole panel
   * away, which is right for a side panel giving its width back. `"header"`
   * keeps the title bar and its toggle, which in a vertical stack is the only
   * thing left to click to bring the panel back.
   */
  collapseTo?: "edge" | "header";
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

function PanelImpl({
  title,
  width,
  height,
  collapsed,
  onCollapse,
  collapseTo = "edge",
  children,
  className,
  actions,
  ...props
}: PanelProps) {
  // Only the edge mode folds the panel itself away. Zeroing the width is what
  // takes the header with it, so the other mode leaves the box alone and lets
  // the body do the disappearing.
  const foldsAway = collapsed && collapseTo === "edge";
  // A panel folding sideways says so with a sideways icon. One collapsing to
  // its own header is a disclosure, and a chevron is what a reader expects.
  const ToggleIcon =
    collapseTo === "header"
      ? collapsed
        ? ChevronRight
        : ChevronDown
      : PanelLeftClose;

  return (
    <div
      role="group"
      aria-label={title}
      {...props}
      data-component="Panel"
      className={cn(
        "cs-component-panel-4 ",
        foldsAway && "cs-component-panel-5 ",
        className
      )}
      style={{
        width: foldsAway ? 0 : typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        flexShrink: foldsAway ? 0 : width ? 0 : undefined,
        flex: foldsAway ? undefined : width ? undefined : 1,
        minWidth: foldsAway ? 0 : width ? undefined : 0,
        overflow: foldsAway ? "hidden" : undefined,
        transition: "width var(--transition-normal)",
      }}
    >
      <div data-part="header" className="cs-component-panel-11 ">
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
              <ToggleIcon className="cs-component-panel-19 " />
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <div data-part="body" className="cs-component-panel-20 ">
          {children}
        </div>
      )}
    </div>
  );
}

export const Panel = forwardRefToRoot<HTMLDivElement, PanelProps>(PanelImpl);
