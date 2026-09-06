"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";

export interface TooltipProps {
  /** What the bubble says. */
  content: ReactNode;
  /** The element the tooltip belongs to. One element, and it must accept a ref and DOM props. */
  children: ReactElement;
  /** Which edge of the trigger the bubble sits on. Default: "top". */
  side?: "top" | "bottom" | "left" | "right";
  /**
   * Announce the bubble through `aria-describedby`. Default: true.
   *
   * Pass false when the bubble only repeats text that is already in the DOM, as a truncated
   * label does. A screen reader reads the full text from the element itself, so announcing the
   * bubble as well says the same thing twice.
   */
  describedBy?: boolean;
  /** How long a hover waits before opening, in milliseconds. Default: 500. Focus never waits. */
  delay?: number;
  /** Render the trigger untouched and never open. Default: false. */
  disabled?: boolean;
  /**
   * Open only when the trigger's own content is actually clipped. Default: false.
   *
   * Measured at open time, so a row whose text fits shows nothing and the same row in a narrower
   * pane shows the full string. This is what a truncated label wants, and it is why the tooltip
   * does not fire on every short name in a list.
   */
  overflowOnly?: boolean;
  /** Optional className merged onto the bubble. */
  className?: string;
}

// Leaving the trigger does not close immediately, so the pointer can travel the gap and land on
// the bubble. WCAG 1.4.13 requires hoverable content, and text long enough to need a tooltip is
// text somebody may want to select.
const GRACE_MS = 120;

type TriggerProps = {
  ref?: Ref<HTMLElement>;
  onMouseEnter?: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLElement>) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  "aria-describedby"?: string;
};

// The ref goes to the trigger, not to the bubble. A tooltip renders no root element of its own,
// and forwardRefToRoot clones whatever a component returns to inject a ref, so a Tooltip used as
// a component's root has to pass that ref through to the element underneath it.
export const Tooltip = forwardRef<HTMLElement, TooltipProps>(function TooltipImpl({
  content,
  children,
  side = "top",
  describedBy = true,
  delay = 500,
  disabled = false,
  overflowOnly = false,
  className,
}: TooltipProps, forwardedRef) {
  const [open, setOpen] = useState(false);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  // Measured at open rather than on every scroll or resize. The bubble closes on Escape, on
  // blur and on leaving the trigger, so it does not outlive the position it was given.
  const place = useCallback(() => {
    const element = triggerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const anchor = {
      top: { x: rect.left + rect.width / 2, y: rect.top },
      bottom: { x: rect.left + rect.width / 2, y: rect.bottom },
      left: { x: rect.left, y: rect.top + rect.height / 2 },
      right: { x: rect.right, y: rect.top + rect.height / 2 },
    }[side];
    setPoint(anchor);
  }, [side]);

  const clipped = useCallback(() => {
    const element = triggerRef.current;
    if (!element) return false;
    return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
  }, []);

  const show = useCallback(
    (wait: number) => {
      if (disabled) return;
      clearTimers();
      const reveal = () => {
        // Measured here rather than at render, because whether a label is clipped depends on the
        // width it ended up with, and that changes as the pane resizes.
        if (overflowOnly && !clipped()) return;
        place();
        setOpen(true);
      };
      if (wait <= 0) reveal();
      else openTimer.current = setTimeout(reveal, wait);
    },
    [clearTimers, clipped, disabled, overflowOnly, place],
  );

  const hide = useCallback(
    (wait = 0) => {
      clearTimers();
      if (wait <= 0) setOpen(false);
      else closeTimer.current = setTimeout(() => setOpen(false), wait);
    },
    [clearTimers],
  );

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Dismissible without moving the pointer, and without losing focus on the trigger.
      if (event.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, hide]);

  if (!isValidElement(children)) return children ?? null;

  // Return the trigger untouched rather than clone it with handlers that can
  // never fire. `disabled` is the escape hatch for a child that cannot take a
  // ref, and cloning one in to reach a tooltip that will not open is the thing
  // the caller asked to avoid.
  if (disabled) return children;

  const child = children as ReactElement<TriggerProps>;
  const childProps = child.props;

  const trigger = cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const original = (child as unknown as { ref?: Ref<HTMLElement> }).ref;
      for (const target of [original, forwardedRef]) {
        if (typeof target === "function") target(node);
        else if (target && typeof target === "object") {
          (target as { current: HTMLElement | null }).current = node;
        }
      }
    },
    onMouseEnter: (event: MouseEvent<HTMLElement>) => {
      childProps.onMouseEnter?.(event);
      show(delay);
    },
    onMouseLeave: (event: MouseEvent<HTMLElement>) => {
      childProps.onMouseLeave?.(event);
      hide(GRACE_MS);
    },
    onFocus: (event: FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(event);
      // Keyboard users get no pointer to rest, so waiting out a hover delay would read as the
      // tooltip simply not working.
      show(0);
    },
    onBlur: (event: FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(event);
      hide();
    },
    ...(open && describedBy ? { "aria-describedby": id } : {}),
  } as Partial<TriggerProps>);

  const bubble =
    open && point && typeof document !== "undefined"
      ? createPortal(
          <div
            id={id}
            role="tooltip"
            data-component="Tooltip"
            data-part="bubble"
            data-side={side}
            // The full string is already on the element this describes, so announcing the
            // bubble as well would say it twice.
            aria-hidden={describedBy ? undefined : true}
            className={cn("cs-tooltip", className)}
            style={{ left: point.x, top: point.y }}
            onMouseEnter={clearTimers}
            onMouseLeave={() => hide(GRACE_MS)}
          >
            {content}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger}
      {bubble}
    </>
  );
});
