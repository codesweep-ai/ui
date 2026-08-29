"use client";

import { useState, useMemo, useCallback, type ReactElement, type RefAttributes } from "react";
import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { cn } from "../lib/cn";
import { Tree, type TreeNode } from "./Tree";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

const LOADING_SECTION_COUNT = 3;
const LOADING_ROWS_PER_SECTION = 3;

export interface TreeSection<T extends TreeNode = TreeNode> {
  id: string;
  label: string;
  nodes: T[];
}

interface SectionedTreeProps<T extends TreeNode = TreeNode> {
  sections: TreeSection<T>[];
  selectedId?: string | null;
  onSelect?: (node: T) => void;
  className?: string;
  renderLabel?: (node: T) => React.ReactNode;
  /** Mirror the tree: indent right-to-left, right-align content */
  flipped?: boolean;
  /** Loading state: render skeleton sections instead of content. */
  loading?: boolean;
  /** Error state: when set, render the error block. */
  error?: Error | string | null;
  /** Override the error primary text (default: "Something went wrong"). */
  errorMessage?: string;
  /** Retry handler — when provided, renders a Retry button in the error block. */
  onRetry?: () => void;
  /** Empty state primary text. Default: "No sections." */
  emptyMessage?: string;
  /** Empty state secondary text. */
  emptyHint?: string;
  /** Empty state CTA. */
  emptyAction?: { label: string; onClick: () => void };
}

function countNodes(nodes: TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.children) {
      count += countNodes(node.children);
    }
  }
  return count;
}

function collectAllBranchIds(nodes: TreeNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.type === "branch") {
      ids.push(node.id);
      if (node.children) {
        ids.push(...collectAllBranchIds(node.children));
      }
    }
  }
  return ids;
}

function SectionedTreeImpl<T extends TreeNode = TreeNode>({
  sections,
  selectedId,
  onSelect,
  className,
  renderLabel,
  flipped = false,
  loading,
  error,
  errorMessage,
  onRetry,
  emptyMessage = "No sections.",
  emptyHint,
  emptyAction,
}: SectionedTreeProps<T>) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set()
  );
  const [expandedIdsMap, setExpandedIdsMap] = useState<
    Record<string, Set<string>>
  >({});
  const [allExpandedMap, setAllExpandedMap] = useState<
    Record<string, boolean>
  >({});

  const allSectionsCollapsed =
    sections.length > 0 &&
    sections.every((s) => collapsedSections.has(s.id));
  const noneSectionsCollapsed = sections.every(
    (s) => !collapsedSections.has(s.id)
  );

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const toggleAllSections = () => {
    if (allSectionsCollapsed) {
      setCollapsedSections(new Set());
    } else {
      setCollapsedSections(new Set(sections.map((s) => s.id)));
    }
  };

  const getExpandedIds = useCallback(
    (sectionId: string): Set<string> => {
      return expandedIdsMap[sectionId] ?? new Set();
    },
    [expandedIdsMap]
  );

  const handleToggle = useCallback(
    (sectionId: string, nodeId: string) => {
      setExpandedIdsMap((prev) => {
        const current = prev[sectionId] ?? new Set<string>();
        const next = new Set(current);
        if (next.has(nodeId)) next.delete(nodeId);
        else next.add(nodeId);
        return { ...prev, [sectionId]: next };
      });
    },
    []
  );

  const handleToggleExpandAll = useCallback(
    (sectionId: string, sectionNodes: TreeNode[]) => {
      setAllExpandedMap((prev) => {
        const isExpanded = prev[sectionId] ?? false;
        return { ...prev, [sectionId]: !isExpanded };
      });
      setExpandedIdsMap((prev) => {
        const isExpanded = allExpandedMap[sectionId] ?? false;
        if (isExpanded) {
          // Collapse all
          return { ...prev, [sectionId]: new Set<string>() };
        } else {
          // Expand all
          const allIds = collectAllBranchIds(sectionNodes);
          return { ...prev, [sectionId]: new Set(allIds) };
        }
      });
    },
    [allExpandedMap]
  );

  const sectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const section of sections) {
      counts[section.id] = countNodes(section.nodes);
    }
    return counts;
  }, [sections]);

  if (loading) {
    return (
      <div
        data-component="SectionedTree"
        data-testid="sectionedtree-loading"
        className={cn("cs-component-sectioned-tree-11 ", className)}
      >
        {Array.from({ length: LOADING_SECTION_COUNT }).map((_, s) => (
          <div key={`__sk-section-${s}`} className="cs-component-sectioned-tree-14 ">
            <Skeleton variant="text" width="40%" />
            {Array.from({ length: LOADING_ROWS_PER_SECTION }).map((_, r) => (
              <div key={r} className="cs-component-sectioned-tree-17">
                <Skeleton variant="text" width="70%" />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        data-component="SectionedTree"
        data-testid="sectionedtree-error"
        className={cn(
          "cs-component-sectioned-tree-22 ",
          className,
        )}
      >
        <AlertCircle className="cs-component-sectioned-tree-23 " />
        <div className="cs-component-sectioned-tree-24 ">
          {errorMessage ?? "Something went wrong"}
        </div>
        {(typeof error === "string" ? error : error?.message) && (
          <div className="cs-component-sectioned-tree-27 ">
            {typeof error === "string" ? error : error.message}
          </div>
        )}
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div
        data-component="SectionedTree"
        data-testid="sectionedtree-empty"
        className={cn(
          "cs-component-sectioned-tree-22 ",
          className,
        )}
      >
        <Inbox className="cs-component-sectioned-tree-33 " />
        <div className="cs-component-sectioned-tree-24 ">
          {emptyMessage}
        </div>
        {emptyHint && (
          <div className="cs-component-sectioned-tree-27 ">
            {emptyHint}
          </div>
        )}
        {emptyAction && (
          <Button variant="secondary" size="sm" onClick={emptyAction.onClick}>
            {emptyAction.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div data-component="SectionedTree" className={cn("cs-component-sectioned-tree-37 ", className)}>
      {/* Section-level collapse/expand toggle */}
      <button
        type="button"
        onClick={toggleAllSections}
        className={cn(
          "cs-component-sectioned-tree-39 ",
          "cs-component-sectioned-tree-40 ",
          "cs-component-sectioned-tree-41 ",
          "cs-component-sectioned-tree-42 ",
          flipped ? "cs-component-sectioned-tree-43" : "cs-component-sectioned-tree-44"
        )}
      >
        {allSectionsCollapsed
          ? "Expand all"
          : noneSectionsCollapsed
            ? "Collapse all"
            : "Collapse all"}
      </button>

      {sections.map((section) => {
        const isCollapsed = collapsedSections.has(section.id);
        const nodeCount = sectionCounts[section.id] ?? 0;

        return (
          <div key={section.id} className="cs-component-sectioned-tree-37 ">
            {/* Section header */}
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className={cn(
                "cs-component-sectioned-tree-49 ",
                "cs-component-sectioned-tree-50 ",
                "text-label-upper",
                "cs-component-sectioned-tree-52 ",
                "cs-component-sectioned-tree-41 ",
                "cs-component-sectioned-tree-53 ",
                flipped ? "cs-component-sectioned-tree-54 " : "cs-component-sectioned-tree-44"
              )}
            >
              {isCollapsed ? (
                flipped ? <ChevronLeft className="cs-component-sectioned-tree-55 " /> : <ChevronRight className="cs-component-sectioned-tree-55 " />
              ) : (
                <ChevronDown className="cs-component-sectioned-tree-55 " />
              )}
              <span className="cs-component-sectioned-tree-56">{section.label}</span>
              <span className="cs-component-sectioned-tree-57 ">
                {nodeCount}
              </span>
            </button>

            {/* Section content */}
            {!isCollapsed && (
              <div className="cs-component-sectioned-tree-58">
                <Tree
                  nodes={section.nodes as T[]}
                  expandedIds={getExpandedIds(section.id)}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onToggle={(nodeId) => handleToggle(section.id, nodeId)}
                  renderLabel={renderLabel}
                  filterable
                  onToggleExpandAll={() =>
                    handleToggleExpandAll(section.id, section.nodes)
                  }
                  allExpanded={allExpandedMap[section.id] ?? false}
                  flipped={flipped}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const SectionedTreeWithRef = forwardRefToRoot<HTMLDivElement, SectionedTreeProps<TreeNode>>(SectionedTreeImpl);
export const SectionedTree = SectionedTreeWithRef as <T extends TreeNode = TreeNode>(
  props: SectionedTreeProps<T> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;
