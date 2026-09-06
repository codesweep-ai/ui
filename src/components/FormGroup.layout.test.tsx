import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FormGroup } from "./FormGroup";
import { Input } from "./Input";

// Browser mode, because this is a layout guarantee. jsdom computes no layout,
// so every getBoundingClientRect below reads 0 and the assertion would hold
// just as well against a group that shoves the rest of the form down the page.
function TwoFields({ error }: { error?: string }) {
  return (
    <div>
      <FormGroup label="Email" htmlFor="email" error={error}>
        <Input id="email" />
      </FormGroup>
      <FormGroup label="Notes" htmlFor="notes">
        <Input id="notes" />
      </FormGroup>
    </div>
  );
}

describe("FormGroup message slot", () => {
  it("does not move the field below it when a message appears", () => {
    const { container, rerender } = render(<TwoFields />);
    const topOfNotes = () =>
      container.querySelector("#notes")!.getBoundingClientRect().top;

    const before = topOfNotes();
    rerender(<TwoFields error="Enter a valid email." />);

    expect(container.querySelector('[role="alert"]')!.textContent).toBe(
      "Enter a valid email.",
    );
    expect(topOfNotes()).toBe(before);
  });
});
