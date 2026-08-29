"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn";

interface StreamingTextProps {
  /** Full target string. The component reveals characters of this string over time. */
  text: string;
  /** Characters revealed per second. Default: 40 */
  speed?: number;
  /**
   * When true, snap to full `text` and hide the cursor. Use when the upstream
   * source is no longer producing new tokens. Default: false.
   */
  done?: boolean;
  /** Fires once after the last character is revealed. */
  onDone?: () => void;
  /** Disable cursor rendering even while streaming. Default: false. */
  hideCursor?: boolean;
  /** Additional className on the wrapper. */
  className?: string;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Token-by-token reveal of `text` at `speed` chars/sec, with a blinking
 * trailing cursor while content is still streaming. Snaps to full text and
 * hides the cursor when `done={true}` or when the user's OS has reduced
 * motion enabled. See `patterns/AgentActivity.md`.
 */
function StreamingTextImpl({
  text,
  speed = 40,
  done = false,
  onDone,
  hideCursor = false,
  className,
}: StreamingTextProps) {
  const [revealed, setRevealed] = useState(() =>
    done || prefersReducedMotion() ? text.length : 0,
  );
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const firedDoneRef = useRef(false);

  useEffect(() => {
    if (done || prefersReducedMotion()) {
      setRevealed(text.length);
      return;
    }
    // Reset when the target text changes (new message).
    setRevealed((r) => Math.min(r, text.length));
    firedDoneRef.current = false;

    if (speed <= 0) {
      setRevealed(text.length);
      return;
    }

    const intervalMs = Math.max(8, Math.floor(1000 / speed));
    const id = setInterval(() => {
      setRevealed((r) => {
        if (r >= text.length) {
          clearInterval(id);
          return r;
        }
        return r + 1;
      });
    }, intervalMs);

    return () => clearInterval(id);
  }, [text, speed, done]);

  useEffect(() => {
    if (revealed >= text.length && !firedDoneRef.current && text.length > 0) {
      firedDoneRef.current = true;
      onDoneRef.current?.();
    }
  }, [revealed, text.length]);

  const isStreaming = !done && revealed < text.length;
  const showCursor = !hideCursor && (isStreaming || !done && text.length === 0);

  return (
    <span
      data-component="StreamingText"
      data-streaming={isStreaming ? "true" : "false"}
      className={cn(
        "cs-component-streaming-text-8 ",
        "cs-component-streaming-text-9 ",
        className,
      )}
    >
      {text.slice(0, revealed)}
      {showCursor && (
        <span
          aria-hidden="true"
          data-testid="streamingtext-cursor"
          className="cs-stream-cursor"
        />
      )}
    </span>
  );
}

export const StreamingText = forwardRefToRoot<HTMLSpanElement, StreamingTextProps>(StreamingTextImpl);
