import { useState } from "react";
import { SplitPane, Panel, Tree } from "@codesweep-ai/ui";
import { MarkdownViewer } from "@codesweep-ai/ui/markdown";
import {
  DEFAULT_SPEC_ID,
  specDocTree,
  specDocs,
  specDocsById,
} from "../data/specDocs";
import { SpecFrontmatter } from "../components/SpecFrontmatter";
import { markdownFlavors } from "../markdownFlavors";

/**
 * The library's own specs, as a first-class page.
 *
 * Every component and pattern already ships a spec with structured frontmatter;
 * until now none of it was reachable from the preview, so the guidance lived in
 * files nobody opened. Reading them here also exercises MarkdownViewer on real
 * documents rather than invented samples.
 *
 * Rendered with flavor 2 — the lightweight entry plus a mermaid renderer through
 * `codeRenderers`. A documentation browser is exactly the surface that would
 * reach for the heaviest option by reflex; it does not need to.
 */
const docsProps = markdownFlavors[1].props;

export function DocsPage() {
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_SPEC_ID);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(["group-components", "group-patterns", "group-docs"]),
  );

  const doc = specDocsById[selectedId];

  const selectByName = (name: string) => {
    const target = specDocs.find((entry) => entry.name === name);
    if (!target) return;
    setSelectedId(target.id);
    setExpandedIds((prev) => new Set(prev).add(`group-${target.group}`));
  };

  return (
    <div className="cs-preview-docs-page">
      <h1 className="cs-preview-docs-title">Docs</h1>
      <p className="cs-preview-docs-lede">
        Every component and pattern spec in this package — {specDocs.length} documents, read from
        the repository rather than copied. Each one&apos;s frontmatter becomes the panel on the
        right: what it is for, when to reach for something else, and what it relates to.
      </p>

      <div className="cs-preview-docs-browser">
        <SplitPane
          className="cs-preview-docs-split"
          panes={[
            {
              id: "docs-tree",
              defaultWidth: 260,
              minWidth: 200,
              maxWidth: 380,
              children: (
                <Panel title="Specs">
                  <Tree
                    nodes={specDocTree}
                    expandedIds={expandedIds}
                    selectedId={selectedId}
                    onToggle={(id) => {
                      setExpandedIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id);
                        else next.add(id);
                        return next;
                      });
                    }}
                    onSelect={(node) => {
                      if (specDocsById[node.id]) setSelectedId(node.id);
                    }}
                  />
                </Panel>
              ),
            },
            {
              id: "docs-content",
              children: doc ? (
                <div className="cs-preview-spec-pane">
                  <SpecFrontmatter
                    frontmatter={doc.frontmatter}
                    onSelectRelated={selectByName}
                  />
                  <div className="cs-preview-spec-body">
                    <MarkdownViewer
                      {...docsProps}
                      content={doc.content}
                      outline
                      minimap
                    />
                  </div>
                </div>
              ) : (
                <div className="cs-preview-pages-patterns-markdown-viewer-demo-15 ">
                  Select a document from the tree
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
