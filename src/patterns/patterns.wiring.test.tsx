import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DataTableDemo } from "../../preview/src/pages/patterns/DataTableDemo";
import { FormDemo } from "../../preview/src/pages/patterns/FormDemo";
import { MasterDetailDemo } from "../../preview/src/pages/patterns/MasterDetailDemo";

// The real demos, not a restatement of them. A test that rebuilt the
// composition inline could pass while the demo that `patterns/*.md` documents,
// and that the screenshot gate photographs, was broken.
//
// jsdom, because nothing here is a layout question. What crosses a component
// boundary in a pattern is state and ARIA, and both are visible without layout.
// The geometry half runs against the real page in scripts/visual-baseline.mjs,
// for reasons written down there.

describe("Form pattern", () => {
  it("reaches the error states its specification documents", async () => {
    render(<FormDemo />);

    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    // FormGroup forwards `required` to the input, so a form without
    // `noValidate` never fires submit and none of this can happen. It rendered
    // nothing at all before CUI-020.
    const alerts = await screen.findAllByRole("alert");
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.map((a) => a.textContent)).toContain("Enter a valid email.");
  });

  it("says nothing before the form is submitted", () => {
    render(<FormDemo />);
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
  });
});

describe("Master-Detail pattern", () => {
  it("moves the detail pane when a row is chosen", async () => {
    const { container } = render(<MasterDetailDemo />);

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(2);
    const target = rows[2] as HTMLElement;
    // The first cell, not the row: a row's textContent runs its cells together.
    const name = target.querySelector("td")?.textContent?.trim() ?? "";
    expect(name).not.toBe("");

    await userEvent.click(target);

    // The wire between two components: exactly one row in this table is
    // current, and a different region now names it. Neither component's own
    // tests can see that. Scoped to the table clicked, because the pattern
    // renders several and each keeps its own selection.
    const table = target.closest("table")!;
    expect(table.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
    // Some card on the page now names the row. Not the first one: the pattern
    // renders several sections, each with its own heading.
    const headers = [...container.querySelectorAll("[data-card-header]")].map((h) => h.textContent ?? "");
    expect(headers.some((h) => h.includes(name))).toBe(true);
  });
});

describe("Data Table pattern", () => {
  it("sorts on a column header and says so through aria-sort", async () => {
    const { container } = render(<DataTableDemo />);

    const header = screen.getAllByRole("columnheader").find((h) => /downloads/i.test(h.textContent ?? ""));
    expect(header).toBeDefined();
    expect(header).toHaveAttribute("aria-sort", "none");

    const first = () => container.querySelector("tbody tr")?.textContent ?? "";
    const before = first();
    // The header is the control: `tabIndex={0}` with an Enter and Space
    // handler, which is how a sortable columnheader is meant to work. There is
    // no button inside it to find.
    await userEvent.click(header!);

    expect(header).not.toHaveAttribute("aria-sort", "none");
    expect(first()).not.toBe(before);
  });

  it("narrows the rows when the filter is typed into", async () => {
    const { container } = render(<DataTableDemo />);
    const rowsBefore = container.querySelectorAll("tbody tr").length;

    const filter = container.querySelector("input");
    expect(filter).not.toBeNull();
    await userEvent.type(filter!, "react");

    // The demo debounces, so this waits rather than asserting immediately.
    await expect
      .poll(() => container.querySelectorAll("tbody tr").length, { timeout: 2000 })
      .toBeLessThan(rowsBefore);
  });
});
