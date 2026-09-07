"use client";

import { forwardRef } from "react";

import { checkedRootRef } from "../lib/stylesheetWarning";
import { cn } from "../lib/cn";

export interface PageProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  /**
   * Cap the content width and centre it. Default `"full"`, which runs edge to
   * edge for a dashboard or a wide table. `"readable"` caps it at
   * `--page-max-width`, so a line of text does not run the width of a large
   * monitor. Added v0.3.0.
   */
  width?: "full" | "readable";
  /** Inset the content from the window edge. Default true. Added v0.3.0. */
  padded?: boolean;
  /**
   * Own the vertical scroll, so the page scrolls once and no descendant clips
   * content a pointer cannot reach. Default true. Set false when this sits
   * inside a scroller that already owns it. Added v0.3.0.
   */
  scroll?: boolean;
  /** Root element. Default `"main"`, the landmark AppShell leaves to the page. */
  as?: React.ElementType;
  className?: string;
}

function PageImpl(
  {
    children,
    width = "full",
    padded = true,
    scroll = true,
    as: Component = "main",
    className,
    tabIndex,
    ...rest
  }: PageProps,
  ref: React.ForwardedRef<HTMLElement>,
) {
  return (
    <Component
      ref={checkedRootRef(ref)}
      data-component="Page"
      // A scroll container holding no focusable element is unreachable by
      // keyboard, which axe reports as scrollable-region-focusable. An
      // explicit tabIndex from the consumer still wins.
      tabIndex={scroll && tabIndex === undefined ? 0 : tabIndex}
      className={cn(
        "cs-component-page-1 ",
        padded && "cs-component-page-2",
        scroll && "cs-component-page-3",
        width === "readable" && "cs-component-page-4",
        scroll && width === "readable" && "cs-component-page-6",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

export const Page = forwardRef<HTMLElement, PageProps>(PageImpl);
