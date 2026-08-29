import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentStatus } from "./AgentStatus";

describe("AgentStatus", () => {
  it("renders text content", () => {
    render(<AgentStatus state="in-flight">Reading files…</AgentStatus>);
    expect(screen.getByText("Reading files…")).toBeInTheDocument();
  });

  it("in-flight state renders a PulseBadge", () => {
    render(<AgentStatus state="in-flight">Doing work</AgentStatus>);
    expect(screen.getByLabelText("Working")).toBeInTheDocument();
  });

  it("paused state does NOT render a PulseBadge", () => {
    render(<AgentStatus state="paused">Awaiting input</AgentStatus>);
    expect(screen.queryByLabelText("Working")).not.toBeInTheDocument();
  });

  it("settled state does NOT render a PulseBadge", () => {
    render(<AgentStatus state="settled">Done</AgentStatus>);
    expect(screen.queryByLabelText("Working")).not.toBeInTheDocument();
  });

  it("error state does NOT render a PulseBadge", () => {
    render(<AgentStatus state="error">Failed to fetch</AgentStatus>);
    expect(screen.queryByLabelText("Working")).not.toBeInTheDocument();
  });

  it("custom icon overrides default for non-in-flight states", () => {
    render(
      <AgentStatus state="settled" icon={<span data-testid="custom-icon">★</span>}>
        Done
      </AgentStatus>,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("custom icon is ignored for in-flight (PulseBadge always shown)", () => {
    render(
      <AgentStatus state="in-flight" icon={<span data-testid="custom-icon">★</span>}>
        Going
      </AgentStatus>,
    );
    expect(screen.queryByTestId("custom-icon")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Working")).toBeInTheDocument();
  });

  it("data-state attribute reflects state", () => {
    const { container } = render(<AgentStatus state="paused">x</AgentStatus>);
    expect(container.querySelector('[data-component="AgentStatus"]')!.getAttribute("data-state")).toBe(
      "paused",
    );
  });

  it("aria-live=polite for assistive tech announcements", () => {
    const { container } = render(<AgentStatus state="in-flight">x</AgentStatus>);
    expect(container.querySelector('[data-component="AgentStatus"]')!.getAttribute("aria-live")).toBe(
      "polite",
    );
  });

  it("merges className", () => {
    const { container } = render(
      <AgentStatus state="in-flight" className="custom-z">
        x
      </AgentStatus>,
    );
    expect(container.querySelector('[data-component="AgentStatus"]')!.className).toContain(
      "custom-z",
    );
  });
});
