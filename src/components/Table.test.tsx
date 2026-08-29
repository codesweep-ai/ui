import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table, type TableColumn } from "./Table";

interface Row {
  id: string;
  name: string;
  count: number;
}

const columns: TableColumn<Row>[] = [
  { id: "name", header: "Name", cell: (r) => r.name },
  { id: "count", header: "Count", cell: (r) => r.count, align: "right" },
];

const rowKey = (r: Row) => r.id;

const sampleData: Row[] = [
  { id: "a", name: "Alpha", count: 1 },
  { id: "b", name: "Beta", count: 2 },
];

describe("Table — happy path", () => {
  it("renders headers and rows", () => {
    const { container } = render(<Table columns={columns} data={sampleData} rowKey={rowKey} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Count")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(container.querySelector('[data-table-row="a"]')).toContainElement(screen.getByText("Alpha"));
    expect(container.querySelectorAll("[data-table-row]")).toHaveLength(2);
  });

  it("calls onRowClick with the row", async () => {
    const onRowClick = vi.fn();
    render(
      <Table
        columns={columns}
        data={sampleData}
        rowKey={rowKey}
        onRowClick={onRowClick}
      />,
    );
    await userEvent.click(screen.getByText("Alpha"));
    expect(onRowClick).toHaveBeenCalledWith(sampleData[0]);
  });

  it("makes interactive rows keyboard activatable and exposes selection", async () => {
    const onRowClick = vi.fn();
    render(<Table columns={columns} data={sampleData} rowKey={rowKey} onRowClick={onRowClick} selectedKey="a" />);
    const row = screen.getByText("Alpha").closest("tr")!;
    expect(row).toHaveAttribute("tabindex", "0");
    expect(row).toHaveAttribute("aria-current", "true");
    expect(screen.getByText("Beta").closest("tr")).toHaveAttribute("tabindex", "-1");
    row.focus();
    await userEvent.keyboard("{Enter} ");
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it("uses one roving row tab stop and moves it with arrow keys", async () => {
    const twelve = Array.from({ length: 12 }, (_, index) => ({ id: String(index), name: `Row ${index}`, count: index }));
    render(<Table columns={columns} data={twelve} rowKey={rowKey} onRowClick={() => {}} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.filter((row) => row.getAttribute("tabindex") === "0")).toHaveLength(1);
    rows[0].focus();
    await userEvent.keyboard("{ArrowDown}{End}{ArrowUp}{Home}");
    // The component moves focus inside requestAnimationFrame, so the frame may
    // not have run when the keyboard promise settles. Asserting straight away
    // passes on an idle machine and fails on a loaded one.
    await waitFor(() => expect(rows[0]).toHaveFocus());
    expect(rows.filter((row) => row.getAttribute("tabindex") === "0")).toEqual([rows[0]]);
  });

  // Measured on a consumer that binds Home/End/arrows at document level: with
  // focus in a table row, End moved the roving row AND jumped that page's
  // separate timeline selection to its last event, because the row only called
  // preventDefault. EventLanes already consumes its keys for this exact reason.
  it("consumes the keys it handles so a page-level handler does not move a second selection", async () => {
    const pageLevel = vi.fn();
    const twelve = Array.from({ length: 12 }, (_, index) => ({ id: String(index), name: `Row ${index}`, count: index }));
    render(
      <div onKeyDown={pageLevel}>
        <Table columns={columns} data={twelve} rowKey={rowKey} onRowClick={() => {}} />
      </div>,
    );
    const rows = screen.getAllByRole("row").slice(1);
    rows[0].focus();
    await userEvent.keyboard("{ArrowDown}{End}{Home}{ArrowUp}");
    expect(pageLevel).not.toHaveBeenCalled();

    // Enter/Space activate the row and are consumed too.
    await userEvent.keyboard("{Enter}");
    expect(pageLevel).not.toHaveBeenCalled();

    // An unhandled key still reaches the page.
    await userEvent.keyboard("{Escape}");
    expect(pageLevel).toHaveBeenCalledTimes(1);
  });

  it("honors a fixed sort direction", async () => {
    const onSort = vi.fn();
    const sortable: TableColumn<Row>[] = [{ ...columns[0], sortable: true, sortDirection: "asc" }];
    render(<Table columns={sortable} data={sampleData} rowKey={rowKey} onSort={onSort} sort={{ columnId: "name", direction: "asc" }} />);
    await userEvent.click(screen.getByRole("columnheader", { name: /Name/ }));
    await userEvent.click(screen.getByRole("columnheader", { name: /Name/ }));
    expect(onSort).toHaveBeenNthCalledWith(1, "name", "asc");
    expect(onSort).toHaveBeenNthCalledWith(2, "name", "asc");
  });

  it("supports controlled filter and page", async () => {
    const onFilterChange = vi.fn();
    const onPageChange = vi.fn();
    const searchable = columns.map((column) => ({ ...column, searchValue: (row: Row) => String(row[column.id as keyof Row]) }));
    const many = [...sampleData, { id: "c", name: "Gamma", count: 3 }];
    render(<Table columns={searchable} data={many} rowKey={rowKey} filterable filter="Alpha" onFilterChange={onFilterChange} pageSize={1} page={0} onPageChange={onPageChange} />);
    await userEvent.clear(screen.getByRole("textbox", { name: "Filter rows" }));
    expect(onFilterChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("combobox", { name: "Filter column" })).toBeInTheDocument();
  });
});

describe("Table — loading state", () => {
  it("renders skeleton rows instead of data when loading=true", () => {
    render(
      <Table columns={columns} data={sampleData} rowKey={rowKey} loading />,
    );
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("table-loading-row")).toHaveLength(8);
  });

  it("each skeleton row has one cell per column", () => {
    render(<Table columns={columns} data={[]} rowKey={rowKey} loading />);
    const firstRow = screen.getAllByTestId("table-loading-row")[0];
    expect(firstRow.querySelectorAll("td")).toHaveLength(columns.length);
  });

  it("loading wins over error", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        rowKey={rowKey}
        loading
        error="boom"
      />,
    );
    expect(screen.queryByTestId("table-error")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("table-loading-row").length).toBeGreaterThan(0);
  });
});

describe("Table — error state", () => {
  it("renders error block with default message when error is set", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        rowKey={rowKey}
        error={new Error("network failed")}
      />,
    );
    expect(screen.getByTestId("table-error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("network failed")).toBeInTheDocument();
  });

  it("accepts a string error and shows it as the secondary message", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        rowKey={rowKey}
        error="connection refused"
      />,
    );
    expect(screen.getByText("connection refused")).toBeInTheDocument();
  });

  it("custom errorMessage overrides the default primary text", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        rowKey={rowKey}
        error="x"
        errorMessage="Couldn't load results"
      />,
    );
    expect(screen.getByText("Couldn't load results")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("renders a Retry button when onRetry is provided", async () => {
    const onRetry = vi.fn();
    render(
      <Table
        columns={columns}
        data={[]}
        rowKey={rowKey}
        error="x"
        onRetry={onRetry}
      />,
    );
    const btn = screen.getByRole("button", { name: "Retry" });
    await userEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("no Retry button when onRetry is not provided", () => {
    render(<Table columns={columns} data={[]} rowKey={rowKey} error="x" />);
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("error wins over empty", () => {
    render(
      <Table columns={columns} data={[]} rowKey={rowKey} error="x" />,
    );
    expect(screen.queryByTestId("table-empty")).not.toBeInTheDocument();
    expect(screen.getByTestId("table-error")).toBeInTheDocument();
  });
});

describe("Table — empty state", () => {
  it("renders empty block with default message when data is empty", () => {
    render(<Table columns={columns} data={[]} rowKey={rowKey} />);
    expect(screen.getByTestId("table-empty")).toBeInTheDocument();
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("emptyMessage overrides the default text", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        rowKey={rowKey}
        emptyMessage="Nothing here yet"
      />,
    );
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.queryByText("No results.")).not.toBeInTheDocument();
  });

  it("emptyHint renders as secondary text", () => {
    render(
      <Table
        columns={columns}
        data={[]}
        rowKey={rowKey}
        emptyHint="Try a different search term"
      />,
    );
    expect(screen.getByText("Try a different search term")).toBeInTheDocument();
  });

  it("emptyAction renders a CTA button and fires the handler", async () => {
    const onClick = vi.fn();
    render(
      <Table
        columns={columns}
        data={[]}
        rowKey={rowKey}
        emptyAction={{ label: "Add the first one", onClick }}
      />,
    );
    const btn = screen.getByRole("button", { name: "Add the first one" });
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("empty does not render when data has rows", () => {
    render(<Table columns={columns} data={sampleData} rowKey={rowKey} />);
    expect(screen.queryByTestId("table-empty")).not.toBeInTheDocument();
  });
});

describe("Table — pagination behavior in state modes", () => {
  it("does not render pagination during loading even if pageSize is set", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      name: `Row ${i}`,
      count: i,
    }));
    render(
      <Table
        columns={columns}
        data={many}
        rowKey={rowKey}
        pageSize={10}
        loading
      />,
    );
    expect(screen.queryByText(/Page 1 of/)).not.toBeInTheDocument();
  });
});
