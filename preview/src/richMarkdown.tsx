/**
 * The props the Components page uses for its MarkdownViewer example.
 *
 * Kept as a re-export so the ladder in `markdownFlavors.tsx` stays the single
 * definition of what each flavor is. This is flavor 6 — the rich entry with
 * highlighting and diagrams — which is the right choice for a page that renders
 * arbitrary authored markdown, and the wrong one to copy without reading the
 * ladder first.
 */
export { richMarkdownProps } from "./markdownFlavors";
