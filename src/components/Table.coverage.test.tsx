import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Table, type TableColumn } from "./Table";

interface Row {
  id: string;
  name: string;
  count: number;
}

const cols: TableColumn<Row>[] = [
  {
    id: "name",
    header: "Name",
    cell: (r) => r.name,
    sortable: true,
    searchValue: (r) => r.name,
  },
  {
    id: "count",
    header: "Count",
    cell: (r) => r.count,
    sortable: true,
    align: "right",
    searchValue: (r) => String(r.count),
  },
];

const data: Row[] = [
  { id: "a", name: "Alpha", count: 1 },
  { id: "b", name: "Beta", count: 2 },
  { id: "c", name: "Gamma", count: 3 },
];

const rowKey = (r: Row) => r.id;

describe("Table — sort behavior", () => {
  it("clicking a sortable header fires onSort with asc (first click)", async () => {
    const onSort = vi.fn();
    render(<Table columns={cols} data={data} rowKey={rowKey} onSort={onSort} />);
    await userEvent.click(screen.getByText("Name"));
    expect(onSort).toHaveBeenCalledWith("name", "asc");
  });

  it("clicking the currently-asc column toggles to desc", async () => {
    const onSort = vi.fn();
    render(
      <Table
        columns={cols}
        data={data}
        rowKey={rowKey}
        onSort={onSort}
        sort={{ columnId: "name", direction: "asc" }}
      />,
    );
    await userEvent.click(screen.getByText("Name"));
    expect(onSort).toHaveBeenCalledWith("name", "desc");
  });

  it("clicking a different sortable column starts at asc", async () => {
    const onSort = vi.fn();
    render(
      <Table
        columns={cols}
        data={data}
        rowKey={rowKey}
        onSort={onSort}
        sort={{ columnId: "name", direction: "desc" }}
      />,
    );
    await userEvent.click(screen.getByText("Count"));
    expect(onSort).toHaveBeenCalledWith("count", "asc");
  });

  it("Enter key on a sortable header fires onSort", async () => {
    const onSort = vi.fn();
    render(<Table columns={cols} data={data} rowKey={rowKey} onSort={onSort} />);
    const header = screen.getByText("Name").closest("th")!;
    header.focus();
    await userEvent.keyboard("{Enter}");
    expect(onSort).toHaveBeenCalledWith("name", "asc");
  });

  it("Space key on a sortable header fires onSort", async () => {
    const onSort = vi.fn();
    render(<Table columns={cols} data={data} rowKey={rowKey} onSort={onSort} />);
    const header = screen.getByText("Name").closest("th")!;
    header.focus();
    await userEvent.keyboard(" ");
    expect(onSort).toHaveBeenCalledWith("name", "asc");
  });

  it("non-sortable columns don't fire onSort on click", async () => {
    const onSort = vi.fn();
    const noSortCols: TableColumn<Row>[] = [
      { id: "name", header: "Name", cell: (r) => r.name },
    ];
    render(<Table columns={noSortCols} data={data} rowKey={rowKey} onSort={onSort} />);
    await userEvent.click(screen.getByText("Name"));
    expect(onSort).not.toHaveBeenCalled();
  });

  it("sort indicator aria-sort reflects current direction", () => {
    render(
      <Table
        columns={cols}
        data={data}
        rowKey={rowKey}
        onSort={() => {}}
        sort={{ columnId: "name", direction: "asc" }}
      />,
    );
    expect(screen.getByText("Name").closest("th")).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(screen.getByText("Count").closest("th")).toHaveAttribute(
      "aria-sort",
      "none",
    );
  });
});

describe("Table — filter behavior", () => {
  it("filterable=true + searchValue columns shows a filter bar", () => {
    render(<Table columns={cols} data={data} rowKey={rowKey} filterable />);
    expect(screen.getByPlaceholderText("Filter...")).toBeInTheDocument();
  });

  it("typing in the filter narrows visible rows (debounce)", async () => {
    render(<Table columns={cols} data={data} rowKey={rowKey} filterable />);
    const input = screen.getByPlaceholderText("Filter...");
    await userEvent.type(input, "alp");
    // 200ms debounce in Table + similar in SearchInput — waitFor handles it
    await waitFor(() => {
      expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Gamma")).not.toBeInTheDocument();
  });

  it("filter with no match renders the Empty state", async () => {
    render(<Table columns={cols} data={data} rowKey={rowKey} filterable />);
    await userEvent.type(screen.getByPlaceholderText("Filter..."), "zzzz");
    await waitFor(() => {
      expect(screen.getByTestId("table-empty")).toBeInTheDocument();
    });
  });

  it("deleting the filter back to empty restores every row", async () => {
    render(<Table columns={cols} data={data} rowKey={rowKey} filterable />);
    const input = screen.getByPlaceholderText("Filter...");
    await userEvent.type(input, "alp");
    await waitFor(() => expect(screen.queryByText("Beta")).not.toBeInTheDocument());
    await userEvent.clear(input);
    await waitFor(() => {
      expect(screen.getByText("Alpha")).toBeInTheDocument();
      expect(screen.getByText("Beta")).toBeInTheDocument();
      expect(screen.getByText("Gamma")).toBeInTheDocument();
    });
  });

  it("custom filterPlaceholder is used", () => {
    render(
      <Table
        columns={cols}
        data={data}
        rowKey={rowKey}
        filterable
        filterPlaceholder="Find rows..."
      />,
    );
    expect(screen.getByPlaceholderText("Find rows...")).toBeInTheDocument();
  });

  it("column scope dropdown appears when ≥2 searchable columns", () => {
    render(<Table columns={cols} data={data} rowKey={rowKey} filterable />);
    // Dropdown's select element
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});

describe("Table — pagination behavior", () => {
  const many: Row[] = Array.from({ length: 25 }, (_, i) => ({
    id: String(i),
    name: `Row ${i}`,
    count: i,
  }));

  it("renders pagination footer when data exceeds pageSize", () => {
    render(<Table columns={cols} data={many} rowKey={rowKey} pageSize={10} />);
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Prev/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/ })).toBeInTheDocument();
  });

  it("Next button advances the page", async () => {
    render(<Table columns={cols} data={many} rowKey={rowKey} pageSize={10} />);
    expect(screen.getByText("Row 0")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.queryByText("Row 0")).not.toBeInTheDocument();
    expect(screen.getByText("Row 10")).toBeInTheDocument();
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
  });

  it("Prev button is disabled on first page", () => {
    render(<Table columns={cols} data={many} rowKey={rowKey} pageSize={10} />);
    expect(screen.getByRole("button", { name: /Prev/ })).toBeDisabled();
  });

  it("Next button is disabled on last page", async () => {
    render(<Table columns={cols} data={many} rowKey={rowKey} pageSize={10} />);
    const next = screen.getByRole("button", { name: /Next/ });
    await userEvent.click(next);
    await userEvent.click(next);
    expect(screen.getByText(/Page 3 of 3/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/ })).toBeDisabled();
  });

  it("row count shows total when no filter", () => {
    render(<Table columns={cols} data={many} rowKey={rowKey} pageSize={10} />);
    expect(screen.getByText("25 rows")).toBeInTheDocument();
  });

  it("does not render pagination when total rows ≤ pageSize", () => {
    render(<Table columns={cols} data={data} rowKey={rowKey} pageSize={10} />);
    expect(screen.queryByText(/Page \d+ of/)).not.toBeInTheDocument();
  });
});

describe("Table — selectedKey highlighting", () => {
  it("selectedKey row gets the accent background style", () => {
    const { container } = render(
      <Table
        columns={cols}
        data={data}
        rowKey={rowKey}
        selectedKey="b"
      />,
    );
    const row = within(container).getByText("Beta").closest("tr")!;
    expect(row.className).toContain("cs-component-table-77");
  });
});
