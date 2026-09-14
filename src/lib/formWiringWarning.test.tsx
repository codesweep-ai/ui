import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";

import { FormGroup } from "../components/FormGroup";
import { Input } from "../components/Input";
import { CheckboxGroup } from "../components/CheckboxGroup";

/**
 * A module instance nothing has warned through yet. The check warns once per
 * kind of mistake, which is right on a page of twenty broken fields and wrong
 * in a test file, where the second test would then assert on silence it did
 * not earn.
 */
async function freshCheck() {
  vi.resetModules();
  const { warnWhenFieldUnwired } = await import("./formWiringWarning");
  return warnWhenFieldUnwired;
}

/**
 * The DOM a real FormGroup produced, not one written here to match. A fixture
 * built by hand agrees with itself and drifts from the component.
 */
function rendered(ui: React.ReactElement) {
  const { container } = render(ui);
  const root = container.querySelector<HTMLElement>('[data-component="FormGroup"]');
  if (!root) throw new Error("no FormGroup root rendered");
  // Spy after the render, so the component's own ref-time warning is not the
  // call under test.
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  return { root, warn };
}

afterEach(() => vi.restoreAllMocks());

describe("warnWhenFieldUnwired", () => {
  it("says so when a second child drops the aria-describedby wiring", async () => {
    const { root, warn } = rendered(
      <FormGroup label="Email" htmlFor="email" helper="We never share it">
        <input id="email" />
        <span>extra</span>
      </FormGroup>,
    );

    (await freshCheck())(root);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/helper text that no control refers to/);
  });

  it("says so when an error message is announced to nobody", async () => {
    const { root, warn } = rendered(
      <FormGroup label="Email" htmlFor="email" error="Required">
        <input id="email" />
        <span>extra</span>
      </FormGroup>,
    );

    (await freshCheck())(root);

    expect(warn.mock.calls[0][0]).toMatch(/an error that no control refers to/);
  });

  it("says so when a label sits beside one control with no htmlFor", async () => {
    const { root, warn } = rendered(
      <FormGroup label="Email">
        <Input placeholder="email" />
      </FormGroup>,
    );

    (await freshCheck())(root);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/label with no `htmlFor` beside a single control/);
  });

  it("stays quiet on a field that is wired correctly", async () => {
    const { root, warn } = rendered(
      <FormGroup label="Email" htmlFor="email" helper="We never share it">
        <input id="email" />
      </FormGroup>,
    );

    (await freshCheck())(root);

    expect(warn).not.toHaveBeenCalled();
  });

  it("stays quiet around a composite control, where one label names the group", async () => {
    // CheckboxGroup is the case FormGroup's own documentation allows htmlFor to
    // be omitted for: several controls, and no single one for a label to name.
    const { root, warn } = rendered(
      <FormGroup label="Regions">
        <CheckboxGroup
          options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]}
          selected={new Set<string>()}
          onChange={() => {}}
        />
      </FormGroup>,
    );

    (await freshCheck())(root);

    expect(warn).not.toHaveBeenCalled();
  });

  it("ignores a node that is not a FormGroup, and a node that is not an element", async () => {
    const check = await freshCheck();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bare = document.createElement("div");
    bare.innerHTML = '<label>Email</label><input id="x">';

    check(bare);
    check(null);

    expect(warn).not.toHaveBeenCalled();
  });
});
