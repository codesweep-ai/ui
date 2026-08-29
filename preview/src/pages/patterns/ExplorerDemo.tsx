import { useState } from "react";
import {
  SplitPane,
  Panel,
  Card,
  CardGroup,
  SectionedTree,
  type TreeSection,
  Tree,
  type TreeNode,
} from "@codesweep-ai/ui";
import {
  projectFilesTree,
  dependenciesTree,
  explorerContentV2,
} from "../../data/patternFixtures";

const sections: TreeSection[] = [
  { id: "project", label: "Project Files", nodes: projectFilesTree },
  { id: "deps", label: "Dependencies", nodes: dependenciesTree },
];

export function ExplorerDemo() {
  // Sectioned tree state
  const [selectedId, setSelectedId] = useState<string | null>("pf-button");
  const content = selectedId ? explorerContentV2[selectedId] : null;

  // Flipped tree state
  const [flippedSelectedId, setFlippedSelectedId] = useState<string | null>(null);
  const [flippedExpandedIds, setFlippedExpandedIds] = useState<Set<string>>(
    new Set(["pf-src", "pf-components"])
  );
  const [flippedAllExpanded, setFlippedAllExpanded] = useState(false);
  const flippedContent = flippedSelectedId ? explorerContentV2[flippedSelectedId] : null;

  return (
    <div className="cs-preview-pages-patterns-explorer-demo-11 ">
      <CardGroup>
        {/* Sectioned tree explorer */}
        <Card id="explorer-sectioned" maximizable header="Explorer — Sectioned Tree">
          <div className="cs-preview-pages-patterns-explorer-demo-14 ">
            <SplitPane
              className="cs-preview-pages-patterns-explorer-demo-15"
              panes={[
                {
                  id: "sidebar",
                  defaultWidth: 300,
                  minWidth: 220,
                  maxWidth: 450,
                  children: (
                    <Panel title="Explorer">
                      <SectionedTree
                        sections={sections}
                        selectedId={selectedId}
                        onSelect={(node) => setSelectedId(node.id)}
                      />
                    </Panel>
                  ),
                },
                {
                  id: "content",
                  children: (
                    <div className="cs-preview-pages-patterns-explorer-demo-19 ">
                      {content ? (
                        <Card header={content.title}>
                          <p className="cs-preview-pages-patterns-explorer-demo-20 ">
                            {content.body}
                          </p>
                        </Card>
                      ) : (
                        <div className="cs-preview-pages-patterns-explorer-demo-21 ">
                          Select a file from the tree
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </Card>

        {/* Flipped tree explorer */}
        <Card id="explorer-flipped" maximizable header="Explorer — Flipped Tree">
          <div className="cs-preview-pages-patterns-explorer-demo-14 ">
            <SplitPane
              className="cs-preview-pages-patterns-explorer-demo-15"
              panes={[
                {
                  id: "flipped-content",
                  children: (
                    <div className="cs-preview-pages-patterns-explorer-demo-19 ">
                      {flippedContent ? (
                        <Card header={flippedContent.title}>
                          <p className="cs-preview-pages-patterns-explorer-demo-20 ">
                            {flippedContent.body}
                          </p>
                        </Card>
                      ) : (
                        <div className="cs-preview-pages-patterns-explorer-demo-21 ">
                          Select a file from the tree
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  id: "flipped-sidebar",
                  defaultWidth: 300,
                  minWidth: 220,
                  maxWidth: 450,
                  children: (
                    <Panel title="Project Files">
                      <Tree
                        nodes={projectFilesTree}
                        expandedIds={flippedExpandedIds}
                        selectedId={flippedSelectedId}
                        onSelect={(node) => setFlippedSelectedId(node.id)}
                        onToggle={(id) => {
                          setFlippedExpandedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id);
                            else next.add(id);
                            return next;
                          });
                          setFlippedAllExpanded(false);
                        }}
                        filterable
                        filterPlaceholder="Search files..."
                        onToggleExpandAll={() => {
                          setFlippedAllExpanded((prev) => {
                            const next = !prev;
                            if (next) {
                              const allBranches = new Set<string>();
                              const walk = (nodes: TreeNode[]) => {
                                for (const n of nodes) {
                                  if (n.type === "branch") {
                                    allBranches.add(n.id);
                                    if (n.children) walk(n.children);
                                  }
                                }
                              };
                              walk(projectFilesTree);
                              setFlippedExpandedIds(allBranches);
                            } else {
                              setFlippedExpandedIds(new Set());
                            }
                            return next;
                          });
                        }}
                        allExpanded={flippedAllExpanded}
                        flipped
                      />
                    </Panel>
                  ),
                },
              ]}
            />
          </div>
        </Card>
      </CardGroup>
    </div>
  );
}
