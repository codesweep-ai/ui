import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "../styles/tokens.css";
import "../styles/base.css";
import { Header } from "./AppShell";

describe("Header navigation behavior", () => {
  it("lets an href-only item perform native navigation", async () => {
    window.history.replaceState({}, "", "#ui-05-start");
    render(<Header title="App" navItems={[{ label: "Docs", href: "#ui-05-docs" }]} />);

    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("data-header-nav-link", "#ui-05-docs");

    await userEvent.click(screen.getByRole("link", { name: "Docs" }));

    expect(window.location.hash).toBe("#ui-05-docs");
  });

  it("prevents native navigation when an onClick handler owns it", async () => {
    const onClick = vi.fn();
    window.history.replaceState({}, "", "#ui-05-start");
    render(
      <Header
        title="App"
        navItems={[{ label: "Handled", href: "#ui-05-handled", onClick }]}
      />,
    );

    await userEvent.click(screen.getByRole("link", { name: "Handled" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe("#ui-05-start");
  });
});

// Runs in the browser project: the assertions read real computed styles.
describe("Header nav selected-state indicator", () => {
  const items = [
    { label: "Components", href: "#c", active: true },
    { label: "Tokens", href: "#t", active: false },
  ];

  it("gives the selected item the accent tint and accent text", () => {
    render(<Header title="App" navItems={items} />);
    const selected = screen.getByRole("link", { name: "Components" });
    const idle = screen.getByRole("link", { name: "Tokens" });
    expect(selected).toHaveAttribute("aria-current", "page");
    const probe = document.createElement("span");
    probe.style.color = "var(--color-header-text)";
    document.body.appendChild(probe);
    expect(getComputedStyle(selected).color).toBe(getComputedStyle(probe).color);
    probe.remove();
    expect(getComputedStyle(selected).backgroundColor).not.toBe(getComputedStyle(idle).backgroundColor);
    expect(getComputedStyle(selected).backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
  });

  it("keeps a hovered idle item visually distinct from the selected one", async () => {
    render(<Header title="App" navItems={items} />);
    const idle = screen.getByRole("link", { name: "Tokens" });
    const selected = screen.getByRole("link", { name: "Components" });
    await userEvent.hover(idle);
    expect(getComputedStyle(idle).backgroundColor).not.toBe(getComputedStyle(selected).backgroundColor);
  });
});

describe("Header title", () => {
  it("renders the text title in the accent colour", () => {
    render(<Header title="cs-tool" />);
    const title = screen.getByText("cs-tool");
    const probe = document.createElement("span");
    probe.style.color = "var(--color-accent)";
    document.body.appendChild(probe);
    expect(getComputedStyle(title).color).toBe(getComputedStyle(probe).color);
    probe.remove();
  });
});
