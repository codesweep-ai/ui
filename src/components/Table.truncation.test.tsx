import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Table, type TableColumn } from "./Table";

// Browser mode, because the truncation tooltip opens only when the cell
// actually overflows, and jsdom reports every width as zero.
//
// Until 0.3.0 the tooltip was handed `cell()` a second time, so a cell
// rendering an element was duplicated into a portal. Tooltip's own
// specification lists interactive content under avoid_when for that reason.

// No spaces and no hyphens: both are break opportunities, and a label that
// wraps does not overflow, so the overflow-only tooltip never opens.
const LONG = `OVERFLOWING${"x".repeat(150)}`;
type Row = { id: string };
const rows: Row[] = [{ id: "r1" }];

function renderTable(column: Partial<TableColumn<Row>>) {
  const host = document.createElement("div");
  host.style.width = "120px";
  document.body.appendChild(host);
  const columns: TableColumn<Row>[] = [
    { id: "c", header: "Status", width: "80px", cell: () => <span data-cell-node="">{LONG}</span>, ...column },
  ];
  render(<Table columns={columns} data={rows} rowKey={(r) => r.id} fixed />, { container: host });
  return host;
}

const openTooltip = async (host: HTMLElement) => {
  fireEvent.mouseEnter(host.querySelector('[data-part="cell"]') as HTMLElement);
  await waitFor(() => expect(document.querySelector(".cs-tooltip")).not.toBeNull());
};

describe("Table's truncation tooltip", () => {
  it("carries text rather than a second copy of the cell", async () => {
    const host = renderTable({});
    await openTooltip(host);

    // One node, in the table. Not a second one inside the bubble.
    expect(document.querySelectorAll("[data-cell-node]")).toHaveLength(1);
    expect(document.querySelector(".cs-tooltip")?.textContent).toContain("OVERFLOWING");
  });

  it("prefers the column's own tooltip accessor", async () => {
    const host = renderTable({ tooltip: () => "Succeeded on the second attempt" });
    await openTooltip(host);

    expect(document.querySelector(".cs-tooltip")?.textContent).toBe("Succeeded on the second attempt");
  });

  it("falls back to searchValue, which is already plain text", async () => {
    const host = renderTable({ searchValue: () => "searchable text" });
    await openTooltip(host);

    expect(document.querySelector(".cs-tooltip")?.textContent).toBe("searchable text");
  });

  it("shows no tooltip when the cell has no text to offer", async () => {
    const host = renderTable({ cell: () => <span data-empty="" /> });
    fireEvent.mouseEnter(host.querySelector('[data-part="cell"]') as HTMLElement);
    await new Promise((r) => setTimeout(r, 120));

    expect(document.querySelector(".cs-tooltip")).toBeNull();
  });
});
