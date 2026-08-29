"use client";

import { lazy, Suspense, useState, useMemo, useRef, useEffect, useCallback, type ReactElement, type RefAttributes } from "react";
import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Folder,
  X,
  ListTree,
  List,
  UnfoldVertical,
  FoldVertical,
  GripVertical,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { cn } from "../lib/cn";
import { HighlightText } from "./HighlightText";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

const LOADING_NODE_COUNT = 6;
const LazySortableRow = lazy(() =>
  import("./TreeDnd").then((module) => ({ default: module.SortableRow })),
);
const LazyDndGroup = lazy(() =>
  import("./TreeDnd").then((module) => ({ default: module.DndGroup })),
);

export interface TreeNode {
  id: string;
  name: string;
  type: "branch" | "leaf";
  children?: TreeNode[];
}

interface TreeProps<T extends TreeNode> {
  nodes: T[];
  expandedIds: Set<string>;
  selectedId?: string | null;
  onSelect?: (node: T) => void;
  onToggle?: (nodeId: string) => void;
  className?: string;
  renderLabel?: (node: T) => React.ReactNode;
  /** Opt-in search/filter toolbar */
  filterable?: boolean;
  /** Placeholder for the filter input */
  filterPlaceholder?: string;
  /** Callback to toggle expand-all state */
  onToggleExpandAll?: () => void;
  /** Whether all nodes are currently expanded */
  allExpanded?: boolean;
  /** Mirror the tree: indent right-to-left, right-align content */
  flipped?: boolean;
  /** Enable drag-to-reorder within sibling groups */
  reorderable?: boolean;
  /** Called when items are reordered via drag */
  onReorder?: (parentId: string | null, orderedIds: string[]) => void;
  /** Loading state: render skeleton rows instead of nodes. */
  loading?: boolean;
  /** Error state: when set (Error or string), render the error block. */
  error?: Error | string | null;
  /** Override the error primary text (default: "Something went wrong"). */
  errorMessage?: string;
  /** Retry handler — when provided, renders a Retry button in the error block. */
  onRetry?: () => void;
  /** Empty state primary text. Default: "No nodes." */
  emptyMessage?: string;
  /** Empty state secondary text. */
  emptyHint?: string;
  /** Empty state CTA. */
  emptyAction?: { label: string; onClick: () => void };
}

// ── Flat entry for search ───────────────────────────────────

interface FlatEntry<T> {
  node: T;
  path: string;
  depth: number;
  ancestorIds: string[];
}

function flattenTree<T extends TreeNode>(
  nodes: T[],
  parentPath: string = "",
  depth: number = 0,
  ancestorIds: string[] = []
): FlatEntry<T>[] {
  const result: FlatEntry<T>[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    result.push({ node, path, depth, ancestorIds: [...ancestorIds] });
    if (node.children && node.children.length > 0) {
      result.push(
        ...flattenTree(
          node.children as T[],
          path,
          depth + 1,
          [...ancestorIds, node.id]
        )
      );
    }
  }
  return result;
}

// ── Compute visible ordered nodes for keyboard nav ──────────

interface VisibleNode<T> {
  node: T;
  depth: number;
  ancestorIds: string[];
}

function computeVisibleNodes<T extends TreeNode>(
  nodes: T[],
  expandedIds: Set<string>,
  visibleNodeIds: Set<string> | null,
  depth: number = 0,
  ancestorIds: string[] = []
): VisibleNode<T>[] {
  const result: VisibleNode<T>[] = [];
  for (const node of nodes) {
    if (visibleNodeIds && !visibleNodeIds.has(node.id)) continue;
    result.push({ node, depth, ancestorIds: [...ancestorIds] });
    if (
      node.type === "branch" &&
      expandedIds.has(node.id) &&
      node.children
    ) {
      result.push(
        ...computeVisibleNodes(
          node.children as T[],
          expandedIds,
          visibleNodeIds,
          depth + 1,
          [...ancestorIds, node.id]
        )
      );
    }
  }
  return result;
}

// ── Sortable node row wrapper ───────────────────────────────

function SortableTreeNodeRow<T extends TreeNode>(
  props: TreeNodeRowProps<T> & { sortableId: string }
) {
  const { sortableId, ...rowProps } = props;
  return (
    <Suspense fallback={<TreeNodeRowInner {...rowProps} />}>
      <LazySortableRow id={sortableId}>
        {({ setNodeRef, style, attributes, listeners }) => (
          <TreeNodeRowInner
            {...rowProps}
            sortableRef={setNodeRef}
            sortableStyle={style}
            sortableAttributes={attributes}
            dragListeners={listeners}
          />
        )}
      </LazySortableRow>
    </Suspense>
  );
}

// ── Node row ────────────────────────────────────────────────

interface TreeNodeRowProps<T extends TreeNode> {
  node: T;
  depth: number;
  path: string;
  expandedIds: Set<string>;
  selectedId?: string | null;
  focusedNodeId?: string | null;
  onSelect?: (node: T) => void;
  onToggle?: (nodeId: string) => void;
  renderLabel?: (node: T) => React.ReactNode;
  filterText: string;
  matchNodeIds: Set<string> | null;
  currentMatchId: string | null;
  visibleNodeIds: Set<string> | null;
  flipped?: boolean;
  reorderable?: boolean;
  onReorder?: (parentId: string | null, orderedIds: string[]) => void;
}

function TreeNodeRow<T extends TreeNode>(props: TreeNodeRowProps<T>) {
  return <TreeNodeRowInner {...props} />;
}

function TreeNodeRowInner<T extends TreeNode>({
  node,
  depth,
  path,
  expandedIds,
  selectedId,
  focusedNodeId,
  onSelect,
  onToggle,
  renderLabel,
  filterText,
  matchNodeIds,
  currentMatchId,
  visibleNodeIds,
  flipped,
  reorderable,
  onReorder,
  sortableRef,
  sortableStyle,
  sortableAttributes,
  dragListeners,
}: TreeNodeRowProps<T> & {
  sortableRef?: (node: HTMLElement | null) => void;
  sortableStyle?: React.CSSProperties;
  // dnd-kit returns untyped attribute / listener bags; `any` keeps the JSX
  // spread onto the row element assignable without per-prop casts. (This repo's
  // lint is token-discipline only — it does not run the no-explicit-any rule.)
  sortableAttributes?: Record<string, any>;
  dragListeners?: Record<string, any>;
}) {
  // During search, hide nodes not in visible set
  if (visibleNodeIds && !visibleNodeIds.has(node.id)) {
    return null;
  }

  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isBranch = node.type === "branch";
  const isMatch = matchNodeIds?.has(node.id) ?? false;
  const isCurrentMatch = currentMatchId === node.id;
  const isFocused = focusedNodeId === node.id;

  const handleClick = () => {
    if (isBranch) {
      onToggle?.(node.id);
    } else {
      onSelect?.(node);
    }
  };

  const label = renderLabel ? (
    renderLabel(node)
  ) : filterText ? (
    <HighlightText text={node.name} query={filterText} />
  ) : (
    node.name
  );

  return (
    <>
      <div
        ref={sortableRef}
        style={{
          ...(flipped
            ? { paddingRight: `calc(${depth} * var(--tree-indent-size) + var(--tree-indent-base))` }
            : { paddingLeft: `calc(${depth} * var(--tree-indent-size) + var(--tree-indent-base))` }),
          ...sortableStyle,
        }}
        role="treeitem"
        aria-expanded={isBranch ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-level={depth + 1}
        tabIndex={isFocused ? 0 : -1}
        data-tree-node-id={node.id}
        className={cn(
          "cs-component-tree-23 ",
          "cs-component-tree-24 ",
          flipped && "cs-component-tree-25",
          isCurrentMatch &&
            "cs-component-tree-26 ",
          !isCurrentMatch &&
            isMatch &&
            "cs-component-tree-27",
          !isCurrentMatch &&
            !isMatch &&
            isSelected &&
            "cs-component-tree-28 ",
          !isSelected && !isMatch && !isCurrentMatch && "cs-component-tree-29"
        )}
        onClick={handleClick}
        {...sortableAttributes}
      >
        {reorderable && (
          <span
            className="cs-component-tree-30 "
            {...dragListeners}
          >
            <GripVertical className="cs-component-tree-31 " />
          </span>
        )}
        {isBranch ? (
          isExpanded ? (
            <ChevronDown className="cs-component-tree-32 " />
          ) : flipped ? (
            <ChevronLeft className="cs-component-tree-32 " />
          ) : (
            <ChevronRight className="cs-component-tree-32 " />
          )
        ) : (
          <span className="cs-component-tree-33" />
        )}
        {isBranch ? (
          <Folder className="cs-component-tree-32 " />
        ) : (
          <FileText className="cs-component-tree-32 " />
        )}
        <span className="cs-component-tree-34">{label}</span>
      </div>
      {isBranch && isExpanded && node.children && (
        <div role="group">
          {reorderable ? (
            <SiblingDndGroup parentId={node.id} nodes={node.children as T[]} onReorder={onReorder}>
              {node.children.map((child) => {
                const childPath = `${path} / ${child.name}`;
                return (
                  <SortableTreeNodeRow
                    key={child.id}
                    sortableId={child.id}
                    node={child as T}
                    depth={depth + 1}
                    path={childPath}
                    expandedIds={expandedIds}
                    selectedId={selectedId}
                    focusedNodeId={focusedNodeId}
                    onSelect={onSelect}
                    onToggle={onToggle}
                    renderLabel={renderLabel}
                    filterText={filterText}
                    matchNodeIds={matchNodeIds}
                    currentMatchId={currentMatchId}
                    visibleNodeIds={visibleNodeIds}
                    flipped={flipped}
                    reorderable={reorderable}
                    onReorder={onReorder}
                  />
                );
              })}
            </SiblingDndGroup>
          ) : (
            node.children.map((child) => {
              const childPath = `${path} / ${child.name}`;
              return (
                <TreeNodeRow
                  key={child.id}
                  node={child as T}
                  depth={depth + 1}
                  path={childPath}
                  expandedIds={expandedIds}
                  selectedId={selectedId}
                  focusedNodeId={focusedNodeId}
                  onSelect={onSelect}
                  onToggle={onToggle}
                  renderLabel={renderLabel}
                  filterText={filterText}
                  matchNodeIds={matchNodeIds}
                  currentMatchId={currentMatchId}
                  visibleNodeIds={visibleNodeIds}
                  flipped={flipped}
                />
              );
            })
          )}
        </div>
      )}
    </>
  );
}

// ── Flat path row (for flat display mode) ───────────────────

function FlatPathRow<T extends TreeNode>({
  entry,
  filterText,
  isCurrentMatch,
  isSelected,
  isFocused,
  onSelect,
  onMatchClick,
  flipped,
}: {
  entry: FlatEntry<T>;
  filterText: string;
  isCurrentMatch: boolean;
  isSelected: boolean;
  isFocused: boolean;
  onSelect?: (node: T) => void;
  onMatchClick?: () => void;
  flipped?: boolean;
}) {
  const handleClick = () => {
    if (entry.node.type === "leaf") {
      onMatchClick?.();
      onSelect?.(entry.node);
    }
  };
  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={isFocused ? 0 : -1}
      data-tree-node-id={entry.node.id}
      className={cn(
        "cs-component-tree-44 ",
        "cs-component-tree-24 ",
        flipped && "cs-component-tree-25",
        isCurrentMatch &&
          "cs-component-tree-26 ",
        !isCurrentMatch &&
          isSelected &&
          "cs-component-tree-28 ",
        !isCurrentMatch && !isSelected && "cs-component-tree-29"
      )}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <FileText className="cs-component-tree-32 " />
      <span className="cs-component-tree-34">
        <HighlightText text={entry.path} query={filterText} />
      </span>
    </div>
  );
}

// ── Sibling group wrapper for DnD ───────────────────────────

function SiblingDndGroup<T extends TreeNode>({
  parentId,
  nodes,
  onReorder,
  children,
}: {
  parentId: string | null;
  nodes: T[];
  onReorder?: (parentId: string | null, orderedIds: string[]) => void;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={children}>
      <LazyDndGroup
        parentId={parentId}
        ids={nodes.map((node) => node.id)}
        onReorder={onReorder}
      >
        {children}
      </LazyDndGroup>
    </Suspense>
  );
}

// ── Main component ──────────────────────────────────────────

function TreeImpl<T extends TreeNode>({
  nodes,
  expandedIds,
  selectedId,
  onSelect,
  onToggle,
  className,
  renderLabel,
  filterable = false,
  filterPlaceholder = "Filter...",
  onToggleExpandAll,
  allExpanded,
  flipped = false,
  reorderable = false,
  onReorder,
  loading,
  error,
  errorMessage,
  onRetry,
  emptyMessage = "No nodes.",
  emptyHint,
  emptyAction,
}: TreeProps<T>) {
  const [filterText, setFilterText] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [displayMode, setDisplayMode] = useState<"tree" | "flat">("tree");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce filter text with minimum character threshold
  const FILTER_MIN_CHARS = 3;
  const FILTER_DEBOUNCE_MS = 150;

  useEffect(() => {
    if (filterText.length < FILTER_MIN_CHARS) {
      setDebouncedFilter("");
      return;
    }
    const timer = setTimeout(() => setDebouncedFilter(filterText), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filterText]);

  // Flatten tree (memoized on nodes)
  const allFlat = useMemo(() => flattenTree(nodes), [nodes]);

  // Compute matches (driven by debounced value) — filename only, leaves only
  const matchEntries = useMemo(() => {
    if (!debouncedFilter) return [];
    const lower = debouncedFilter.toLowerCase();
    return allFlat.filter(
      (e) => e.node.type === "leaf" && e.node.name.toLowerCase().includes(lower)
    );
  }, [allFlat, debouncedFilter]);

  const matchNodeIds = useMemo(() => {
    if (matchEntries.length === 0) return null;
    return new Set(matchEntries.map((e) => e.node.id));
  }, [matchEntries]);

  // Visible node IDs (matches + ancestors) for tree mode
  const visibleNodeIds = useMemo(() => {
    if (!debouncedFilter || matchEntries.length === 0) return null;
    const ids = new Set<string>();
    for (const entry of matchEntries) {
      ids.add(entry.node.id);
      for (const aid of entry.ancestorIds) {
        ids.add(aid);
      }
    }
    return ids;
  }, [debouncedFilter, matchEntries]);

  // Expand override: during search, expand all ancestors of matches
  const searchExpandedIds = useMemo(() => {
    if (!debouncedFilter || matchEntries.length === 0) return null;
    const ids = new Set<string>();
    for (const entry of matchEntries) {
      for (const aid of entry.ancestorIds) {
        ids.add(aid);
      }
    }
    return ids;
  }, [debouncedFilter, matchEntries]);

  const effectiveExpandedIds = searchExpandedIds ?? expandedIds;

  // Clamp match index when matches change
  useEffect(() => {
    if (matchEntries.length === 0) {
      setCurrentMatchIndex(0);
    } else if (currentMatchIndex >= matchEntries.length) {
      setCurrentMatchIndex(0);
    }
  }, [matchEntries.length, currentMatchIndex]);

  const currentMatchId =
    matchEntries.length > 0 ? matchEntries[currentMatchIndex]?.node.id ?? null : null;

  // Visible ordered nodes for keyboard navigation
  const visibleOrderedNodes = useMemo(() => {
    if (displayMode === "tree") {
      return computeVisibleNodes(nodes, effectiveExpandedIds, visibleNodeIds);
    } else {
      // flat mode
      const entries = debouncedFilter ? matchEntries : allFlat;
      return entries.map((e) => ({
        node: e.node,
        depth: e.depth,
        ancestorIds: e.ancestorIds,
      }));
    }
  }, [displayMode, nodes, effectiveExpandedIds, visibleNodeIds, debouncedFilter, matchEntries, allFlat]);

  // Seed the roving tab stop before keyboard focus enters the tree. This also
  // makes Tree instances nested inside SectionedTree reachable with Tab.
  useEffect(() => {
    setFocusedNodeId((current) =>
      current && visibleOrderedNodes.some(({ node }) => node.id === current)
        ? current
        : visibleOrderedNodes[0]?.node.id ?? null
    );
  }, [visibleOrderedNodes]);

  // Scroll to current match — vertically to the row, horizontally to the highlight
  const scrollToNode = useCallback(
    (nodeId: string | null) => {
      if (!nodeId || !containerRef.current) return;
      requestAnimationFrame(() => {
        const el = containerRef.current?.querySelector(
          `[data-tree-node-id="${nodeId}"]`
        );
        if (!el) return;
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        // Scroll the first highlight mark into horizontal view
        const mark = el.querySelector("mark");
        if (mark && containerRef.current) {
          const container = containerRef.current;
          const markRect = mark.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (markRect.left < containerRect.left || markRect.right > containerRect.right) {
            const scrollLeft = mark.offsetLeft - container.offsetWidth / 2;
            container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "smooth" });
          }
        }
      });
    },
    []
  );

  useEffect(() => {
    scrollToNode(currentMatchId);
  }, [currentMatchId, scrollToNode]);

  const goNextMatch = () => {
    if (matchEntries.length === 0) return;
    setCurrentMatchIndex((i) => (i + 1) % matchEntries.length);
  };

  const goPrevMatch = () => {
    if (matchEntries.length === 0) return;
    setCurrentMatchIndex(
      (i) => (i - 1 + matchEntries.length) % matchEntries.length
    );
  };

  const handleFilterChange = (value: string) => {
    setFilterText(value);
    setCurrentMatchIndex(0);
  };

  const clearFilter = () => {
    setFilterText("");
    setDebouncedFilter("");
    setCurrentMatchIndex(0);
  };

  // Keyboard navigation at container level
  const handleContainerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const navKeys = [
        "ArrowDown",
        "ArrowUp",
        "ArrowRight",
        "ArrowLeft",
        "Home",
        "End",
        "Enter",
        " ",
      ];
      if (!navKeys.includes(e.key)) return;

      // Don't intercept if focus is on the filter input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      e.preventDefault();

      const ordered = visibleOrderedNodes;
      if (ordered.length === 0) return;

      const currentIndex = ordered.findIndex(
        (v) => v.node.id === focusedNodeId
      );

      const focusNode = (id: string) => {
        setFocusedNodeId(id);
        scrollToNode(id);
        const target = containerRef.current
          ?.querySelector<HTMLElement>(`[data-tree-node-id="${id}"]`);
        if (target) target.focus();
        else requestAnimationFrame(() => {
          containerRef.current
            ?.querySelector<HTMLElement>(`[data-tree-node-id="${id}"]`)
            ?.focus();
        });
      };

      if (e.key === "ArrowDown") {
        const next =
          currentIndex < ordered.length - 1
            ? ordered[currentIndex + 1]
            : ordered[0];
        focusNode(next.node.id);
      } else if (e.key === "ArrowUp") {
        const prev = ordered[Math.max(0, currentIndex - 1)];
        focusNode(prev.node.id);
      } else if (e.key === "ArrowRight") {
        if (currentIndex === -1) return;
        const current = ordered[currentIndex];
        if (current.node.type === "branch") {
          if (!effectiveExpandedIds.has(current.node.id)) {
            // Expand
            onToggle?.(current.node.id);
          } else if (current.node.children && current.node.children.length > 0) {
            // Focus first child
            const firstChild = current.node.children[0];
            focusNode(firstChild.id);
          }
        }
      } else if (e.key === "ArrowLeft") {
        if (currentIndex === -1) return;
        const current = ordered[currentIndex];
        if (
          current.node.type === "branch" &&
          effectiveExpandedIds.has(current.node.id)
        ) {
          // Collapse
          onToggle?.(current.node.id);
        } else {
          // Focus parent
          const parentId =
            current.ancestorIds.length > 0
              ? current.ancestorIds[current.ancestorIds.length - 1]
              : null;
          if (parentId) {
            focusNode(parentId);
          }
        }
      } else if (e.key === "Home") {
        focusNode(ordered[0].node.id);
      } else if (e.key === "End") {
        focusNode(ordered[ordered.length - 1].node.id);
      } else if (e.key === "Enter" || e.key === " ") {
        if (currentIndex === -1) return;
        const current = ordered[currentIndex];
        if (current.node.type === "branch") {
          onToggle?.(current.node.id);
        } else {
          onSelect?.(current.node as T);
        }
      }
    },
    [
      visibleOrderedNodes,
      focusedNodeId,
      effectiveExpandedIds,
      onToggle,
      onSelect,
      scrollToNode,
    ]
  );

  // Initialize focusedNodeId when the container first receives focus
  const handleContainerFocus = useCallback(
    (e: React.FocusEvent) => {
      // Only handle if focus came from outside the container
      if (
        containerRef.current &&
        !containerRef.current.contains(e.relatedTarget as Node)
      ) {
        if (!focusedNodeId && visibleOrderedNodes.length > 0) {
          setFocusedNodeId(visibleOrderedNodes[0].node.id);
        }
      }
    },
    [focusedNodeId, visibleOrderedNodes]
  );

  const isSearchActive = debouncedFilter.length > 0;
  const isBelowThreshold = filterText.length > 0 && filterText.length < FILTER_MIN_CHARS;
  const hasMatches = matchEntries.length > 0;

  // Wrap onSelect to sync match index when clicking a matched node
  const handleSelect = useCallback(
    (node: T) => {
      if (isSearchActive && matchEntries.length > 0) {
        const idx = matchEntries.findIndex((e) => e.node.id === node.id);
        if (idx >= 0) setCurrentMatchIndex(idx);
      }
      onSelect?.(node);
    },
    [isSearchActive, matchEntries, onSelect]
  );

  const renderTreeContent = () => {
    if (displayMode === "tree") {
      if (isSearchActive && !hasMatches) {
        return (
          <div className="cs-component-tree-88 ">
            <span className="cs-component-tree-89 ">
              No matches
            </span>
          </div>
        );
      }

      const rows = nodes.map((node) =>
        reorderable ? (
          <SortableTreeNodeRow
            key={node.id}
            sortableId={node.id}
            node={node}
            depth={0}
            path={node.name}
            expandedIds={effectiveExpandedIds}
            selectedId={selectedId}
            focusedNodeId={focusedNodeId}
            onSelect={handleSelect}
            onToggle={onToggle}
            renderLabel={renderLabel}
            filterText={debouncedFilter}
            matchNodeIds={matchNodeIds}
            currentMatchId={currentMatchId}
            visibleNodeIds={visibleNodeIds}
            flipped={flipped}
            reorderable={reorderable}
            onReorder={onReorder}
          />
        ) : (
          <TreeNodeRow
            key={node.id}
            node={node}
            depth={0}
            path={node.name}
            expandedIds={effectiveExpandedIds}
            selectedId={selectedId}
            focusedNodeId={focusedNodeId}
            onSelect={handleSelect}
            onToggle={onToggle}
            renderLabel={renderLabel}
            filterText={debouncedFilter}
            matchNodeIds={matchNodeIds}
            currentMatchId={currentMatchId}
            visibleNodeIds={visibleNodeIds}
            flipped={flipped}
          />
        )
      );

      if (reorderable) {
        return (
          <SiblingDndGroup parentId={null} nodes={nodes} onReorder={onReorder}>
            {rows}
          </SiblingDndGroup>
        );
      }

      return rows;
    }

    // Flat mode
    if (isSearchActive && !hasMatches) {
      return (
        <div className="cs-component-tree-88 ">
          <span className="cs-component-tree-89 ">
            No matches
          </span>
        </div>
      );
    }

    const entries = isSearchActive ? matchEntries : allFlat;
    return entries.map((entry, i) => (
      <FlatPathRow
        key={entry.node.id}
        entry={entry}
        filterText={debouncedFilter}
        isCurrentMatch={currentMatchId === entry.node.id}
        isSelected={selectedId === entry.node.id}
        isFocused={focusedNodeId === entry.node.id}
        onSelect={handleSelect}
        onMatchClick={isSearchActive ? () => setCurrentMatchIndex(i) : undefined}
        flipped={flipped}
      />
    ));
  };

  return (
    <div data-component="Tree" className={cn("cs-component-tree-91 ", className)}>
      {/* Filter toolbar */}
      {filterable && (
        <div className="cs-component-tree-92 ">
          {/* Search row */}
          <div className="cs-component-tree-93 ">
            <div className="cs-component-tree-94 ">
              <input
                type="text"
                aria-label="Filter tree"
                value={filterText}
                onChange={(e) => handleFilterChange(e.target.value)}
                placeholder={filterPlaceholder}
                className={cn(
                  "cs-component-tree-96 ",
                  "cs-component-tree-97 ",
                  "cs-component-tree-98 ",
                  "cs-component-tree-99",
                  "cs-component-tree-100",
                  "cs-component-tree-101 ",
                  "cs-component-tree-102"
                )}
              />
              {filterText.length > 0 && (
                <button
                  type="button"
                  onClick={clearFilter}
                  className="cs-component-tree-104 "
                  aria-label="Clear filter"
                >
                  <X className="cs-component-tree-106 " />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                setDisplayMode((m) => (m === "tree" ? "flat" : "tree"))
              }
              className={cn(
                "cs-component-tree-111 ",
                "cs-component-tree-112 ",
                "cs-component-tree-113 "
              )}
              aria-label={
                displayMode === "tree"
                  ? "Switch to flat list"
                  : "Switch to tree view"
              }
              title={
                displayMode === "tree" ? "Flat list view" : "Tree view"
              }
            >
              {displayMode === "tree" ? (
                <List className="cs-component-tree-31 " />
              ) : (
                <ListTree className="cs-component-tree-31 " />
              )}
            </button>
          </div>

          {/* Match counter + navigation */}
          {isBelowThreshold && (
            <div className="cs-component-tree-121 ">
              <span role="status" aria-live="polite" className="cs-component-tree-89 ">
                Type {FILTER_MIN_CHARS - filterText.length} more to search
              </span>
            </div>
          )}
          {isSearchActive && (
            <div className="cs-component-tree-122 ">
              <span role="status" aria-live="polite" className="cs-component-tree-123 ">
                {hasMatches
                  ? `${currentMatchIndex + 1} / ${matchEntries.length} matches`
                  : "No matches"}
              </span>
              {hasMatches && (
                <div className="cs-component-tree-128 ">
                  <button
                    type="button"
                    onClick={goPrevMatch}
                    className="cs-component-tree-130 "
                    aria-label="Previous match"
                  >
                    <ChevronUp className="cs-component-tree-31 " />
                  </button>
                  <button
                    type="button"
                    onClick={goNextMatch}
                    className="cs-component-tree-130 "
                    aria-label="Next match"
                  >
                    <ChevronDown className="cs-component-tree-31 " />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Expand all / collapse all */}
          {onToggleExpandAll && (
            <button
              type="button"
              onClick={onToggleExpandAll}
              className={cn(
                "cs-component-tree-93 ",
                "cs-component-tree-135 ",
                "cs-component-tree-136 ",
                "cs-component-tree-137 ",
                flipped ? "cs-component-tree-138 " : "cs-component-tree-139"
              )}
            >
              {allExpanded ? (
                <FoldVertical className="cs-component-tree-106 " />
              ) : (
                <UnfoldVertical className="cs-component-tree-106 " />
              )}
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
      )}

      {/* Tree or flat list content */}
      <div
        ref={containerRef}
        className="cs-component-tree-142 "
        role={displayMode === "tree" ? "tree" : "listbox"}
        onKeyDown={handleContainerKeyDown}
        onFocus={handleContainerFocus}
      >
        {loading ? (
          <div data-testid="tree-loading" className="cs-component-tree-147 ">
            {Array.from({ length: LOADING_NODE_COUNT }).map((_, i) => (
              <div
                key={`__skeleton-${i}`}
                className="cs-component-tree-150 "
                style={{ paddingLeft: `${(i % 3) * 16}px` }}
              >
                <Skeleton variant="text" width="60%" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            data-testid="tree-error"
            className="cs-component-tree-156 "
          >
            <AlertCircle className="cs-component-tree-157 " />
            <div className="cs-component-tree-158 ">
              {errorMessage ?? "Something went wrong"}
            </div>
            {(typeof error === "string" ? error : error?.message) && (
              <div className="cs-component-tree-161 ">
                {typeof error === "string" ? error : error.message}
              </div>
            )}
            {onRetry && (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        ) : nodes.length === 0 ? (
          <div
            data-testid="tree-empty"
            className="cs-component-tree-156 "
          >
            <Inbox className="cs-component-tree-166 " />
            <div className="cs-component-tree-158 ">
              {emptyMessage}
            </div>
            {emptyHint && (
              <div className="cs-component-tree-161 ">
                {emptyHint}
              </div>
            )}
            {emptyAction && (
              <Button variant="secondary" size="sm" onClick={emptyAction.onClick}>
                {emptyAction.label}
              </Button>
            )}
          </div>
        ) : (
          renderTreeContent()
        )}
      </div>
    </div>
  );
}

const TreeWithRef = forwardRefToRoot<HTMLDivElement, TreeProps<TreeNode>>(TreeImpl);
export const Tree = TreeWithRef as <T extends TreeNode>(
  props: TreeProps<T> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;
