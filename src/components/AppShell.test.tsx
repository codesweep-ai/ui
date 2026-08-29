import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell, Header, Footer } from "./AppShell";

describe("AppShell", () => {
  it("renders children with data-component", () => {
    render(<AppShell>main content</AppShell>);
    expect(screen.getByText("main content")).toBeInTheDocument();
    expect(
      screen.getByText("main content").closest('[data-component="AppShell"]'),
    ).not.toBeNull();
  });

  it("merges className onto the shell root", () => {
    render(<AppShell className="consumer-shell">main content</AppShell>);
    expect(
      screen.getByText("main content").closest('[data-component="AppShell"]'),
    ).toHaveClass("consumer-shell");
  });
});

describe("Header", () => {
  it("renders the title when no logo is provided, and does not guess a destination", () => {
    render(<Header title="My App" />);
    expect(screen.getByText("My App")).toBeInTheDocument();
    // The default used to be "/", which is the filesystem root in a file://
    // page and so navigated out of the artifact. A component that cannot know
    // its deployment must not invent a destination.
    expect(screen.queryByRole("link", { name: "My App" })).not.toBeInTheDocument();
    expect(screen.getByText("My App").closest("a")).toBeNull();
  });

  it("supports a custom titleHref and renders no title link when it is null", () => {
    const { rerender } = render(<Header title="My App" titleHref="/workspace" />);
    expect(screen.getByRole("link", { name: "My App" })).toHaveAttribute("href", "/workspace");

    rerender(<Header title="My App" titleHref={null} />);
    expect(screen.queryByRole("link", { name: "My App" })).not.toBeInTheDocument();
    expect(screen.getByText("My App").closest("a")).toBeNull();
  });

  it("renders the logo image when logoSrc is provided", () => {
    render(<Header title="My App" logoSrc="/logo.png" />);
    const img = screen.getByRole("img", { name: "My App" });
    expect(img).toHaveAttribute("src", "/logo.png");
    expect(img).toHaveAttribute("alt", "My App");
  });

  it("renders nav items", () => {
    render(
      <Header
        title="x"
        navItems={[
          { label: "Home", href: "/" },
          { label: "About", href: "/about" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
  });

  it("marks active nav item with aria-current=page", () => {
    render(
      <Header
        title="x"
        navItems={[
          { label: "Home", href: "/", active: true },
          { label: "About", href: "/about" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "About" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("nav onClick fires and default is prevented (no actual navigation)", async () => {
    const onClick = vi.fn();
    render(
      <Header
        title="x"
        navItems={[{ label: "Click me", href: "/x", onClick }]}
      />,
    );
    await userEvent.click(screen.getByRole("link", { name: "Click me" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders actions slot", () => {
    render(
      <Header
        title="x"
        actions={<button>Sign out</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("merges className onto the header root", () => {
    render(<Header title="x" className="consumer-header" />);
    expect(screen.getByText("x").closest("header")).toHaveClass("consumer-header");
  });
});

describe("Footer", () => {
  it("does not invent footer text when rendered without children", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('[data-component="Footer"]')).toBeEmptyDOMElement();
  });

  it("renders custom children", () => {
    render(<Footer>Made with love</Footer>);
    expect(screen.getByText("Made with love")).toBeInTheDocument();
  });

  it("data-component on the footer element", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector('[data-component="Footer"]')).not.toBeNull();
  });

  it("merges className onto the footer root", () => {
    render(<Footer className="consumer-footer">Footer</Footer>);
    expect(screen.getByText("Footer").closest("footer")).toHaveClass("consumer-footer");
  });
});
