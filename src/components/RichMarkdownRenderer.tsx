import ReactMarkdown, { type Components } from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";

import type { MarkdownRendererProps } from "./MarkdownViewer";
import { sanitizeMarkdownUrl } from "../lib/markdownUrl";

export interface RichMarkdownOptions {
  /** Extra remark plugins. GFM is always enabled before these plugins. */
  remarkPlugins?: PluggableList;
  /** Extra rehype plugins. Heading slugs are always enabled before these plugins. */
  rehypePlugins?: PluggableList;
}

export function RichMarkdownRenderer({
  content,
  components,
  remarkPlugins,
  rehypePlugins,
}: MarkdownRendererProps & RichMarkdownOptions) {
  return (
    <ReactMarkdown
      // remark-rehype's default back-reference content is "↩", which some fonts
      // render with emoji presentation. The link and its "Back to reference N"
      // label are kept — it is how a reader returns from a footnote.
      remarkRehypeOptions={{ footnoteBackContent: "\u2191" }}
      remarkPlugins={[remarkGfm, ...(remarkPlugins ?? [])]}
      rehypePlugins={[rehypeSlug, ...(rehypePlugins ?? [])]}
      components={components as Components}
      urlTransform={sanitizeMarkdownUrl}
    >
      {content}
    </ReactMarkdown>
  );
}
