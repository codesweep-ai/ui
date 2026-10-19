import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

// `.visually-hidden` keeps text for a screen reader and takes it out of sight,
// and both halves are asserted on the rendered page. The usual way to get it
// wrong, `display: none` or `visibility: hidden`, passes a test that only
// measures the box, because it removes the text from the accessibility tree
// as well.
describe(".visually-hidden", () => {
  it("still names a control for a screen reader", () => {
    render(
      <button type="button">
        <span aria-hidden="true">×</span>
        <span className="visually-hidden">Close</span>
      </button>,
    );

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });

  it("takes no more than a pixel of the page", () => {
    render(
      <p>
        Before <span className="visually-hidden">a label only a screen reader announces</span> after
      </p>,
    );
    const box = screen.getByText("a label only a screen reader announces").getBoundingClientRect();

    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
  });
});
