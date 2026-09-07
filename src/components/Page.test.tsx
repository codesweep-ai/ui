import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Page } from "./Page";

describe("Page", () => {
  it("renders a main landmark by default, which AppShell leaves to the page", () => {
    render(<Page>content</Page>);

    expect(screen.getByRole("main")).toHaveAttribute("data-component", "Page");
  });

  it("renders the element `as` names instead, for a page that is not the landmark", () => {
    render(<Page as="section">content</Page>);

    expect(screen.queryByRole("main")).toBeNull();
    expect(document.querySelector('[data-component="Page"]')?.tagName).toBe("SECTION");
  });

  it("puts the children in the content element rather than on the root", () => {
    render(<Page>content</Page>);
    const content = document.querySelector('[data-part="content"]');

    expect(content).not.toBeNull();
    expect(content).toHaveTextContent("content");
  });

  it("forwards its ref to the root", () => {
    const ref = createRef<HTMLElement>();
    render(<Page ref={ref}>content</Page>);

    expect(ref.current).toBe(screen.getByRole("main"));
  });

  it("makes the scroller focusable, so a keyboard can reach what it holds", () => {
    render(<Page>content</Page>);

    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "0");
  });

  it("leaves a page that does not scroll out of the tab order", () => {
    render(<Page scroll={false}>content</Page>);

    expect(screen.getByRole("main")).not.toHaveAttribute("tabindex");
  });

  it("keeps the consumer's own tabIndex", () => {
    render(
      <Page tabIndex={-1}>content</Page>,
    );

    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });

  it("keeps the consumer's className alongside its own", () => {
    render(<Page className="mine">content</Page>);

    expect(screen.getByRole("main")).toHaveClass("mine");
    expect(screen.getByRole("main").className).toContain("cs-component-page-1");
  });
});
