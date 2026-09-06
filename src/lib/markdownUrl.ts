const ALLOWED_SCHEMES = new Set([
  "http",
  "https",
  "irc",
  "ircs",
  "mailto",
  "xmpp",
]);

/** Keep relative URLs and the documented network/message schemes. */
export function sanitizeMarkdownUrl(url: string) {
  const normalized = url.trim();
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return "";
  const colon = normalized.indexOf(":");
  const relativeBoundary = normalized.search(/[/?#]/);
  if (colon >= 0 && (relativeBoundary < 0 || colon < relativeBoundary)) {
    const scheme = normalized.slice(0, colon);
    if (!/^[a-z][a-z\d+.-]*$/i.test(scheme)) return "";
    if (!ALLOWED_SCHEMES.has(scheme.toLowerCase())) return "";
  }
  return normalized;
}

// The fence opener LightweightMarkdown itself matches, deliberately reused
// rather than a stricter CommonMark one. If the escaper and the parser
// disagreed about where code begins, one of them would be wrong about every
// document, and the disagreement would only ever show up inside code.
const FENCE_OPEN = /^\s{0,3}(`{3,}|~{3,})/;

/**
 * The end of a code span opened by `ticks` backticks, or -1 if it never closes.
 *
 * Bounded at the next blank line because a code span cannot cross one. Without
 * the bound a single stray backtick would exempt the rest of the document from
 * escaping, which is the security-relevant direction to get wrong.
 */
function findCodeSpanEnd(source: string, from: number, ticks: number) {
  const blank = source.slice(from).search(/\n[ \t]*\n/);
  const limit = blank < 0 ? source.length : from + blank;
  const delimiter = "`".repeat(ticks);
  let cursor = from;
  while (cursor < limit) {
    const found = source.indexOf(delimiter, cursor);
    if (found < 0 || found >= limit) return -1;
    // Scanning run by run, so `found` is always a run start: a closing run of
    // more backticks than the opener does not close it.
    let run = 0;
    while (source[found + run] === "`") run++;
    if (run === ticks) return found;
    cursor = found + run;
  }
  return -1;
}

/**
 * Turn raw HTML openers into markdown text before any parser/plugin sees it.
 *
 * Prose only. Fenced blocks and code spans are passed through untouched,
 * because neither renderer decodes entities back inside code, so an escape
 * applied there is what the reader ends up seeing. Nothing inside code is ever
 * parsed as HTML by either renderer, so the exemption costs no safety.
 *
 * Indented (4-space) code blocks are deliberately not exempt.
 * LightweightMarkdown does not implement them, and telling one from a lazy
 * paragraph continuation is ambiguous enough that a wrong guess would
 * under-escape.
 */
export function escapeMarkdownHtml(source: string) {
  let out = "";
  let prose = 0;
  let cursor = 0;
  let lineStart = 0;

  const flush = (end: number) => {
    out += source.slice(prose, end).replace(/<(?=\/?[a-z]|[!?])/gi, "&lt;");
  };

  const lineEndFrom = (index: number) => {
    const newline = source.indexOf("\n", index);
    return newline < 0 ? source.length : newline;
  };

  while (cursor < source.length) {
    if (cursor === lineStart) {
      const fence = source.slice(cursor, lineEndFrom(cursor)).match(FENCE_OPEN);
      if (fence) {
        const marker = fence[1];
        const closing = new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`);
        let end = Math.min(lineEndFrom(cursor) + 1, source.length);
        while (end < source.length) {
          const stop = Math.min(lineEndFrom(end) + 1, source.length);
          const closes = closing.test(source.slice(end, lineEndFrom(end)));
          end = stop;
          if (closes) break;
        }
        // An unclosed fence runs to the end of the document, which is already
        // how both renderers read it.
        flush(cursor);
        out += source.slice(cursor, end);
        cursor = prose = lineStart = end;
        continue;
      }
    }

    if (source[cursor] === "`") {
      let ticks = 1;
      while (source[cursor + ticks] === "`") ticks++;
      const end = findCodeSpanEnd(source, cursor + ticks, ticks);
      if (end >= 0) {
        flush(cursor);
        out += source.slice(cursor, end + ticks);
        cursor = prose = end + ticks;
        // A span may have carried the cursor over a newline, so the fence
        // detector needs the line it actually landed on.
        lineStart = source.lastIndexOf("\n", cursor - 1) + 1;
        continue;
      }
    }

    if (source[cursor] === "\n") lineStart = cursor + 1;
    cursor++;
  }

  flush(source.length);
  return out;
}
