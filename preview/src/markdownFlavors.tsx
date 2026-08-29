import { CodeBlock } from "@codesweep-ai/ui/code";
import bash from "highlight.js/lib/languages/bash";
import { MermaidDiagram } from "@codesweep-ai/ui/mermaid";
import { MarkdownViewer as LightMarkdownViewer } from "@codesweep-ai/ui/markdown";
import { MarkdownViewer as RichMarkdownViewer } from "@codesweep-ai/ui/markdown/rich";
import rehypeHighlight from "rehype-highlight";
import type { ComponentType } from "react";

import sizes from "./data/subpath-sizes.json";

/**
 * The markdown ladder, in one place.
 *
 * `codeRenderers` is wired into the shared component map inside
 * `createMarkdownViewer`, so it works identically on both entries. That is the
 * fact the ladder exists to make visible: **diagrams and per-language
 * highlighting do not require the rich entry.** Only the remark/rehype plugin
 * seam does — along with footnotes and bare autolinks, which the lightweight
 * parser does not implement.
 */

/**
 * `codeRenderers` hands the renderer only the fence body, so the language is
 * bound here — along with its grammar. `CodeBlock` builds on
 * `highlight.js/lib/core` with nothing pre-registered, so a consumer ships only
 * the grammars it actually uses. Omit `languages` and the code renders escaped
 * but unhighlighted, which is easy to mistake for a styling problem.
 */
const BashBlock = ({ code }: { code: string }) => (
  <CodeBlock code={code} language="bash" languages={{ bash }} inline />
);

const MermaidBlock = ({ code }: { code: string }) => <MermaidDiagram chart={code} />;

export interface MarkdownFlavor {
  id: string;
  /** URL-addressable name. `preview:rich-check` navigates by this, so renaming
   *  one is a contract change — see scripts/preview-rich-check.mjs. */
  slug: string;
  title: string;
  /** Short label for the radio rail, where the full title does not fit. */
  railLabel: string;
  /** Copy-pasteable — this is the line a consumer writes. */
  importLine: string;
  extras?: string;
  useWhen: string;
  /** Bundle cost, from `subpath-sizes.json`, which `npm run size:subpaths` writes. */
  entry: keyof typeof sizes;
  /** Added on top of the entry, when the flavor pulls something else in. */
  addsNote?: string;
  Viewer: ComponentType<Record<string, unknown>>;
  props: Record<string, unknown>;
}

export const markdownFlavors: MarkdownFlavor[] = [
  {
    id: "flavor-default",
    slug: "default",
    railLabel: "Default",
    title: "1 · Default",
    importLine: 'import { MarkdownViewer } from "@codesweep-ai/ui/markdown";',
    useWhen:
      "Almost always. Headings, lists, task lists, strikethrough, GFM tables, alerts, fenced code and links all render here.",
    entry: "./markdown",
    Viewer: LightMarkdownViewer as ComponentType<Record<string, unknown>>,
    props: {},
  },
  {
    id: "flavor-diagrams",
    slug: "diagrams",
    railLabel: "+ Diagrams",
    title: "2 · + Diagrams",
    importLine: 'import { MarkdownViewer } from "@codesweep-ai/ui/markdown";',
    extras: 'codeRenderers={{ mermaid: MermaidBlock }}',
    useWhen:
      "A document contains ```mermaid fences. Still the lightweight parser — the diagram arrives through codeRenderers, not through the parser.",
    entry: "./markdown",
    addsNote: "plus mermaid, an optional peer dependency you install yourself",
    Viewer: LightMarkdownViewer as ComponentType<Record<string, unknown>>,
    props: { codeRenderers: { mermaid: MermaidBlock } },
  },
  {
    id: "flavor-highlight",
    slug: "highlight",
    railLabel: "+ Highlighting",
    title: "3 · + Highlighting",
    importLine: 'import { MarkdownViewer } from "@codesweep-ai/ui/markdown";',
    extras: 'codeRenderers={{ bash: BashBlock }}  //  CodeBlock languages={{ bash }}',
    useWhen:
      "You know which languages appear and want them coloured. CodeBlock builds on highlight.js/lib/core with nothing pre-registered, so you pass the grammars you use and ship only those.",
    entry: "./markdown",
    addsNote: "plus CodeBlock — the ./code entry is 165,949 B raw against ./markdown's 166,136 B",
    Viewer: LightMarkdownViewer as ComponentType<Record<string, unknown>>,
    props: { codeRenderers: { bash: BashBlock } },
  },
  {
    id: "flavor-rich",
    slug: "rich",
    railLabel: "Full parser",
    title: "4 · Full parser",
    importLine: 'import { MarkdownViewer } from "@codesweep-ai/ui/markdown/rich";',
    useWhen:
      "The content needs footnotes, bare autolinks or CommonMark edge cases the lightweight parser does not implement — or you need the plugin seam below. Note that highlighting disappears here: it is not part of the parser, and returns at 5 through a plugin, or at 3 without leaving the lightweight entry. Upgrading the parser is not how you get coloured code.",
    entry: "./markdown/rich",
    Viewer: RichMarkdownViewer as ComponentType<Record<string, unknown>>,
    props: {},
  },
  {
    id: "flavor-plugins",
    slug: "plugins",
    railLabel: "+ Plugins",
    title: "5 · + Plugins",
    importLine: 'import { MarkdownViewer } from "@codesweep-ai/ui/markdown/rich";',
    extras: "rehypePlugins={[rehypeHighlight]}",
    useWhen:
      "Every tagged fence must be highlighted generically, including languages you cannot enumerate in advance. This is the only thing on the ladder that needs the rich entry for highlighting.",
    entry: "./markdown/rich",
    addsNote: "plus highlight.js, pulled in by rehype-highlight",
    Viewer: RichMarkdownViewer as ComponentType<Record<string, unknown>>,
    props: { rehypePlugins: [rehypeHighlight] },
  },
  {
    id: "flavor-everything",
    slug: "everything",
    railLabel: "Plugins + diagrams",
    title: "6 · Plugins + diagrams",
    importLine: 'import { MarkdownViewer } from "@codesweep-ai/ui/markdown/rich";',
    extras: "rehypePlugins={[rehypeHighlight]} codeRenderers={{ mermaid: MermaidBlock }}",
    useWhen:
      "Documentation surfaces that render arbitrary authored markdown — the preview itself is on this tier.",
    entry: "./markdown/rich",
    addsNote: "plus highlight.js and mermaid",
    Viewer: RichMarkdownViewer as ComponentType<Record<string, unknown>>,
    props: {
      rehypePlugins: [rehypeHighlight],
      codeRenderers: { mermaid: MermaidBlock },
    },
  },
];

export const subpathSizes = sizes;

/** Kept for the demo composition below the ladder. */
export const richMarkdownProps = markdownFlavors[5].props;
