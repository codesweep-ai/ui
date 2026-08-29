import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./Input";

describe("Input", () => {
  it("renders a native text input by default", () => {
    render(<Input placeholder="Search…" />);
    const el = screen.getByPlaceholderText("Search…") as HTMLInputElement;
    expect(el.tagName).toBe("INPUT");
    expect(el.type).toBe("text");
  });

  it("forwards type prop", () => {
    render(<Input type="email" placeholder="email" />);
    const el = screen.getByPlaceholderText("email") as HTMLInputElement;
    expect(el.type).toBe("email");
  });

  it("renders a textarea when multiline", () => {
    render(<Input multiline rows={5} placeholder="long text" />);
    const el = screen.getByPlaceholderText("long text") as HTMLTextAreaElement;
    expect(el.tagName).toBe("TEXTAREA");
    expect(el.rows).toBe(5);
  });

  it("multiline defaults to rows=3", () => {
    render(<Input multiline placeholder="ml" />);
    const el = screen.getByPlaceholderText("ml") as HTMLTextAreaElement;
    expect(el.rows).toBe(3);
  });

  it("fires onChange", () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} placeholder="x" />);
    fireEvent.change(screen.getByPlaceholderText("x"), { target: { value: "hi" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("applies error border when error=true", () => {
    const { container } = render(<Input error placeholder="x" />);
    const wrapper = container.querySelector('[data-component="Input"]')!;
    expect(wrapper.className).toContain("cs-component-input-24");
  });

  it("renders prefix and suffix", () => {
    render(
      <Input
        placeholder="x"
        prefix={<span data-testid="px">$</span>}
        suffix={<span data-testid="sx">USD</span>}
      />,
    );
    expect(screen.getByTestId("px")).toBeInTheDocument();
    expect(screen.getByTestId("sx")).toBeInTheDocument();
  });

  it("disabled prevents input", () => {
    render(<Input disabled placeholder="x" />);
    expect((screen.getByPlaceholderText("x") as HTMLInputElement).disabled).toBe(true);
  });

  it("readOnly attribute is set", () => {
    render(<Input readOnly value="x" onChange={() => {}} placeholder="ro" />);
    expect((screen.getByPlaceholderText("ro") as HTMLInputElement).readOnly).toBe(true);
  });

  it("sm size applies smaller padding/font-size", () => {
    const { container } = render(<Input size="sm" placeholder="x" />);
    const input = container.querySelector("input")!;
    expect(input.className).toContain("cs-component-input-18");
  });

  it("md size (default) applies body font-size", () => {
    const { container } = render(<Input placeholder="x" />);
    const input = container.querySelector("input")!;
    expect(input.className).toContain("cs-component-input-19");
  });

  it("merges className on wrapper", () => {
    const { container } = render(<Input className="custom-x" placeholder="x" />);
    const wrapper = container.querySelector('[data-component="Input"]')!;
    expect(wrapper.className).toContain("custom-x");
  });

  it("has data-component=Input on root", () => {
    const { container } = render(<Input placeholder="x" />);
    expect(container.querySelector('[data-component="Input"]')).toBeInTheDocument();
  });

  it("multiline marks wrapper data-multiline", () => {
    const { container } = render(<Input multiline placeholder="x" />);
    expect(container.querySelector('[data-multiline="true"]')).toBeInTheDocument();
  });

  it("forwards ref to underlying input", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} placeholder="x" />);
    expect(ref.current?.tagName).toBe("INPUT");
  });

  it("forwards ref to underlying textarea when multiline", () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    render(<Input multiline ref={ref} placeholder="x" />);
    expect(ref.current?.tagName).toBe("TEXTAREA");
  });
});
