import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Input } from "./Input";

// A real :hover needs a real cursor, which a headless browser does not give a
// test: the provider pointer and a synthetic event both leave the computed
// border untouched, so asserting on the painted colour would pass whether or
// not the guard existed. This asserts the rule's reach instead. Strip :hover
// from the live selector and ask which wrappers it still matches.
function hoverRuleSelector(): string {
  for (const sheet of document.styleSheets) {
    for (const rule of sheet.cssRules) {
      const selector = (rule as CSSStyleRule).selectorText;
      if (selector?.startsWith(".cs-component-input-25:hover")) return selector;
    }
  }
  throw new Error("no hover rule found for the Input wrapper");
}

describe("Input hover", () => {
  it("does not reach a disabled field", () => {
    const { container } = render(
      <div>
        <Input placeholder="enabled" />
        <Input placeholder="disabled" disabled />
      </div>,
    );
    const [enabled, disabled] = [
      ...container.querySelectorAll('[data-component="Input"]'),
    ] as HTMLElement[];
    const reach = hoverRuleSelector().replace(/:hover/g, "");

    expect(enabled.matches(reach)).toBe(true);
    expect(disabled.matches(reach)).toBe(false);
  });
});
