import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChartFrame } from "./ChartFrame";

describe("ChartFrame — happy path", () => {
  it("renders children when not loading/error/empty", () => {
    render(
      <ChartFrame title="Usage">
        <svg data-testid="the-chart" />
      </ChartFrame>,
    );
    expect(screen.getByTestId("the-chart")).toBeInTheDocument();
  });

  it("renders the title", () => {
    render(
      <ChartFrame title="Tokens / day">
        <svg />
      </ChartFrame>,
    );
    expect(screen.getByText("Tokens / day")).toBeInTheDocument();
  });

  it("renders actions", () => {
    render(
      <ChartFrame title="X" actions={<button>Export</button>}>
        <svg />
      </ChartFrame>,
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("data-component=ChartFrame on root", () => {
    const { container } = render(
      <ChartFrame>
        <svg />
      </ChartFrame>,
    );
    expect(container.querySelector('[data-component="ChartFrame"]')).toBeInTheDocument();
  });
});

describe("ChartFrame — loading state", () => {
  it("renders skeleton, not children", () => {
    render(
      <ChartFrame loading>
        <svg data-testid="the-chart" />
      </ChartFrame>,
    );
    expect(screen.getByTestId("chartframe-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("the-chart")).not.toBeInTheDocument();
  });
});

describe("ChartFrame — error state", () => {
  it("renders default error message + detail", () => {
    render(
      <ChartFrame error="network down">
        <svg />
      </ChartFrame>,
    );
    expect(screen.getByTestId("chartframe-error")).toBeInTheDocument();
    expect(screen.getByText("Couldn't load chart")).toBeInTheDocument();
    expect(screen.getByText("network down")).toBeInTheDocument();
  });

  it("custom errorMessage + Error object detail", () => {
    render(
      <ChartFrame error={new Error("503")} errorMessage="Chart unavailable">
        <svg />
      </ChartFrame>,
    );
    expect(screen.getByText("Chart unavailable")).toBeInTheDocument();
    expect(screen.getByText("503")).toBeInTheDocument();
  });

  it("Retry button fires onRetry", () => {
    const onRetry = vi.fn();
    render(
      <ChartFrame error="x" onRetry={onRetry}>
        <svg />
      </ChartFrame>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("ChartFrame — empty state", () => {
  it("renders when empty=true", () => {
    render(
      <ChartFrame empty emptyMessage="Nothing to show" emptyHint="Pick a range">
        <svg data-testid="the-chart" />
      </ChartFrame>,
    );
    expect(screen.getByTestId("chartframe-empty")).toBeInTheDocument();
    expect(screen.getByText("Nothing to show")).toBeInTheDocument();
    expect(screen.getByText("Pick a range")).toBeInTheDocument();
    expect(screen.queryByTestId("the-chart")).not.toBeInTheDocument();
  });

  it("emptyAction fires onClick", () => {
    const onClick = vi.fn();
    render(
      <ChartFrame empty emptyAction={{ label: "Load data", onClick }}>
        <svg />
      </ChartFrame>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Load data" }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe("ChartFrame — state precedence", () => {
  it("loading wins over error and empty", () => {
    render(
      <ChartFrame loading error="x" empty>
        <svg />
      </ChartFrame>,
    );
    expect(screen.getByTestId("chartframe-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("chartframe-error")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chartframe-empty")).not.toBeInTheDocument();
  });

  it("error wins over empty", () => {
    render(
      <ChartFrame error="x" empty>
        <svg />
      </ChartFrame>,
    );
    expect(screen.getByTestId("chartframe-error")).toBeInTheDocument();
    expect(screen.queryByTestId("chartframe-empty")).not.toBeInTheDocument();
  });
});
