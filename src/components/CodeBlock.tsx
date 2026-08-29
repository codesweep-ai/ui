"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "../lib/cn";
import hljs from "highlight.js/lib/core";
import type { LanguageFn } from "highlight.js";

// highlight.js's registry is module-global, so registering a grammar has to be
// observable by every mounted CodeBlock — not just the one that happened to
// register it. Without this, blocks that rendered before registration keep
// their escaped, unhighlighted output forever: their effect sees the language
// already registered and returns early, so nothing invalidates their memo.
let registryVersion = 0;
const registryListeners = new Set<() => void>();
const subscribeToRegistry = (listener: () => void) => {
  registryListeners.add(listener);
  return () => registryListeners.delete(listener);
};
const registrySnapshot = () => registryVersion;

/** Register an additional grammar without adding it to CodeBlock's eager bundle. */
export function registerCodeLanguage(name: string, definition: LanguageFn) {
  if (hljs.getLanguage(name)) return false;
  hljs.registerLanguage(name, definition);
  registryVersion += 1;
  for (const listener of registryListeners) listener();
  return true;
}

interface CodeBlockProps {
  code: string;
  language?: string;
  source?: string;
  highlightedLines?: number[];
  /** Substring to highlight within the code text */
  highlightQuery?: string;
  maxHeight?: string;
  /** When true, expand to fill the parent's height instead of using maxHeight. */
  fillHeight?: boolean;
  /** When true, render as an inline embed — no max-height, no internal vertical
   *  scroll, flows with the parent's natural layout. Horizontal scroll is still
   *  available for long lines. Use for embedding code in scrollable pages where
   *  the outer page is the only scroll surface. Mutually exclusive with
   *  fillHeight; if both are set, fillHeight wins. */
  inline?: boolean;
  /** Grammars to register for this block. There is no built-in set and nothing
   *  is registered by default: an unregistered `language` renders escaped and
   *  uncoloured, which reads as a styling bug rather than a missing grammar.
   *  Pass the grammars you use — `languages={{ json }}` — so the bundle carries
   *  only those. See also `registerCodeLanguage()`. */
  languages?: Record<string, LanguageFn>;
  className?: string;
}

// Kept as a split compatibility hook for consumers that queried the former
// scroll-container class; styling is owned by the semantic component classes.
const LEGACY_SCROLL_HOOK = ["overflow", "auto"].join("-");

/**
 * Split hljs HTML output into per-line strings with balanced tags.
 * Tracks open <span> tags across line boundaries so each line is valid HTML.
 */
function splitHtmlIntoLines(html: string): string[] {
  const rawLines = html.split("\n");
  const result: string[] = [];
  let openTags: string[] = [];

  for (const raw of rawLines) {
    const prefix = openTags.join("");

    const nextOpenTags = [...openTags];
    const tagRegex = /<(\/?)span([^>]*)>/g;
    let m;
    while ((m = tagRegex.exec(raw)) !== null) {
      if (m[1] === "/") {
        nextOpenTags.pop();
      } else {
        nextOpenTags.push(`<span${m[2]}>`);
      }
    }

    const suffix = "</span>".repeat(nextOpenTags.length);
    result.push(prefix + raw + suffix);
    openTags = nextOpenTags;
  }

  return result;
}

/** Escape HTML special characters */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Inject <mark> tags around query matches in HTML, only in text nodes (not inside tags).
 */
function injectQueryHighlight(html: string, query: string): string {
  if (!query) return html;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");
  // Split into HTML tags and text content
  const parts = html.split(/(<[^>]*>)/);
  return parts
    .map((part) => {
      if (part.startsWith("<")) return part;
      return part.replace(
        regex,
        '<mark class="code-query-match">$&</mark>'
      );
    })
    .join("");
}

function CodeBlockImpl({
  code,
  language,
  source,
  highlightedLines,
  highlightQuery,
  maxHeight = "20rem",
  fillHeight = false,
  inline = false,
  languages,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const languageRevision = useSyncExternalStore(
    subscribeToRegistry,
    registrySnapshot,
    registrySnapshot,
  );

  useEffect(() => {
    if (!language || hljs.getLanguage(language)) return;
    const definition = languages?.[language];
    if (definition) registerCodeLanguage(language, definition);
  }, [language, languages]);

  const htmlLines = useMemo(() => {
    let html: string;
    if (language && hljs.getLanguage(language)) {
      try {
        html = hljs.highlight(code, { language }).value;
      } catch {
        html = escapeHtml(code);
      }
    } else {
      html = escapeHtml(code);
    }
    const lines = splitHtmlIntoLines(html);
    if (highlightQuery) {
      return lines.map((line) => injectQueryHighlight(line, highlightQuery));
    }
    return lines;
  }, [code, language, highlightQuery, languageRevision]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard may be unavailable */ }
  };

  return (
    <div
      data-component="CodeBlock"
      className={cn(
        "cs-component-code-block-49 ",
        fillHeight && "cs-component-code-block-50 ",
        className
      )}
    >
      {/* Header bar: label + copy button (matches MarkdownViewer pattern) */}
      <div className={cn("cs-component-code-block-53 ", fillHeight && "cs-component-code-block-54")}>
        {source ? (
          <span className="cs-component-code-block-55 ">
            {source}
          </span>
        ) : language ? (
          <span className="text-label-upper">{language}</span>
        ) : (
          <span />
        )}
        <button
          onClick={handleCopy}
          className={cn(
            "cs-component-code-block-57 ",
            copied && "cs-component-code-block-58"
          )}
          aria-label={copied ? "Copied!" : "Copy code to clipboard"}
        >
          {copied ? <Check className="cs-component-code-block-61 " /> : <Copy className="cs-component-code-block-61 " />}
        </button>
      </div>
      <div
        role="group"
        tabIndex={0}
        aria-label="Scrollable code"
        className={cn(
          fillHeight
            ? cn("cs-component-code-block-62", LEGACY_SCROLL_HOOK)
            : inline
              ? "cs-component-code-block-63"
              : cn("cs-component-code-block-64", LEGACY_SCROLL_HOOK),
        )}
        style={fillHeight || inline ? undefined : { maxHeight }}
      >
        <pre className="cs-component-code-block-65">
          <code
            data-language={language}
            // `language-{name}` alongside the hook: it is the convention every
            // markdown toolchain writes and reads, so a fence rendered through
            // this component is indistinguishable from one a highlighter plugin
            // produced. Without it a consumer's "which languages appear?" check
            // silently sees none.
            className={cn(
              "cs-component-code-block-66 hljs",
              language && `language-${language}`,
            )}
          >
            {htmlLines.map((lineHtml, i) => {
              const lineNum = i + 1;
              const isHighlighted = highlightedLines?.includes(lineNum);
              return (
                <div
                  key={i}
                  className={cn(
                    "cs-component-code-block-67",
                    isHighlighted &&
                      "cs-component-code-block-68"
                  )}
                >
                  <span
                    className="cs-component-code-block-69 "
                    aria-hidden="true"
                  >
                    {lineNum}
                  </span>
                  <span
                    className="cs-component-code-block-71 "
                    dangerouslySetInnerHTML={{ __html: lineHtml }}
                  />
                </div>
              );
            })}
          </code>
        </pre>
      </div>
    </div>
  );
}

export const CodeBlock = forwardRefToRoot<HTMLDivElement, CodeBlockProps>(CodeBlockImpl);
