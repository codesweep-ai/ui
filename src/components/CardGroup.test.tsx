import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardGroup } from "./CardGroup";
import { Card } from "./Card";

describe("CardGroup", () => {
  it("renders children + data-component", () => {
    render(
      <CardGroup>
        <div>child</div>
      </CardGroup>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(
      screen.getByText("child").closest('[data-component="CardGroup"]'),
    ).not.toBeNull();
  });

  it("merges consumer className", () => {
    const { container } = render(
      <CardGroup className="cg-custom">
        <div>x</div>
      </CardGroup>,
    );
    expect(
      container.querySelector('[data-component="CardGroup"]')?.className,
    ).toContain("cg-custom");
  });

  it("fills height by default and cards flex-fill", () => {
    const { container } = render(
      <CardGroup>
        <Card id="a" header="A" maximizable>
          body
        </Card>
      </CardGroup>,
    );
    const group = container.querySelector('[data-component="CardGroup"]')!;
    expect(group.className).toContain("cs-component-card-group-6");
    const card = container.querySelector('[data-component="Card"]')!;
    expect(card.className).toContain("cs-component-card-21");
  });

  it("fill={false} → group is natural height and cards do not flex-fill", () => {
    const { container } = render(
      <CardGroup fill={false}>
        <Card id="a" header="A" maximizable>
          body
        </Card>
      </CardGroup>,
    );
    const group = container.querySelector('[data-component="CardGroup"]')!;
    expect(group.className).not.toContain("cs-component-card-group-6");
    const card = container.querySelector('[data-component="Card"]')!;
    expect(card.className).not.toContain("cs-component-card-21");
  });

  it("fill={false} but maximized → group fills + maximized card flexes", () => {
    const { container } = render(
      <CardGroup fill={false} maximizedId="a">
        <Card id="a" header="A" maximizable>
          body
        </Card>
      </CardGroup>,
    );
    const group = container.querySelector('[data-component="CardGroup"]')!;
    expect(group.className).toContain("cs-component-card-group-6");
    const card = container.querySelector('[data-component="Card"]')!;
    expect(card.className).toContain("cs-component-card-21");
  });
});
