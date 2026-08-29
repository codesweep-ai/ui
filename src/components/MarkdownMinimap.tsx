"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "../lib/cn";

interface MarkdownMinimapProps {
  contentRef: React.RefObject<HTMLDivElement>;
  className?: string;
}

// Canvas drawing constants (px) — Canvas 2D API requires numeric values;
// colors are read from CSS tokens at draw time via getToken().
const HEADING_BLOCK_INSET = 4;
const CONTENT_BLOCK_INSET = 8;
const MIN_HEADING_HEIGHT = 3;
const MIN_CONTENT_HEIGHT = 1;
const MIN_BLOCK_HEIGHT = 2;
const VIEWPORT_ALPHA = 0.6;
const INITIAL_DRAW_DELAY = 100;

function getToken(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

function MarkdownMinimapImpl({ contentRef, className }: MarkdownMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const drawMinimap = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!canvas || !container || !content) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;
    const contentHeight = content.scrollHeight;
    const viewportHeight = content.clientHeight;
    const scrollTop = content.scrollTop;

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    const scale = containerHeight / contentHeight;
    const viewportTop = scrollTop * scale;
    const viewportSize = viewportHeight * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const mutedColor = getToken("--muted");
    const borderColor = getToken("--border");

    const elements = content.querySelectorAll(
      "h1, h2, h3, h4, h5, h6, p, pre, table, .md-mermaid, .md-alert"
    );
    const contentRect = content.getBoundingClientRect();

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const relativeTop = rect.top - contentRect.top + content.scrollTop;
      const y = relativeTop * scale;
      const height = Math.max(rect.height * scale, MIN_BLOCK_HEIGHT);
      const tag = el.tagName;

      if (tag.match(/^H[1-6]$/)) {
        ctx.fillStyle = mutedColor;
        ctx.fillRect(HEADING_BLOCK_INSET, y, containerWidth - HEADING_BLOCK_INSET * 2, Math.max(height, MIN_HEADING_HEIGHT));
      } else {
        ctx.fillStyle = borderColor;
        ctx.fillRect(CONTENT_BLOCK_INSET, y, containerWidth - CONTENT_BLOCK_INSET * 2, Math.max(height, MIN_CONTENT_HEIGHT));
      }
    });

    const accentBg = getToken("--color-accent-bg-strong");
    const accentStroke = getToken("--color-link");

    ctx.fillStyle = accentBg;
    ctx.globalAlpha = VIEWPORT_ALPHA;
    ctx.fillRect(0, viewportTop, containerWidth, viewportSize);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = accentStroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, viewportTop + 0.5, containerWidth - 1, viewportSize - 1);
  }, [contentRef]);

  useEffect(() => {
    const content = contentRef.current;
    const container = containerRef.current;
    if (!content) return;

    const handleScroll = () => {
      requestAnimationFrame(drawMinimap);
    };

    content.addEventListener("scroll", handleScroll);
    const timeoutId = setTimeout(drawMinimap, INITIAL_DRAW_DELAY);

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(drawMinimap);
    });
    resizeObserver.observe(content);
    if (container) resizeObserver.observe(container);

    const themeObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "data-theme") {
          requestAnimationFrame(drawMinimap);
        }
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true });

    return () => {
      content.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, [contentRef, drawMinimap]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const content = contentRef.current;
      if (!canvas || !content) return;

      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const scale = canvas.height / content.scrollHeight;
      const scrollTo = y / scale - content.clientHeight / 2;

      content.scrollTo({
        top: Math.max(0, scrollTo),
        behavior: "smooth",
      });
    },
    [contentRef]
  );

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging.current) return;

      const canvas = canvasRef.current;
      const content = contentRef.current;
      if (!canvas || !content) return;

      const rect = canvas.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const scale = canvas.height / content.scrollHeight;
      const scrollTo = y / scale - content.clientHeight / 2;

      content.scrollTop = Math.max(0, scrollTo);
    },
    [contentRef]
  );

  return (
    <div ref={containerRef} data-component="MarkdownMinimap" className={cn("cs-component-markdown-minimap-14", className)}>
      <canvas
        ref={canvasRef}
        className="cs-component-markdown-minimap-15 "
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}

export const MarkdownMinimap = forwardRefToRoot<HTMLDivElement, MarkdownMinimapProps>(MarkdownMinimapImpl);
