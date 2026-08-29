import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgentTrace, type AgentTraceStep } from "./AgentTrace";

const steps: AgentTraceStep[] = [
  { id: "1", status: "success", label: "Read 142 files", timestamp: "10:01" },
  { id: "2", status: "success", label: "Generated 412 specs", timestamp: "10:03" },
  { id: "3", status: "warning", label: "3 callsites need review", timestamp: "10:04" },
];

describe("AgentTrace — happy path", () => {
  it("renders each step label", () => {
    render(<AgentTrace steps={steps} />);
    expect(screen.getByText("Read 142 files")).toBeInTheDocument();
    expect(screen.getByText("Generated 412 specs")).toBeInTheDocument();
    expect(screen.getByText("3 callsites need review")).toBeInTheDocument();
  });

  it("renders timestamps when provided", () => {
    render(<AgentTrace steps={steps} />);
    expect(screen.getByText("10:01")).toBeInTheDocument();
    expect(screen.getByText("10:04")).toBeInTheDocument();
  });

  it("in-flight steps render a PulseBadge", () => {
    render(
      <AgentTrace
        steps={[{ id: "x", status: "in-flight", label: "Running…" }]}
      />,
    );
    expect(screen.getByLabelText("In progress")).toBeInTheDocument();
  });

  it("data-component=AgentTrace on the wrapper", () => {
    const { container } = render(<AgentTrace steps={steps} />);
    expect(container.querySelector('[data-component="AgentTrace"]')).toBeInTheDocument();
  });
});

describe("AgentTrace — expandable detail", () => {
  it("steps without detail are not expandable", () => {
    render(<AgentTrace steps={steps} />);
    const row = screen.getByText("Read 142 files").closest("button")!;
    expect(row.getAttribute("aria-expanded")).toBeNull();
    expect(row.disabled).toBe(true);
  });

  it("steps with detail render a chevron and toggle on click", () => {
    const withDetail: AgentTraceStep[] = [
      { id: "1", status: "success", label: "Audit", detail: <p>Found 12 issues.</p> },
    ];
    render(<AgentTrace steps={withDetail} />);
    const button = screen.getByRole("button", { name: /Audit/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Found 12 issues.")).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Found 12 issues.")).toBeInTheDocument();
  });
});

describe("AgentTrace — loading state", () => {
  it("renders skeleton rows when loading", () => {
    render(<AgentTrace loading />);
    expect(screen.getByTestId("agenttrace-loading")).toBeInTheDocument();
  });

  it("loadingRows controls the skeleton count", () => {
    const { container } = render(<AgentTrace loading loadingRows={2} />);
    const wrap = container.querySelector('[data-testid="agenttrace-loading"]')!;
    // Each row has two Skeletons (circle + text); count rows by direct children.
    expect(wrap.children.length).toBe(2);
  });

  it("loading takes precedence over data", () => {
    render(<AgentTrace loading steps={steps} />);
    expect(screen.queryByText("Read 142 files")).not.toBeInTheDocument();
  });
});

describe("AgentTrace — error state", () => {
  it("renders error block with default message", () => {
    render(<AgentTrace error="boom" steps={steps} />);
    expect(screen.getByTestId("agenttrace-error")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("custom errorMessage", () => {
    render(<AgentTrace error={new Error("net")} errorMessage="Trace fetch failed" />);
    expect(screen.getByText("Trace fetch failed")).toBeInTheDocument();
    expect(screen.getByText("net")).toBeInTheDocument();
  });

  it("Retry button calls onRetry", () => {
    const onRetry = vi.fn();
    render(<AgentTrace error="x" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("error takes precedence over data, but loading wins over error", () => {
    render(<AgentTrace loading error="x" steps={steps} />);
    expect(screen.getByTestId("agenttrace-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("agenttrace-error")).not.toBeInTheDocument();
  });
});

describe("AgentTrace — empty state", () => {
  it("renders empty block with default message when steps=[]", () => {
    render(<AgentTrace steps={[]} />);
    expect(screen.getByTestId("agenttrace-empty")).toBeInTheDocument();
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });

  it("custom emptyMessage + emptyHint render", () => {
    render(
      <AgentTrace
        steps={[]}
        emptyMessage="No work logged."
        emptyHint="Start an agent to see trace events here."
      />,
    );
    expect(screen.getByText("No work logged.")).toBeInTheDocument();
    expect(
      screen.getByText("Start an agent to see trace events here."),
    ).toBeInTheDocument();
  });

  it("emptyAction renders a CTA that fires onClick", () => {
    const onClick = vi.fn();
    render(
      <AgentTrace
        steps={[]}
        emptyAction={{ label: "Start agent", onClick }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start agent" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("empty branch hidden when steps non-empty", () => {
    render(<AgentTrace steps={steps} />);
    expect(screen.queryByTestId("agenttrace-empty")).not.toBeInTheDocument();
  });
});
