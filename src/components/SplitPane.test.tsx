import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SplitPane } from "./SplitPane";

beforeEach(() => {
  localStorage.clear();
});

describe("SplitPane", () => {
  it("renders all pane children", () => {
    render(
      <SplitPane
        panes={[
          { id: "left", defaultWidth: 200, children: <div>LEFT</div> },
          { id: "right", children: <div>RIGHT</div> },
        ]}
      />,
    );
    expect(screen.getByText("LEFT")).toBeInTheDocument();
    expect(screen.getByText("RIGHT")).toBeInTheDocument();
  });

  it("collapsed pane is not rendered", () => {
    render(
      <SplitPane
        panes={[
          { id: "left", defaultWidth: 200, children: <div>LEFT</div>, collapsed: true },
          { id: "right", children: <div>RIGHT</div> },
        ]}
      />,
    );
    expect(screen.queryByText("LEFT")).not.toBeInTheDocument();
    expect(screen.getByText("RIGHT")).toBeInTheDocument();
  });

  it("renders a separator with role=separator between two visible panes", () => {
    render(
      <SplitPane
        panes={[
          { id: "left", defaultWidth: 200, children: <div>L</div>, minWidth: 100, maxWidth: 400 },
          { id: "right", children: <div>R</div> },
        ]}
      />,
    );
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
    expect(sep).toHaveAttribute("aria-valuemin", "100");
    expect(sep).toHaveAttribute("aria-valuemax", "400");
    expect(sep).toHaveAttribute("aria-valuenow", "200");
  });

  it("ArrowRight on separator increases width by 10 (default step)", async () => {
    render(
      <SplitPane
        panes={[
          { id: "left", defaultWidth: 200, minWidth: 100, maxWidth: 400, children: <div>L</div> },
          { id: "right", children: <div>R</div> },
        ]}
      />,
    );
    const sep = screen.getByRole("separator");
    sep.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "210");
  });

  it("ArrowLeft decreases width; clamped at min", async () => {
    render(
      <SplitPane
        panes={[
          { id: "left", defaultWidth: 105, minWidth: 100, maxWidth: 400, children: <div>L</div> },
          { id: "right", children: <div>R</div> },
        ]}
      />,
    );
    const sep = screen.getByRole("separator");
    sep.focus();
    await userEvent.keyboard("{ArrowLeft}");
    // 105 - 10 = 95, but min is 100, so it clamps to 100
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "100");
  });

  it("Home sets width to min, End sets width to max", async () => {
    render(
      <SplitPane
        panes={[
          { id: "left", defaultWidth: 200, minWidth: 100, maxWidth: 400, children: <div>L</div> },
          { id: "right", children: <div>R</div> },
        ]}
      />,
    );
    const sep = screen.getByRole("separator");
    sep.focus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "100");
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "400");
  });

  it("persists width to localStorage when storageKey is provided", async () => {
    render(
      <SplitPane
        panes={[
          {
            id: "left",
            defaultWidth: 200,
            minWidth: 100,
            maxWidth: 400,
            storageKey: "test-sp-width",
            children: <div>L</div>,
          },
          { id: "right", children: <div>R</div> },
        ]}
      />,
    );
    screen.getByRole("separator").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(localStorage.getItem("test-sp-width")).toBe("210");
  });

  it("reads initial width from localStorage if storageKey is set and value exists", () => {
    localStorage.setItem("test-sp-width", "275");
    render(
      <SplitPane
        panes={[
          {
            id: "left",
            defaultWidth: 200,
            minWidth: 100,
            maxWidth: 400,
            storageKey: "test-sp-width",
            children: <div>L</div>,
          },
          { id: "right", children: <div>R</div> },
        ]}
      />,
    );
    expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "275");
  });
});
