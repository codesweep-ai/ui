"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { escapeMarkdownHtml, sanitizeMarkdownUrl } from "../lib/markdownUrl";

import {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  ListTree,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Copy,
  Check,
  Info,
  Lightbulb,
  CircleAlert,
  AlertTriangle,
  OctagonAlert,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { MarkdownMinimap } from "./MarkdownMinimap";
import { Skeleton } from "./Skeleton";
import { Button } from "./Button";
import { LightweightMarkdown } from "./LightweightMarkdown";

export type MarkdownComponents = Record<string, React.ElementType>;

export interface MarkdownRendererProps {
  content: string;
  components: MarkdownComponents;
}

export interface MarkdownViewerBaseProps {
  content: string;
  outline?: boolean;
  minimap?: boolean;
  outlineCollapsed?: boolean;
  minimapCollapsed?: boolean;
  /** When true, render as an inline embed — no internal scroll, no
   *  outline/minimap panels, flows with the parent's natural layout.
   *  Use for embedding rendered markdown inside a scrollable page where
   *  the outer page is the only scroll surface. Default false. */
  inline?: boolean;
  /** Compact prose typography for narrow side panes. */
  density?: "default" | "dense";
  onLinkClick?: (href: string) => void;
  onImageSrc?: (src: string) => Promise<string | undefined> | string | undefined;
  /** Opt-in renderers keyed by fenced-code language (for example, `mermaid`). */
  codeRenderers?: Record<string, React.ComponentType<{ code: string }>>;
  onHeadingNavigate?: (slug: string) => void;
  initialHeading?: string | null;
  className?: string;
  /** Loading state: render skeleton lines instead of content. */
  loading?: boolean;
  /** Error state: when set, render the error block. */
  error?: Error | string | null;
  /** Override the error primary text (default: "Something went wrong"). */
  errorMessage?: string;
  /** Retry handler — when provided, renders a Retry button in the error block. */
  onRetry?: () => void;
  /** Empty state primary text. Default: "No content." */
  emptyMessage?: string;
  /** Empty state secondary text. */
  emptyHint?: string;
  /** Empty state CTA. */
  emptyAction?: { label: string; onClick: () => void };
}

export interface MarkdownViewerProps extends MarkdownViewerBaseProps {}

interface Heading {
  level: number;
  text: string;
  slug: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
    .replace(/ /g, "-");
}

function extractTextContent(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (!children) return "";
  if (Array.isArray(children)) return children.map(extractTextContent).join("");
  if (typeof children === "object" && "props" in children) {
    return extractTextContent(children.props.children);
  }
  return "";
}

// Layout constants (px) — used in JS state and inline style calculations,
// not directly in CSS, so they cannot be CSS custom properties.
const OUTLINE_DEFAULT_WIDTH = 200;
const OUTLINE_MIN_WIDTH = 120;
const OUTLINE_MAX_WIDTH = 400;
const OUTLINE_INDENT_STEP = 12;
const OUTLINE_INDENT_BASE = 12;
const MINIMAP_WIDTH = 120;

// Behavior constants — timing/offset values for scroll tracking and UX
// feedback; not visual tokens.
const HEADING_DETECTION_OFFSET = 100; // px from container top
const SCROLL_DEBOUNCE_MS = 50;

// Scroll the content pane so `target` sits at its top. Only the pane moves:
// scrollIntoView would also scroll every ancestor (the page, an AppShell
// main), which the single-scroll-owner rule forbids for a bounded viewer.
function scrollContentTo(container: HTMLElement, target: Element, behavior: ScrollBehavior) {
  const top =
    target.getBoundingClientRect().top -
    container.getBoundingClientRect().top +
    container.scrollTop;
  container.scrollTo({ top, behavior });
}

const COPY_FEEDBACK_MS = 2000;

const ALERT_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; title: string }
> = {
  NOTE: { icon: Info, title: "Note" },
  TIP: { icon: Lightbulb, title: "Tip" },
  IMPORTANT: { icon: CircleAlert, title: "Important" },
  WARNING: { icon: AlertTriangle, title: "Warning" },
  CAUTION: { icon: OctagonAlert, title: "Caution" },
};

function AsyncImage({
  src,
  alt,
  resolve,
  ...rest
}: {
  src?: string;
  alt: string;
  resolve: (src: string) => Promise<string | undefined> | string | undefined;
  [key: string]: unknown;
}) {
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(src);

  useEffect(() => {
    if (!src || src.startsWith("data:") || src.startsWith("http://") || src.startsWith("https://")) {
      setResolvedSrc(src);
      return;
    }
    let cancelled = false;
    const result = resolve(src);
    if (result instanceof Promise) {
      result.then((url) => {
        if (!cancelled) setResolvedSrc(url ?? src);
      });
    } else {
      setResolvedSrc(result ?? src);
    }
    return () => { cancelled = true; };
  }, [src, resolve]);

  if (!resolvedSrc) return null;
  return <img src={resolvedSrc} alt={alt} loading="lazy" {...rest} />;
}

function MarkdownViewerImpl<Extra extends object>({
  viewerProps,
  Renderer,
}: {
  viewerProps: MarkdownViewerBaseProps & Extra;
  Renderer: ComponentType<MarkdownRendererProps & Extra>;
}) {
  const {
    content,
    outline: outlineProp = false,
    minimap: minimapProp = false,
    outlineCollapsed: outlineCollapsedProp,
    minimapCollapsed: minimapCollapsedProp,
    onLinkClick,
    onImageSrc,
    codeRenderers,
    onHeadingNavigate,
    initialHeading,
    inline = false,
    density = "default",
    className,
    loading,
    error,
    errorMessage,
    onRetry,
    emptyMessage = "No content.",
    emptyHint,
    emptyAction,
  } = viewerProps;
  // In inline mode, outline + minimap panels are unconditionally suppressed —
  // they need fixed-height layouts to work. Other props are accepted but
  // overridden.
  const outline = inline ? false : outlineProp;
  const minimap = inline ? false : minimapProp;
  // State-coverage branches — precedence: loading > error > empty > content
  if (loading) {
    return (
      <div
        data-component="MarkdownViewer"
        data-testid="markdownviewer-loading"
        className={`cs-component-markdown-viewer-33 ${className ?? ""}`}
      >
        {/* Heading skeleton */}
        <Skeleton variant="text" width="60%" height="1.5em" />
        {/* Paragraph skeletons */}
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={`__p-${i}`} variant="text" width={`${85 - (i % 4) * 5}%`} />
        ))}
        {/* Sub-heading + more paragraphs */}
        <div style={{ height: "var(--space-4)" }} />
        <Skeleton variant="text" width="40%" height="1.25em" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={`__p2-${i}`} variant="text" width={`${80 - (i % 3) * 5}%`} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div
        data-component="MarkdownViewer"
        data-testid="markdownviewer-error"
        className={`cs-component-markdown-viewer-55 ${className ?? ""}`}
      >
        <AlertCircle className="cs-component-markdown-viewer-58 " />
        <div className="cs-component-markdown-viewer-59 ">
          {errorMessage ?? "Something went wrong"}
        </div>
        {(typeof error === "string" ? error : error?.message) && (
          <div className="cs-component-markdown-viewer-62 ">
            {typeof error === "string" ? error : error.message}
          </div>
        )}
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }
  if (!content || content.trim() === "") {
    return (
      <div
        data-component="MarkdownViewer"
        data-testid="markdownviewer-empty"
        className={`cs-component-markdown-viewer-55 ${className ?? ""}`}
      >
        <Inbox className="cs-component-markdown-viewer-71 " />
        <div className="cs-component-markdown-viewer-59 ">
          {emptyMessage}
        </div>
        {emptyHint && (
          <div className="cs-component-markdown-viewer-62 ">
            {emptyHint}
          </div>
        )}
        {emptyAction && (
          <Button variant="secondary" size="sm" onClick={emptyAction.onClick}>
            {emptyAction.label}
          </Button>
        )}
      </div>
    );
  }
  const contentRef = useRef<HTMLDivElement>(null);
  const [outlineCollapsed, setOutlineCollapsed] = useState(
    outlineCollapsedProp ?? false
  );
  const [minimapCollapsed, setMinimapCollapsed] = useState(
    minimapCollapsedProp ?? false
  );
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const outlineNavRef = useRef<HTMLElement>(null);

  // Keep the active outline entry visible as the reader scrolls the content.
  // Adjusts only the outline nav's own scroll (never the page/content), and
  // only when the active item is actually outside the nav's viewport.
  useEffect(() => {
    if (!activeHeadingId) return;
    const nav = outlineNavRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>(
      `[data-heading-id="${CSS.escape(activeHeadingId)}"]`
    );
    if (!active) return;
    const navRect = nav.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    if (aRect.top < navRect.top) {
      nav.scrollTop -= navRect.top - aRect.top;
    } else if (aRect.bottom > navRect.bottom) {
      nav.scrollTop += aRect.bottom - navRect.bottom;
    }
  }, [activeHeadingId]);

  // Outline resize
  const [outlineWidth, setOutlineWidth] = useState(OUTLINE_DEFAULT_WIDTH);
  const outlineDrag = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!outlineDrag.current) return;
      const delta = e.clientX - outlineDrag.current.startX;
      const newWidth = Math.min(OUTLINE_MAX_WIDTH, Math.max(OUTLINE_MIN_WIDTH, outlineDrag.current.startWidth + delta));
      setOutlineWidth(newWidth);
    };
    const handlePointerUp = () => {
      if (!outlineDrag.current) return;
      outlineDrag.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  // Parse headings from content (skip headings inside fenced code blocks)
  const headings = useMemo<Heading[]>(() => {
    const result: Heading[] = [];
    const lines = content.split("\n");
    let inCodeBlock = false;
    let fenceChar = "";
    let fenceLen = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      const fenceMatch = trimmed.match(/^(`{3,}|~{3,})(.*)?$/);
      if (fenceMatch) {
        const char = fenceMatch[1][0];
        const len = fenceMatch[1].length;
        if (!inCodeBlock) {
          // Opening fence (may have info string after it)
          inCodeBlock = true;
          fenceChar = char;
          fenceLen = len;
        } else if (char === fenceChar && len >= fenceLen && !fenceMatch[2]?.trim()) {
          // Closing fence: same char, >= length, no trailing content
          inCodeBlock = false;
        }
        continue;
      }
      if (inCodeBlock) continue;
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        result.push({
          level: match[1].length,
          text: match[2].replace(/[*_`~]/g, ""),
          slug: slugify(match[2].replace(/[*_`~]/g, "")),
        });
      }
    }
    return result;
  }, [content]);

  const minLevel = useMemo(
    () => (headings.length > 0 ? Math.min(...headings.map((h) => h.level)) : 1),
    [headings]
  );

  // Active heading tracking
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !outline) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const containerRect = el.getBoundingClientRect();
        const headingEls = el.querySelectorAll("h1, h2, h3, h4, h5, h6");
        let lastVisible: string | null = null;

        headingEls.forEach((heading) => {
          const rect = heading.getBoundingClientRect();
          if (rect.top <= containerRect.top + HEADING_DETECTION_OFFSET) {
            lastVisible = heading.id;
          }
        });

        if (lastVisible !== null) {
          setActiveHeadingId(lastVisible);
        }
      }, SCROLL_DEBOUNCE_MS);
    };

    el.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      el.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutId);
    };
  }, [outline]);

  // Heading click handler
  const handleHeadingClick = useCallback(
    (slug: string) => {
      const el = contentRef.current;
      if (!el) return;
      const target = el.querySelector(`#${CSS.escape(slug)}`);
      if (target) {
        scrollContentTo(el, target, "instant");
        setActiveHeadingId(slug);
        onHeadingNavigate?.(slug);
      }
    },
    [onHeadingNavigate]
  );

  // Scroll to initial heading on mount / when initialHeading changes
  useEffect(() => {
    if (!initialHeading) return;
    const el = contentRef.current;
    if (!el) return;
    // Allow a tick for markdown to render
    const timer = setTimeout(() => {
      const target = el.querySelector(`#${CSS.escape(initialHeading)}`);
      if (target) {
        scrollContentTo(el, target, "instant");
        setActiveHeadingId(initialHeading);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [initialHeading]);

  // Copy handler
  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), COPY_FEEDBACK_MS);
  }, []);

  // Memoized component overrides
  const components = useMemo(() => {
    let codeBlockCounter = 0;

    return {
      p: ({ children }: { children?: ReactNode }) => (
        <p data-markdown-paragraph="">{children}</p>
      ),

      ul: ({ children }: { children?: ReactNode }) => (
        <ul data-markdown-list="unordered">{children}</ul>
      ),

      ol: ({ children }: { children?: ReactNode }) => (
        <ol data-markdown-list="ordered">{children}</ol>
      ),

      pre: ({ children }: { children?: ReactNode }) => {
        const child = Array.isArray(children) ? children[0] : children;
        let language = "";
        let textContent = "";

        if (child && typeof child === "object" && "props" in child) {
          const codeProps = child.props;
          const classNames: string = codeProps.className || "";
          const langMatch = classNames.match(/language-(\w+)/);
          if (langMatch) language = langMatch[1];
          textContent = extractTextContent(codeProps.children);
        }

        if (codeRenderers && language && codeRenderers[language]) {
          const CustomRenderer = codeRenderers[language];
          return <CustomRenderer code={textContent} />;
        }

        const blockId = `code-block-${++codeBlockCounter}`;
        const isCopied = copiedId === blockId;

        return (
          <div className="md-code-block">
            <div className="md-code-block__header">
              {language ? (
                <span className="text-label-upper">{language}</span>
              ) : (
                <span />
              )}
              <button
                onClick={() => handleCopy(textContent, blockId)}
                className="cs-component-markdown-viewer-111 "
                aria-label={isCopied ? "Copied!" : "Copy code to clipboard"}
              >
                {isCopied ? (
                  <Check className="cs-component-markdown-viewer-112 " />
                ) : (
                  <Copy className="cs-component-markdown-viewer-112 " />
                )}
              </button>
            </div>
            <div className="md-code-block__body">
              <pre>{children}</pre>
            </div>
          </div>
        );
      },

      a: ({
        href,
        children,
        node: _node,
        ...rest
      }: {
        href?: string;
        children?: ReactNode;
        node?: unknown;
        [key: string]: unknown;
      }) => {
        const safeHref = sanitizeMarkdownUrl(href ?? "");

        if (safeHref.startsWith("http://") || safeHref.startsWith("https://")) {
          return (
            <a href={safeHref} target="_blank" rel="noopener noreferrer" {...rest}>
              {children}
            </a>
          );
        }

        if (safeHref.startsWith("#")) {
          return (
            <a
              href={safeHref}
              onClick={(e) => {
                e.preventDefault();
                const slug = safeHref.slice(1);
                const container = contentRef.current;
                if (container) {
                  const target = container.querySelector(
                    `#${CSS.escape(slug)}`
                  );
                  if (target) {
                    scrollContentTo(container, target, "instant");
                    setActiveHeadingId(slug);
                  }
                }
              }}
              {...rest}
            >
              {children}
            </a>
          );
        }

        if (onLinkClick) {
          return (
            <a
              href={safeHref}
              onClick={(e) => {
                e.preventDefault();
                onLinkClick(safeHref);
              }}
              {...rest}
            >
              {children}
            </a>
          );
        }

        return (
          <a href={safeHref} {...rest}>
            {children}
          </a>
        );
      },

      blockquote: ({ children }: { children?: ReactNode }) => {
        const childArray = Array.isArray(children) ? children : [children];
        // Find the first paragraph element to check for alert syntax
        let firstText = "";
        let alertBodyChildren: ReactNode[] = [];

        for (let i = 0; i < childArray.length; i++) {
          const child = childArray[i];
          if (child && typeof child === "object" && "props" in child) {
            if (child.props.children) {
              const inner = extractTextContent(child.props.children);
              if (!firstText && inner.trim()) {
                firstText = inner.trim();
                // The rest after the first element
                alertBodyChildren = childArray.slice(i + 1);
                break;
              }
            }
          }
        }

        const alertMatch = firstText.match(
          /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*([\s\S]*)?$/
        );

        if (alertMatch) {
          const type = alertMatch[1];
          const config = ALERT_CONFIG[type];
          if (!config) return <blockquote data-markdown-blockquote="">{children}</blockquote>;

          const Icon = config.icon;
          const typeLower = type.toLowerCase();
          const remainingText = alertMatch[2]?.trim();

          return (
            <div data-markdown-blockquote="" className={`md-alert md-alert--${typeLower}`}>
              <div className="md-alert__title">
                <Icon className="cs-component-markdown-viewer-112 " />
                {config.title}
              </div>
              <div className="md-alert__body">
                {remainingText && <p>{remainingText}</p>}
                {alertBodyChildren}
              </div>
            </div>
          );
        }

        return <blockquote data-markdown-blockquote="">{children}</blockquote>;
      },

      input: ({
        type,
        checked,
        node: _node,
        ...rest
      }: React.InputHTMLAttributes<HTMLInputElement> & { node?: unknown }) => (
        <input
          type={type}
          checked={checked}
          aria-label={type === "checkbox" ? (checked ? "Completed task" : "Incomplete task") : undefined}
          {...rest}
        />
      ),

      ...(onImageSrc
        ? {
            img: ({
              src,
              alt,
              node: _node,
              ...rest
            }: {
              src?: string;
              alt?: string;
              node?: unknown;
              [key: string]: unknown;
            }) => {
              return (
                <AsyncImage
                  src={src}
                  alt={alt ?? ""}
                  resolve={onImageSrc}
                  {...rest}
                />
              );
            },
          }
        : {}),
    };
  }, [copiedId, handleCopy, onLinkClick, onImageSrc, codeRenderers]);

  return (
    <div
      data-component="MarkdownViewer"
      className={inline ? (className ?? "") : `cs-component-markdown-viewer-133 ${className ?? ""}`}
    >
      {/* Outline panel */}
      {outline && !outlineCollapsed && (
        <>
          <div
            className="cs-component-markdown-viewer-136 "
            style={{ width: outlineWidth }}
          >
            <div className="cs-component-markdown-viewer-137 ">
              <div className="cs-component-markdown-viewer-138 ">
                <ListTree className="cs-component-markdown-viewer-112 " />
                Outline
              </div>
              <button
                onClick={() => setOutlineCollapsed(true)}
                className="cs-component-markdown-viewer-139 "
                aria-label="Collapse outline"
              >
                <PanelLeftClose className="cs-component-markdown-viewer-112 " />
              </button>
            </div>
            <nav ref={outlineNavRef} className="cs-component-markdown-viewer-140 ">
              {headings.map((h, i) => (
                <button
                  key={`${h.slug}-${i}`}
                  data-heading-id={h.slug}
                  onClick={() => handleHeadingClick(h.slug)}
                  className={`cs-component-markdown-viewer-144 ${
                    activeHeadingId === h.slug
                      ? "cs-component-markdown-viewer-145 "
                      : "cs-component-markdown-viewer-146 "
                  }`}
                  style={{
                    paddingLeft: `${(h.level - minLevel) * OUTLINE_INDENT_STEP + OUTLINE_INDENT_BASE}px`,
                  }}
                >
                  {h.text}
                </button>
              ))}
            </nav>
          </div>
          {/* Outline resize handle */}
          <div
            className="cs-component-markdown-viewer-150 "
            onPointerDown={(e) => {
              e.preventDefault();
              outlineDrag.current = { startX: e.clientX, startWidth: outlineWidth };
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
          >
            <div className="cs-component-markdown-viewer-153 " />
          </div>
        </>
      )}

      {/* Outline collapsed toggle */}
      {outline && outlineCollapsed && (
        <div className="cs-component-markdown-viewer-154 ">
          <button
            onClick={() => setOutlineCollapsed(false)}
            className="cs-component-markdown-viewer-155 "
            aria-label="Expand outline"
          >
            <PanelLeftOpen className="cs-component-markdown-viewer-112 " />
          </button>
        </div>
      )}

      {/* Content area */}
      <div ref={contentRef} className={inline ? "cs-component-markdown-viewer-156" : "cs-component-markdown-viewer-157 "}>
        <article data-markdown-content="" className={`${inline ? "markdown-content" : "markdown-content cs-component-markdown-viewer-159"}${density === "dense" ? " markdown-content--dense" : ""}`}>
          <Renderer
            {...(viewerProps as Extra)}
            content={escapeMarkdownHtml(content)}
            components={components as MarkdownComponents}
          />
        </article>
      </div>

      {/* Minimap collapsed toggle */}
      {minimap && minimapCollapsed && (
        <div className="cs-component-markdown-viewer-160 ">
          <button
            onClick={() => setMinimapCollapsed(false)}
            className="cs-component-markdown-viewer-155 "
            aria-label="Expand minimap"
          >
            <PanelRightOpen className="cs-component-markdown-viewer-112 " />
          </button>
        </div>
      )}

      {/* Minimap panel */}
      {minimap && (
        <div
          className="cs-component-markdown-viewer-161 "
          style={{ width: minimapCollapsed ? 0 : MINIMAP_WIDTH }}
        >
          <div className="cs-component-markdown-viewer-162 ">
            <span className="cs-component-markdown-viewer-163 ">
              Minimap
            </span>
            <button
              onClick={() => setMinimapCollapsed(true)}
              className="cs-component-markdown-viewer-139 "
              aria-label="Collapse minimap"
            >
              <PanelRightClose className="cs-component-markdown-viewer-112 " />
            </button>
          </div>
          <div className="cs-component-markdown-viewer-164 ">
            <MarkdownMinimap contentRef={contentRef} />
          </div>
        </div>
      )}
    </div>
  );
}

export function createMarkdownViewer<Extra extends object = Record<never, never>>(
  Renderer: ComponentType<MarkdownRendererProps & Extra>,
) {
  function ConfiguredMarkdownViewerImpl(viewerProps: MarkdownViewerBaseProps & Extra) {
    return MarkdownViewerImpl({ viewerProps, Renderer });
  }

  const Viewer = forwardRefToRoot<
    HTMLDivElement,
    MarkdownViewerBaseProps & Extra
  >(ConfiguredMarkdownViewerImpl);
  Viewer.displayName = "MarkdownViewer";
  return Viewer;
}

export const MarkdownViewer = createMarkdownViewer(LightweightMarkdown);
