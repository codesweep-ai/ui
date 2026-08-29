"use client";

import { forwardRef, useState, useCallback } from "react";
import { cn } from "../lib/cn";
import { CardGroupContext } from "./CardGroupContext";

interface CardGroupProps {
  children: React.ReactNode;
  maximizedId?: string | null;
  onMaximizedChange?: (id: string | null) => void;
  /**
   * Fill the group's height and distribute it across cards (each scrolls
   * internally) — the fixed-viewport dashboard layout. Default true. Set
   * false for a natural-height stack where the page scrolls instead. A
   * maximized card fills the viewport in either mode. Added v1.7.0.
   */
  fill?: boolean;
  className?: string;
}

function CardGroupImpl({
  children,
  maximizedId: controlledId,
  onMaximizedChange,
  fill = true,
  className,
}: CardGroupProps, ref: React.ForwardedRef<HTMLDivElement>) {
  const [internalId, setInternalId] = useState<string | null>(null);

  const isControlled = controlledId !== undefined;
  const maximizedId = isControlled ? controlledId : internalId;

  const toggle = useCallback(
    (id: string) => {
      const next = maximizedId === id ? null : id;
      if (isControlled) {
        onMaximizedChange?.(next);
      } else {
        setInternalId(next);
      }
    },
    [maximizedId, isControlled, onMaximizedChange]
  );

  // Fill the viewport when filling, OR whenever a card is maximized (so the
  // maximized card can expand to full height even in a natural-stack group).
  const fillsHeight = fill || maximizedId !== null;

  return (
    <CardGroupContext.Provider value={{ maximizedId, toggle, fill }}>
      <div
        ref={ref}
        data-component="CardGroup"
        className={cn(
          "cs-component-card-group-5 ",
          fillsHeight && "cs-component-card-group-6",
          className
        )}
      >
        {children}
      </div>
    </CardGroupContext.Provider>
  );
}

export const CardGroup = forwardRef<HTMLDivElement, CardGroupProps>(CardGroupImpl);
