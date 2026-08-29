import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "../styles/tokens.css";
import "../styles/base.css";
import { AppShell, Header, Footer } from "./AppShell";

// Browser project: real layout. The shell is the viewport; main scrolls; the
// footer stays at the bottom edge however tall the content is.
describe("AppShell layout", () => {
  it("makes main the scroller and keeps the footer at the viewport bottom", () => {
    render(
      <AppShell>
        <Header title="App" />
        <main data-testid="main">
          <div style={{ height: "5000px" }}>tall content</div>
        </main>
        <Footer>prov</Footer>
      </AppShell>,
    );
    const shell = screen.getByText("tall content").closest('[data-component="AppShell"]')!;
    const main = screen.getByTestId("main");
    expect(getComputedStyle(shell).overflow).toBe("hidden");
    expect(getComputedStyle(main).overflowY).toBe("auto");
    expect(main.scrollHeight).toBeGreaterThan(main.clientHeight);
    const footer = screen.getByText("prov").closest("footer")!;
    expect(Math.round(footer.getBoundingClientRect().bottom)).toBe(window.innerHeight);
    expect(document.documentElement.scrollHeight).toBeLessThanOrEqual(window.innerHeight + 1);
    expect(getComputedStyle(document.documentElement).overflowY).not.toBe("scroll");
  });
});
