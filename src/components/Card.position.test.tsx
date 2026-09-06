import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { Card } from "./Card";

// Browser mode, because this is a cascade fact. jsdom applies no stylesheet to
// a computed style, so the assertion below would read "static" whether or not
// the rule existed.
describe("Card containing block", () => {
  it("establishes one for absolutely positioned content", () => {
    const { container } = render(<Card>content</Card>);
    const root = container.querySelector('[data-component="Card"]')!;

    expect(getComputedStyle(root).position).toBe("relative");
  });
});
