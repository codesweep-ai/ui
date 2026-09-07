import { useCallback, useMemo, useState } from "react";
import {
  Card,
  CardGroup,
  Panel,
  SectionedTree,
  SplitPane,
  Tree,
  type TreeNode,
} from "@codesweep-ai/ui";
import {
  navExpandedIds,
  navSectionBlurbs,
  navSections,
  navSelectedId,
  navTrail,
} from "../../data/navSections";

// A nav sidebar is a bounded column that scrolls once, holding sections that
// are each as tall as their own rows. Both cards below build that from the same
// data, and both put it where a sidebar actually lives: beside the page it
// navigates, on a handle the reader can drag.
const PANE_HEIGHT = 460;
const NAV_WIDTH = 260;

// `SplitPane` takes a `storageKey` and would remember the width, which is the
// right thing in an app and the wrong thing here: the visual gate photographs
// this page, and a capture that depends on what a previous run stored is a
// capture that moves for no reason anybody can see. The pattern's own
// specification shows the key.

function ContentPane({ selectedId }: { selectedId: string | null }) {
  const trail = selectedId ? navTrail(selectedId) : [];
  const title = trail[trail.length - 1] ?? "";
  const section = navSections.find((candidate) => candidate.label === trail[0]);
  const siblings = useMemo(() => {
    if (!section) return [];
    const flat: TreeNode[] = [];
    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        flat.push(node);
        if (node.children) walk(node.children);
      }
    };
    walk(section.nodes);
    return flat.filter((node) => node.type === "leaf" && node.name !== title).slice(0, 4);
  }, [section, title]);

  if (!selectedId) {
    return (
      <article className="cs-preview-pages-patterns-nav-sidebar-demo-3 ">
        <p className="cs-preview-pages-patterns-nav-sidebar-demo-6 ">
          Nothing chosen yet. Pick a page on the left, and note that the column keeps its
          own scroll position while this side changes.
        </p>
      </article>
    );
  }

  return (
    <article className="cs-preview-pages-patterns-nav-sidebar-demo-3 ">
      <p className="cs-preview-pages-patterns-nav-sidebar-demo-4 ">{trail.join(" › ")}</p>
      <h2 className="cs-preview-pages-patterns-nav-sidebar-demo-5 ">{title}</h2>

      <p className="cs-preview-pages-patterns-nav-sidebar-demo-6 ">
        {section ? navSectionBlurbs[section.id] : ""}
      </p>
      <p className="cs-preview-pages-patterns-nav-sidebar-demo-6 ">
        Fixture prose. What matters on this page is the column to the left: it is bounded,
        it scrolls once, and every section inside it is as tall as its own list. Drag the
        handle between the two to see the sidebar keep its shape at any width.
      </p>

      <pre className="cs-preview-pages-patterns-nav-sidebar-demo-7 ">
        {`$ codesweep scan --rules ${title.toLowerCase().replace(/\s+/g, "-")}`}
      </pre>

      <p className="cs-preview-pages-patterns-nav-sidebar-demo-6 ">
        The sidebar follows a selection the page makes as well as one the reader makes, so
        a link in this text scrolls the matching row into view rather than leaving the
        reader to find it.
      </p>

      {siblings.length > 0 && (
        <>
          <h3 className="cs-preview-pages-patterns-nav-sidebar-demo-8 ">See also</h3>
          <ul className="cs-preview-pages-patterns-nav-sidebar-demo-9 ">
            {siblings.map((node) => (
              <li key={node.id}>{node.name}</li>
            ))}
          </ul>
        </>
      )}
    </article>
  );
}

export function NavSidebarDemo() {
  const [groupedId, setGroupedId] = useState<string | null>(navSelectedId);
  const [collapsibleId, setCollapsibleId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(navExpandedIds);
  // Troubleshooting starts folded, so the second card shows both states.
  const [foldedSections, setFoldedSections] = useState<Set<string>>(new Set(["help"]));

  const toggleNode = useCallback((id: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSection = useCallback((id: string) => {
    setFoldedSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectGrouped = useCallback((node: TreeNode) => setGroupedId(node.id), []);
  const selectCollapsible = useCallback((node: TreeNode) => setCollapsibleId(node.id), []);

  const grouped = (
    <div className="cs-preview-pages-patterns-nav-sidebar-demo-10 ">
      <SectionedTree
        sections={navSections}
        selectedId={groupedId}
        onSelect={selectGrouped}
        // A nav section of four items does not need a search box, and seven of
        // them do not need seven.
        filterable={false}
        expandAllControl={false}
        labelOverflow="truncate"
      />
    </div>
  );

  const collapsible = (
    <div className="cs-preview-pages-patterns-nav-sidebar-demo-10 ">
      {navSections.map((section) => (
        <Panel
          key={section.id}
          title={section.label}
          height="auto"
          collapseTo="header"
          collapsed={foldedSections.has(section.id)}
          onCollapse={() => toggleSection(section.id)}
        >
          <Tree
            nodes={section.nodes}
            expandedIds={expandedIds}
            onToggle={toggleNode}
            selectedId={collapsibleId}
            onSelect={selectCollapsible}
            labelOverflow="truncate"
          />
        </Panel>
      ))}
    </div>
  );

  return (
    <div className="cs-preview-pages-patterns-nav-sidebar-demo-1 ">
      <CardGroup fill={false}>
        <Card id="nav-grouped" header="Grouped nav — one scrollbar" maximizable>
          <p className="cs-preview-pages-patterns-nav-sidebar-demo-2">
            <code>SectionedTree</code> with its file-tree chrome turned off. Seven sections,
            one scrollbar, and a label too long for the column is cut rather than given a
            scrollbar of its own.
          </p>
          <div className="cs-preview-pages-patterns-nav-sidebar-demo-11 ">
            <SplitPane
              panes={[
                { id: "nav", defaultWidth: NAV_WIDTH, minWidth: 180, maxWidth: 420, children: grouped },
                { id: "page", children: <ContentPane selectedId={groupedId} /> },
              ]}
            />
          </div>
        </Card>

        <Card id="nav-collapsible" header="Collapsible sections" maximizable>
          <p className="cs-preview-pages-patterns-nav-sidebar-demo-2">
            One <code>Panel</code> per section, each sized to its content and folding to its
            own title bar. The column owns the only scrollbar.
          </p>
          <div className="cs-preview-pages-patterns-nav-sidebar-demo-11 ">
            <SplitPane
              panes={[
                { id: "nav", defaultWidth: NAV_WIDTH, minWidth: 180, maxWidth: 420, children: collapsible },
                { id: "page", children: <ContentPane selectedId={collapsibleId} /> },
              ]}
            />
          </div>
        </Card>
      </CardGroup>
    </div>
  );
}
