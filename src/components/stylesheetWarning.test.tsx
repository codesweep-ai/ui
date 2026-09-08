import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

import { Button } from "./Button";
import { Chip } from "./Chip";
import { Tooltip } from "./Tooltip";

// Browser mode, because the check reads a custom property off a computed
// style and jsdom computes none: every assertion below would report a missing
// stylesheet whether or not one was loaded.
function markerRule(component: string) {
  for (const sheet of document.styleSheets) {
    const rules = [...sheet.cssRules];
    for (let index = 0; index < rules.length; index += 1) {
      const selector = (rules[index] as CSSStyleRule).selectorText ?? "";
      if (selector.replace(/\s/g, "") === `[data-component="${component}"]`) {
        return { sheet, index, text: rules[index].cssText };
      }
    }
  }
  throw new Error(`no marker rule for ${component}`);
}

describe("the missing stylesheet warning", () => {
  it("says nothing when the component's sheet is loaded", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Button>Save</Button>);

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  // Deleting the marker rule is the same state a consumer reaches by importing
  // the tokens and the base sheet and no component sheets.
  it("names the component and its sheet when the marker is gone", () => {
    const { sheet, index, text } = markerRule("Chip");
    sheet.deleteRule(index);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      render(<Chip>filter</Chip>);

      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls[0][0]);
      expect(message).toContain("Chip rendered with no stylesheet");
      expect(message).toContain("styles/components/chip.css");
    } finally {
      sheet.insertRule(text, index);
      warn.mockRestore();
    }
  });

  // Tooltip is the one component whose root never reaches a ref-forwarding
  // helper: it spends its own ref on the trigger and renders the bubble
  // through a portal. Until 0.3.0 a missing tooltip.css was therefore the one
  // missing sheet that said nothing, and five components compose it.
  it("names Tooltip once the bubble opens, which is the only node it has", async () => {
    const { sheet, index, text } = markerRule("Tooltip");
    sheet.deleteRule(index);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      render(
        <Tooltip content="Cycle the theme">
          <button type="button">Theme</button>
        </Tooltip>,
      );
      screen.getByRole("button", { name: "Theme" }).focus();
      await waitFor(() => expect(document.querySelector(".cs-tooltip")).not.toBeNull());

      const messages = warn.mock.calls.map((call) => String(call[0]));
      expect(messages.some((m) => m.includes("Tooltip rendered with no stylesheet"))).toBe(true);
      expect(messages.some((m) => m.includes("styles/components/tooltip.css"))).toBe(true);
    } finally {
      sheet.insertRule(text, index);
      warn.mockRestore();
    }
  });
});
