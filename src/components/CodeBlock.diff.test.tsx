import { render, waitFor } from "@testing-library/react";
import diff from "highlight.js/lib/languages/diff";
import { afterEach, describe, expect, it } from "vitest";

import "../styles/syntax.css";
import { CodeBlock } from "./CodeBlock";

// Browser mode, because the question is which colour a line resolves to, and
// jsdom applies no stylesheet.

/** The colour a custom property resolves to, in the form getComputedStyle reports. */
function resolved(token: string) {
  const probe = document.createElement("span");
  probe.style.color = `var(${token})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe.each(["dark", "light"])("a diff in the %s theme", (theme) => {
  it("colours an added line as a success and a removed line as an error", async () => {
    document.documentElement.dataset.theme = theme;
    const { container } = render(
      <CodeBlock code={"-removed\n+added"} language="diff" languages={{ diff }} />,
    );
    await waitFor(() => expect(container.querySelector(".hljs-deletion")).not.toBeNull());

    const added = getComputedStyle(container.querySelector(".hljs-addition")!).color;
    const removed = getComputedStyle(container.querySelector(".hljs-deletion")!).color;

    expect(added).toBe(resolved("--color-success"));
    expect(removed).toBe(resolved("--color-error-text"));
    // An added line used to take the keyword colour, and a removed line the
    // plain text colour, so the pair differed only by its leading sign.
    expect(added).not.toBe(resolved("--syntax-keyword"));
    expect(removed).not.toBe(resolved("--fg"));
  });
});
