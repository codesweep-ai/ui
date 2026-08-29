"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { useEffect, useState } from "react";
import { cn } from "../lib/cn";
import { subscribeToasts, toast, type ToastItem } from "../lib/toast";
import { Toast } from "./Toast";

export interface ToastContainerProps {
  className?: string;
}

/**
 * Host for the toast system. Mount **once** at the app root. It subscribes to
 * the toast store, renders the stack (bottom-right, 8px gap), and runs the
 * per-item auto-dismiss timers. Call `toast.success(...)` etc. from anywhere
 * to add a toast.
 */
function ToastContainerImpl({ className }: ToastContainerProps) {
  const [items, setItems] = useState<ToastItem[]>([]);

  // Subscribe once. The first listener call delivers the current snapshot.
  useEffect(() => subscribeToasts(setItems), []);

  // Per-item auto-dismiss timers — only for items with a finite duration.
  useEffect(() => {
    const timers: number[] = [];
    for (const t of items) {
      if (t.duration && t.duration > 0) {
        timers.push(window.setTimeout(() => toast.dismiss(t.id), t.duration));
      }
    }
    return () => {
      for (const id of timers) window.clearTimeout(id);
    };
  }, [items]);

  return (
    <div
      data-component="ToastContainer"
      // pointer-events-none on the stack so it doesn't block clicks under it;
      // each Toast re-enables pointer events on itself.
      className={cn(
        "cs-component-toast-container-6 ",
        "cs-component-toast-container-7 ",
        className,
      )}
    >
      {items.map((t) => (
        <Toast key={t.id} item={t} onDismiss={() => toast.dismiss(t.id)} />
      ))}
    </div>
  );
}

export const ToastContainer = forwardRefToRoot<HTMLDivElement, ToastContainerProps>(ToastContainerImpl);
