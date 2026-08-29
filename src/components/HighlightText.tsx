import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { cn } from "../lib/cn";

interface HighlightTextProps {
  /** The full text to display */
  text: string;
  /** The substring to highlight. Empty string or undefined = no highlighting. */
  query?: string;
  /** Case-insensitive matching. Default: true */
  ignoreCase?: boolean;
  /** Additional className applied to the root span */
  className?: string;
  /** Additional className applied to the highlighted mark elements */
  highlightClassName?: string;
}

function HighlightTextImpl({
  text,
  query,
  ignoreCase = true,
  className,
  highlightClassName,
}: HighlightTextProps) {
  if (!query || query.length === 0) {
    return <span data-component="HighlightText" className={className}>{text}</span>;
  }

  const flags = ignoreCase ? "gi" : "g";
  // Escape regex special characters in the query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, flags);
  const parts = text.split(regex);

  if (parts.length === 1) {
    return <span data-component="HighlightText" className={className}>{text}</span>;
  }

  return (
    <span data-component="HighlightText" className={className}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            data-highlight-match=""
            className={cn(
              "cs-component-highlight-text-10 ",
              highlightClassName
            )}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export const HighlightText = forwardRefToRoot<HTMLSpanElement, HighlightTextProps>(HighlightTextImpl);
