import { Card, CardGroup } from "@codesweep-ai/ui";
import { MarkdownViewer } from "@codesweep-ai/ui/markdown";
import { specDocsById } from "../../data/specDocs";
import { markdownFlavors } from "../../markdownFlavors";
import { MarkdownFlavors } from "./MarkdownFlavors";

/**
 * The pattern is *choosing* a markdown flavor, so that is what this tab shows.
 *
 * The tree + outline + minimap composition that used to live here is now the
 * Docs page, where it does real work browsing this package's own specs rather
 * than a mock document set.
 *
 * Rendered with flavor 2 — the lightweight entry plus a mermaid renderer.
 */
const standaloneProps = markdownFlavors[1].props;

export function MarkdownViewerDemo() {
  return (
    <div className="cs-preview-markdown-demo-root">
      <MarkdownFlavors />

      <CardGroup>
        <Card
          id="md-standalone"
          maximizable
          header="Markdown Viewer — standalone, with an outline"
        >
          <p className="cs-preview-flavors-use">
            The same viewer given a long document and an outline panel. The full three-pane
            composition — document tree, outline and minimap — is the <strong>Docs</strong> tab,
            reading this package&apos;s own specs.
          </p>
          <div className="cs-preview-spec-standalone">
            <MarkdownViewer
              {...standaloneProps}
              content={specDocsById["patterns/MarkdownViewer"]?.content ?? ""}
              outline
            />
          </div>
        </Card>
      </CardGroup>
    </div>
  );
}
