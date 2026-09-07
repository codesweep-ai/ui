import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Table } from "./Table";

// Browser mode: jsdom applies no stylesheet to a computed style, so the
// background assertion would read "rgba(0, 0, 0, 0)" whether or not the rule
// existed. The hover rule is asserted by its reach rather than by its paint,
// because a real :hover needs a real cursor that a headless browser will not
// give a test.
const columns = [
  { id: "name", header: "Name", sortable: true, cell: (row: { name: string }) => row.name },
];
const data = [{ name: "one" }, { name: "two" }];

describe("Table surface", () => {
  it("paints the card background its border and radius imply", () => {
    const { container } = render(
      <Table columns={columns} data={data} rowKey={(row) => row.name} />,
    );
    const wrapper = container.querySelector('[data-component="Table"]') as HTMLElement;

    const probe = document.createElement("div");
    probe.style.backgroundColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--card")
      .trim();
    document.body.appendChild(probe);
    const card = getComputedStyle(probe).backgroundColor;
    probe.remove();

    expect(getComputedStyle(wrapper).backgroundColor).toBe(card);
  });

  it("answers a pointer on a sortable header", () => {
    render(<Table columns={columns} data={data} rowKey={(row) => row.name} />);

    let rule: CSSStyleRule | undefined;
    for (const sheet of document.styleSheets) {
      for (const candidate of sheet.cssRules) {
        const selector = (candidate as CSSStyleRule).selectorText;
        if (selector?.includes("cs-component-table-38") && selector.includes(":hover")) {
          rule = candidate as CSSStyleRule;
        }
      }
    }

    expect(rule, "no hover rule reaches a sortable header").toBeDefined();
    expect(rule!.style.color).toBe("var(--color-accent)");
  });
});
