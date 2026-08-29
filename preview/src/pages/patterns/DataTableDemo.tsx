import { useState, useMemo } from "react";
import { Table, type TableColumn, StatusBadge, HighlightText } from "@codesweep-ai/ui";
import { packageRecords, type PackageRecord } from "../../data/patternFixtures";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatSize(kb: number): string {
  if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
  return `${kb} KB`;
}

export function DataTableDemo() {
  const [sort, setSort] = useState<{
    columnId: string;
    direction: "asc" | "desc";
  }>({ columnId: "name", direction: "asc" });

  const sorted = useMemo(() => {
    const copy = [...packageRecords];
    copy.sort((a, b) => {
      const key = sort.columnId as keyof PackageRecord;
      const av = a[key];
      const bv = b[key];
      if (typeof av === "string" && typeof bv === "string")
        return sort.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      if (typeof av === "number" && typeof bv === "number")
        return sort.direction === "asc" ? av - bv : bv - av;
      return 0;
    });
    return copy;
  }, [sort]);

  const columns: TableColumn<PackageRecord>[] = [
    {
      id: "name",
      header: "Package",
      sortable: true,
      width: "13%",
      searchValue: (row) => row.name,
      cell: (row, filterQuery) => (
        <span className="cs-preview-pages-patterns-data-table-demo-25">
          <HighlightText text={row.name} query={filterQuery} />
        </span>
      ),
    },
    {
      id: "version",
      header: "Version",
      width: "8%",
      searchValue: (row) => row.version,
      cell: (row, filterQuery) => (
        <span className="cs-preview-pages-patterns-data-table-demo-29 ">
          <HighlightText text={row.version} query={filterQuery} />
        </span>
      ),
    },
    {
      id: "license",
      header: "License",
      width: "9%",
      searchValue: (row) => row.license,
      cell: (row, filterQuery) => (
        <HighlightText text={row.license} query={filterQuery} />
      ),
    },
    {
      id: "sizeKb",
      header: "Size",
      sortable: true,
      align: "right",
      width: "7%",
      searchValue: (row) => formatSize(row.sizeKb),
      cell: (row) => formatSize(row.sizeKb),
    },
    {
      id: "downloads",
      header: "Downloads",
      sortable: true,
      align: "right",
      width: "10%",
      searchValue: (row) => formatNumber(row.downloads),
      cell: (row) => formatNumber(row.downloads),
    },
    {
      id: "description",
      header: "Description",
      searchValue: (row) => row.description,
      cell: (row, filterQuery) => (
        <span className="cs-preview-pages-patterns-data-table-demo-43">
          <HighlightText text={row.description} query={filterQuery} />
        </span>
      ),
    },
    {
      id: "author",
      header: "Author",
      sortable: true,
      width: "12%",
      searchValue: (row) => row.author,
      cell: (row, filterQuery) => (
        <HighlightText text={row.author} query={filterQuery} />
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "11%",
      wrap: true,
      cell: (row) => <StatusBadge label={row.status} status={row.status} />,
    },
  ];

  return (
    <div className="cs-preview-pages-patterns-data-table-demo-50 ">
      <div className="cs-preview-pages-patterns-data-table-demo-51 ">
        <div>
          <h2 className="cs-preview-pages-patterns-data-table-demo-52 ">
            Package Registry
          </h2>
          <p className="cs-preview-pages-patterns-data-table-demo-53 ">
            Filterable, sortable, paginated table with {packageRecords.length} packages.
            Try searching for "react", "MIT", or an author name.
          </p>
        </div>
        <Table<PackageRecord>
          columns={columns}
          data={sorted}
          rowKey={(row) => row.name}
          sort={sort}
          onSort={(columnId, direction) => setSort({ columnId, direction })}
          filterable
          filterPlaceholder="Search packages..."
          pageSize={10}
          fixed
        />
      </div>
    </div>
  );
}
