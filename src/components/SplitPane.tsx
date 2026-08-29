"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "../lib/cn";

interface PaneConfig {
  id: string;
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  collapsed?: boolean;
  storageKey?: string;
}

interface SplitPaneProps {
  panes: PaneConfig[];
  className?: string;
}

function readStoredWidth(key?: string, fallback?: number): number | undefined {
  if (!key) return fallback;
  try {
    const val = localStorage.getItem(key);
    if (val) return parseInt(val, 10);
  } catch { /* localStorage may be unavailable */ }
  return fallback;
}

function resolvePane(
  leftPane: PaneConfig,
  rightPane: PaneConfig,
  widths: Record<string, number>
) {
  const isLeftFlex = leftPane.defaultWidth === undefined;
  const pane = isLeftFlex ? rightPane : leftPane;
  const currentWidth = widths[pane.id] ?? pane.defaultWidth ?? 200;
  return {
    paneId: pane.id,
    currentWidth,
    min: pane.minWidth ?? 120,
    max: pane.maxWidth ?? 500,
    direction: (isLeftFlex ? -1 : 1) as 1 | -1,
    storageKey: pane.storageKey,
  };
}

function SplitPaneImpl({ panes, className }: SplitPaneProps) {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    panes.forEach((p) => {
      if (p.defaultWidth !== undefined) {
        initial[p.id] = readStoredWidth(p.storageKey, p.defaultWidth)!;
      }
    });
    return initial;
  });

  const dragging = useRef<{
    paneId: string;
    startX: number;
    startWidth: number;
    min: number;
    max: number;
    direction: 1 | -1;
    storageKey?: string;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, leftPane: PaneConfig, rightPane: PaneConfig) => {
      e.preventDefault();
      const { paneId, currentWidth, min, max, direction, storageKey } =
        resolvePane(leftPane, rightPane, widths);
      dragging.current = {
        paneId,
        startX: e.clientX,
        startWidth: currentWidth,
        min,
        max,
        direction,
        storageKey,
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [widths]
  );

  const handleKeyDown = useCallback(
    (leftPane: PaneConfig, rightPane: PaneConfig) =>
      (e: React.KeyboardEvent) => {
        const step = 10;
        const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
        if (!keys.includes(e.key)) return;
        e.preventDefault();

        const { paneId, currentWidth, min, max, direction } = resolvePane(
          leftPane,
          rightPane,
          widths
        );

        let newWidth = currentWidth;
        if (e.key === "ArrowRight") {
          newWidth = Math.min(max, currentWidth + step * direction);
        } else if (e.key === "ArrowLeft") {
          newWidth = Math.max(min, currentWidth - step * direction);
        } else if (e.key === "Home") {
          newWidth = min;
        } else if (e.key === "End") {
          newWidth = max;
        }

        if (newWidth !== currentWidth) {
          setWidths((prev) => ({ ...prev, [paneId]: newWidth }));
          const key =
            leftPane.defaultWidth === undefined
              ? rightPane.storageKey
              : leftPane.storageKey;
          if (key) {
            try {
              localStorage.setItem(key, String(newWidth));
            } catch { /* localStorage may be unavailable */ }
          }
        }
      },
    [widths]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const { paneId, startX, startWidth, min, max, direction } = dragging.current;
      const delta = (e.clientX - startX) * direction;
      const newWidth = Math.min(max, Math.max(min, startWidth + delta));
      setWidths((prev) => ({ ...prev, [paneId]: newWidth }));
    };

    const handlePointerUp = () => {
      if (!dragging.current) return;
      const { paneId, storageKey } = dragging.current;
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, String(widths[paneId]));
        } catch { /* localStorage may be unavailable */ }
      }
      dragging.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [widths]);

  return (
    <div data-component="SplitPane" className={cn("cs-component-split-pane-20 ", className)}>
      {panes.map((pane, i) => {
        if (pane.collapsed) return null;

        const hasWidth = pane.defaultWidth !== undefined;
        const currentWidth = hasWidth
          ? widths[pane.id] ?? pane.defaultWidth
          : undefined;

        const nextPane = i < panes.length - 1 ? panes[i + 1] : null;
        const showSeparator = nextPane && !nextPane.collapsed;
        const resolved = showSeparator
          ? resolvePane(pane, nextPane, widths)
          : null;

        return (
          <div key={pane.id} className="cs-component-split-pane-21">
            <div
              className={cn("cs-component-split-pane-22", !hasWidth && "cs-component-split-pane-23 ")}
              style={
                hasWidth
                  ? { width: `${currentWidth}px`, flexShrink: 0 }
                  : undefined
              }
            >
              {pane.children}
            </div>
            {showSeparator && resolved && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-valuenow={resolved.currentWidth}
                aria-valuemin={resolved.min}
                aria-valuemax={resolved.max}
                aria-label={`Resize ${resolved.paneId} pane`}
                tabIndex={0}
                className="cs-component-split-pane-30 "
                onPointerDown={(e) => handlePointerDown(e, pane, nextPane)}
                onKeyDown={handleKeyDown(pane, nextPane)}
              >
                <div className="cs-component-split-pane-31 " />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const SplitPane = forwardRefToRoot<HTMLDivElement, SplitPaneProps>(SplitPaneImpl);
