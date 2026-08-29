"use client";

import { useState, useMemo, useCallback, useEffect, useRef, type ReactElement, type RefAttributes } from "react";
import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import {
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  AlertCircle,
} from "lucide-react";
import { cn } from "../lib/cn";
import { SearchInput } from "./SearchInput";
import { Dropdown } from "./Dropdown";
import { Button } from "./Button";
import { Skeleton } from "./Skeleton";

const LOADING_ROW_COUNT = 8;

export interface TableColumn<T> {
  id: string;
  header: string;
  cell: (row: T, filterQuery?: string) => React.ReactNode;
  sortable?: boolean;
  /** Keep this sortable column fixed to one direction when activated. */
  sortDirection?: "asc" | "desc";
  align?: "left" | "right" | "center";
  /** Column width (any CSS value: "30%", "200px", "12rem"). Works best with fixed layout. */
  width?: string;
  /** Returns searchable plain text. If provided, column participates in filtering. */
  searchValue?: (row: T) => string;
  /** Allow text to wrap in this column. Default: false (single-line with ellipsis). */
  wrap?: boolean;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onSort?: (columnId: string, direction: "asc" | "desc") => void;
  sort?: { columnId: string; direction: "asc" | "desc" };
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  fixed?: boolean;
  className?: string;
  /** Show filter bar above the table. Needs at least one column with searchValue. */
  filterable?: boolean;
  /** Placeholder for the filter input. Default: "Filter..." */
  filterPlaceholder?: string;
  /** Controlled filter value. */
  filter?: string;
  onFilterChange?: (value: string) => void;
  /** Rows per page. Omit = no pagination. */
  pageSize?: number;
  /** Controlled zero-based page index. */
  page?: number;
  onPageChange?: (page: number) => void;
  /** Loading state: render skeleton rows instead of data. */
  loading?: boolean;
  /** Error state: when set, render the error block instead of rows. */
  error?: Error | string | null;
  /** Optional error message override (defaults to "Something went wrong"). */
  errorMessage?: string;
  /** Retry handler. When provided, renders a Retry button in the error state. */
  onRetry?: () => void;
  /** Empty state primary text. Default: "No results." */
  emptyMessage?: string;
  /** Empty state secondary text. */
  emptyHint?: string;
  /** Empty state CTA. */
  emptyAction?: { label: string; onClick: () => void };
}

function handleTruncationHover(e: React.MouseEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  el.title = el.scrollWidth > el.clientWidth ? (el.textContent || "") : "";
}

function matchesFilter<T>(
  row: T,
  query: string,
  columns: TableColumn<T>[],
  columnId: string
): boolean {
  const q = query.toLowerCase();
  const searchCols =
    columnId === "all"
      ? columns.filter((c) => c.searchValue)
      : columns.filter((c) => c.id === columnId && c.searchValue);
  return searchCols.some((c) => c.searchValue!(row).toLowerCase().includes(q));
}

function TableImpl<T>({
  columns,
  data,
  rowKey,
  onSort,
  sort,
  onRowClick,
  selectedKey,
  fixed,
  className,
  filterable,
  filterPlaceholder = "Filter...",
  filter: controlledFilter,
  onFilterChange,
  pageSize,
  page: controlledPage,
  onPageChange,
  loading,
  error,
  errorMessage,
  onRetry,
  emptyMessage = "No results.",
  emptyHint,
  emptyAction,
}: TableProps<T>) {
  const [internalFilter, setInternalFilter] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterColumn, setFilterColumn] = useState("all");
  const [internalPage, setInternalPage] = useState(0);
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null);
  const filterQuery = controlledFilter ?? internalFilter;
  const page = controlledPage ?? internalPage;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const setFilterQuery = useCallback((value: string) => {
    if (controlledFilter === undefined) setInternalFilter(value);
    onFilterChange?.(value);
  }, [controlledFilter, onFilterChange]);
  const setPage = useCallback((next: number | ((page: number) => number)) => {
    const value = typeof next === "function" ? next(page) : next;
    if (controlledPage === undefined) setInternalPage(value);
    onPageChange?.(value);
  }, [controlledPage, onPageChange, page]);

  // Debounce filter query (200ms)
  useEffect(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(filterQuery);
    }, 200);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [filterQuery]);

  // Reset page on filter/column change
  useEffect(() => {
    setPage(0);
  }, [debouncedQuery, filterColumn]);

  const searchableColumns = useMemo(
    () => columns.filter((c) => c.searchValue),
    [columns]
  );

  const showFilter = filterable && searchableColumns.length > 0;
  const showColumnDropdown = searchableColumns.length > 1;

  const filteredData = useMemo(() => {
    if (!debouncedQuery || !showFilter) return data;
    return data.filter((row) =>
      matchesFilter(row, debouncedQuery, columns, filterColumn)
    );
  }, [data, debouncedQuery, columns, filterColumn, showFilter]);

  const totalPages =
    pageSize && pageSize > 0 ? Math.ceil(filteredData.length / pageSize) : 1;
  const showPagination = pageSize != null && pageSize > 0 && filteredData.length > pageSize;

  const pageData = useMemo(() => {
    if (!pageSize || pageSize <= 0) return filteredData;
    return filteredData.slice(page * pageSize, (page + 1) * pageSize);
  }, [filteredData, page, pageSize]);

  const pageRowKeys = useMemo(() => pageData.map(rowKey), [pageData, rowKey]);

  useEffect(() => {
    if (!onRowClick || pageRowKeys.length === 0) {
      setActiveRowKey(null);
      return;
    }
    setActiveRowKey((current) => {
      if (selectedKey != null && pageRowKeys.includes(selectedKey)) return selectedKey;
      if (current != null && pageRowKeys.includes(current)) return current;
      return pageRowKeys[0];
    });
  }, [onRowClick, pageRowKeys, selectedKey]);

  const focusRow = useCallback((key: string) => {
    setActiveRowKey(key);
    requestAnimationFrame(() => rowRefs.current.get(key)?.focus());
  }, []);

  const handleSort = (column: TableColumn<T>) => {
    if (!onSort) return;
    const newDir = column.sortDirection ??
      (sort?.columnId === column.id && sort.direction === "asc" ? "desc" : "asc");
    onSort(column.id, newDir);
  };

  const handleFilterSearch = useCallback((v: string) => {
    setDebouncedQuery(v);
  }, []);

  const activeFilterQuery = showFilter ? debouncedQuery : undefined;

  return (
    <div
      data-component="Table"
      className={cn(
        "cs-component-table-27 ",
        className
      )}
    >
      {/* Filter bar */}
      {showFilter && (
        <div className="cs-component-table-28 ">
          <div className="cs-component-table-29">
            <SearchInput
              value={filterQuery}
              onChange={setFilterQuery}
              onSearch={handleFilterSearch}
              aria-label="Filter rows"
              placeholder={filterPlaceholder}
              minChars={1}
              debounceMs={200}
            />
          </div>
          {showColumnDropdown && (
            <Dropdown
              value={filterColumn}
              onChange={setFilterColumn}
              aria-label="Filter column"
              options={[
                { value: "all", label: "All columns" },
                ...searchableColumns.map((c) => ({
                  value: c.id,
                  label: c.header,
                })),
              ]}
            />
          )}
          <span role="status" aria-live="polite" className="cs-component-table-91">
            {debouncedQuery ? `${filteredData.length} results` : `${data.length} rows`}
          </span>
        </div>
      )}

      <table
        className={cn("cs-component-table-32 ", "cs-component-table-33")}
        style={{ tableLayout: fixed ? "fixed" : undefined }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                className={cn(
                  "cs-component-table-35 ",
                  "cs-component-table-36 ",
                  "cs-component-table-37 ",
                  col.sortable && "cs-component-table-38 ",
                  col.align === "right" && "cs-component-table-40",
                  col.align === "center" && "cs-component-table-42",
                  !col.align && "cs-component-table-43"
                )}
                style={{ width: col.width }}
                onClick={() => col.sortable && handleSort(col)}
                tabIndex={col.sortable ? 0 : undefined}
                role={col.sortable ? "columnheader" : undefined}
                aria-sort={
                  sort?.columnId === col.id
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : col.sortable
                      ? "none"
                      : undefined
                }
                onKeyDown={(e) => {
                  if (
                    col.sortable &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    handleSort(col);
                  }
                }}
              >
                <span className="cs-component-table-51 ">
                  {col.header}
                  {col.sortable && sort?.columnId === col.id ? (
                    sort.direction === "asc" ? (
                      <ChevronUp
                        className="cs-component-table-53 "
                      />
                    ) : (
                      <ChevronDown
                        className="cs-component-table-53 "
                      />
                    )
                  ) : col.sortable ? (
                    <ArrowUpDown className="cs-component-table-54 " />
                  ) : null}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: LOADING_ROW_COUNT }).map((_, rowIdx) => (
              <tr key={`__skeleton-${rowIdx}`} data-testid="table-loading-row">
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="cs-component-table-58 "
                  >
                    <Skeleton variant="text" />
                  </td>
                ))}
              </tr>
            ))
          ) : error ? (
            <tr>
              <td
                colSpan={columns.length}
                className="cs-component-table-60 "
              >
                <div
                  data-testid="table-error"
                  className="cs-component-table-62 "
                >
                  <AlertCircle
                    className="cs-component-table-63 "
                  />
                  <div className="cs-component-table-64 ">
                    {errorMessage ?? "Something went wrong"}
                  </div>
                  {(typeof error === "string"
                    ? error
                    : error?.message) && (
                    <div className="cs-component-table-67 ">
                      {typeof error === "string" ? error : error.message}
                    </div>
                  )}
                  {onRetry && (
                    <Button variant="secondary" size="sm" onClick={onRetry}>
                      Retry
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : pageData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="cs-component-table-60 "
              >
                <div
                  data-testid="table-empty"
                  className="cs-component-table-62 "
                >
                  <Inbox
                    className="cs-component-table-72 "
                  />
                  <div className="cs-component-table-64 ">
                    {emptyMessage}
                  </div>
                  {emptyHint && (
                    <div className="cs-component-table-67 ">
                      {emptyHint}
                    </div>
                  )}
                  {emptyAction && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={emptyAction.onClick}
                    >
                      {emptyAction.label}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            pageData.map((row) => {
              const key = rowKey(row);
              const isSelected = selectedKey != null && key === selectedKey;
              return (
                <tr
                  key={key}
                  data-table-row={key}
                  ref={(node) => {
                    if (node) rowRefs.current.set(key, node);
                    else rowRefs.current.delete(key);
                  }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  tabIndex={onRowClick ? (key === activeRowKey ? 0 : -1) : undefined}
                  aria-current={onRowClick && isSelected ? "true" : undefined}
                  onFocus={onRowClick ? () => setActiveRowKey(key) : undefined}
                  onKeyDown={onRowClick ? (event) => {
                    // Handled keys are consumed, not just defaulted-away.
                    // Without stopPropagation a page-level Home/End/arrow
                    // handler runs too and moves a *second* selection: End
                    // inside a table jumped a consumer's separate timeline
                    // selection to its last event while also moving the row
                    // focus. EventLanes already does this, for the same
                    // measured reason (EventLanes.md).
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      onRowClick(row);
                    } else if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
                      event.preventDefault();
                      event.stopPropagation();
                      const current = pageRowKeys.indexOf(key);
                      const next = event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? pageRowKeys.length - 1
                          : event.key === "ArrowUp"
                            ? Math.max(0, current - 1)
                            : Math.min(pageRowKeys.length - 1, current + 1);
                      focusRow(pageRowKeys[next]);
                    }
                  } : undefined}
                  className={cn(
                    "cs-component-table-75",
                    onRowClick && "cs-component-table-76",
                    isSelected
                      ? "cs-component-table-77"
                      : "cs-component-table-78"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        "cs-component-table-35 ",
                        "cs-component-table-79 ",
                        col.align === "right" &&
                          "cs-component-table-81 ",
                        col.align === "center" && "cs-component-table-42"
                      )}
                    >
                      {col.wrap ? (
                        col.cell(row, activeFilterQuery)
                      ) : (
                        <div
                          className="cs-component-table-83 "
                          onMouseEnter={handleTruncationHover}
                        >
                          {col.cell(row, activeFilterQuery)}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Pagination footer — only when displaying data */}
      {showPagination && !loading && !error && pageData.length > 0 && (
        <div className="cs-component-table-84 ">
          <div className="cs-component-table-85 ">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="cs-component-table-88 " />
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
              <ChevronRight className="cs-component-table-88 " />
            </Button>
          </div>
          <span className="cs-component-table-91 ">
            Page {page + 1} of {totalPages}
          </span>
          <span className="cs-component-table-91 ">
            {debouncedQuery
              ? `${filteredData.length} of ${data.length}`
              : `${data.length} rows`}
          </span>
        </div>
      )}
    </div>
  );
}

const TableWithRef = forwardRefToRoot<HTMLDivElement, TableProps<unknown>>(TableImpl);
export const Table = TableWithRef as <T>(
  props: TableProps<T> & RefAttributes<HTMLDivElement>,
) => ReactElement | null;
