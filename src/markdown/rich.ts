"use client";

import {
  createMarkdownViewer,
  type MarkdownViewerBaseProps,
} from "../components/MarkdownViewer";
import {
  RichMarkdownRenderer,
  type RichMarkdownOptions,
} from "../components/RichMarkdownRenderer";

export interface MarkdownViewerProps
  extends MarkdownViewerBaseProps,
    RichMarkdownOptions {}

/**
 * Full CommonMark + GFM viewer with the remark/rehype plugin seam. Importing
 * this entry is the build-time opt-in to the heavier parser pipeline.
 */
export const MarkdownViewer = createMarkdownViewer<RichMarkdownOptions>(
  RichMarkdownRenderer,
);
