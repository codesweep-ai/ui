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

/** Turn raw HTML openers into markdown text before any parser/plugin sees it. */
export function escapeMarkdownHtml(source: string) {
  return source.replace(/<(?=\/?[a-z]|[!?])/gi, "&lt;");
}
