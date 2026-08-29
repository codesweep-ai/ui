import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchInput } from "./SearchInput";

describe("SearchInput", () => {
  it("renders input with placeholder + search button + data-component", () => {
    const { container } = render(
      <SearchInput value="" onChange={() => {}} onSearch={() => {}} />,
    );
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search...")).toHaveAttribute("data-search-input", "");
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toHaveAttribute("data-search-submit", "");
    expect(container.querySelector('[data-component="SearchInput"]')).not.toBeNull();
  });

  it("custom placeholder", () => {
    render(
      <SearchInput
        value=""
        onChange={() => {}}
        onSearch={() => {}}
        placeholder="Find a thing..."
      />,
    );
    expect(screen.getByPlaceholderText("Find a thing...")).toBeInTheDocument();
  });

  it("typing fires onChange with the new value", async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} onSearch={() => {}} />);
    await userEvent.type(screen.getByRole("textbox"), "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("Enter fires onSearch with current value (immediate, no debounce wait)", async () => {
    const onSearch = vi.fn();
    render(<SearchInput value="hello" onChange={() => {}} onSearch={onSearch} />);
    await userEvent.type(screen.getByRole("textbox"), "{Enter}");
    expect(onSearch).toHaveBeenCalledWith("hello");
  });

  it("clear button only renders when value is non-empty", () => {
    const { rerender } = render(
      <SearchInput value="" onChange={() => {}} onSearch={() => {}} />,
    );
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    rerender(<SearchInput value="x" onChange={() => {}} onSearch={() => {}} />);
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("clear button fires onChange('') + onSearch('')", async () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();
    render(<SearchInput value="hello" onChange={onChange} onSearch={onSearch} />);
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledWith("");
    expect(onSearch).toHaveBeenCalledWith("");
  });

  it("Escape clears (onChange('') + onSearch(''))", async () => {
    const onChange = vi.fn();
    const onSearch = vi.fn();
    render(<SearchInput value="x" onChange={onChange} onSearch={onSearch} />);
    await userEvent.type(screen.getByRole("textbox"), "{Escape}");
    expect(onChange).toHaveBeenCalledWith("");
    expect(onSearch).toHaveBeenCalledWith("");
  });

  it("Search button click fires onSearch", async () => {
    const onSearch = vi.fn();
    render(<SearchInput value="x" onChange={() => {}} onSearch={onSearch} />);
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(onSearch).toHaveBeenCalledWith("x");
  });

  it("disabled disables input and buttons", () => {
    render(
      <SearchInput value="x" onChange={() => {}} onSearch={() => {}} disabled />,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeDisabled();
  });

  it("auto-search debounces and fires after minChars met", async () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    // value is already at min length; effect schedules a debounced fire
    render(
      <SearchInput
        value="abc"
        onChange={() => {}}
        onSearch={onSearch}
        minChars={2}
        debounceMs={300}
      />,
    );
    expect(onSearch).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onSearch).toHaveBeenCalledWith("abc");
    vi.useRealTimers();
  });

  it("auto-search does NOT fire when value below minChars", () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(
      <SearchInput
        value="a"
        onChange={() => {}}
        onSearch={onSearch}
        minChars={3}
        debounceMs={200}
      />,
    );
    vi.advanceTimersByTime(500);
    expect(onSearch).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("auto-search fires with empty when an eligible query is deleted", async () => {
    const onSearch = vi.fn();
    function Fixture() {
      const [value, setValue] = useState("ab");
      return <SearchInput value={value} onChange={setValue} onSearch={onSearch} minChars={1} debounceMs={0} />;
    }
    render(<Fixture />);
    await userEvent.clear(screen.getByRole("textbox"));
    await vi.waitFor(() => expect(onSearch).toHaveBeenLastCalledWith(""));
  });

  // Regression, OPEN.md §7.16: backspacing to an empty field must tell the
  // consumer, or its results never clear. The test above only covers a
  // one-shot clear at minChars=1; the real sequence walks down through the
  // below-minChars values first, and that path used to fire nothing at all.
  it("auto-search fires with empty when the query is backspaced away one character at a time", async () => {
    const onSearch = vi.fn();
    function Fixture() {
      const [value, setValue] = useState("aut");
      return (
        <SearchInput
          value={value}
          onChange={setValue}
          onSearch={onSearch}
          minChars={3}
          debounceMs={0}
        />
      );
    }
    render(<Fixture />);
    const box = screen.getByRole("textbox");
    await vi.waitFor(() => expect(onSearch).toHaveBeenLastCalledWith("aut"));

    await userEvent.type(box, "{backspace}{backspace}{backspace}");
    expect(box).toHaveValue("");
    await vi.waitFor(() => expect(onSearch).toHaveBeenLastCalledWith(""));
  });

  it("uses the latest inline callback without re-arming the debounce", () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const latest = vi.fn();
    const { rerender } = render(<SearchInput value="abc" onChange={() => {}} onSearch={first} minChars={1} debounceMs={300} />);
    vi.advanceTimersByTime(200);
    rerender(<SearchInput value="abc" onChange={() => {}} onSearch={latest} minChars={1} debounceMs={300} />);
    vi.advanceTimersByTime(100);
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledWith("abc");
    vi.useRealTimers();
  });

  it("spreads input props and renders the status slot", () => {
    render(<SearchInput aria-label="Find events" data-extra="yes" value="" onChange={() => {}} onSearch={() => {}} status="12 results" />);
    expect(screen.getByRole("textbox", { name: "Find events" })).toHaveAttribute("data-extra", "yes");
    expect(screen.getByRole("status")).toHaveTextContent("12 results");
    expect(screen.getByRole("status")).toHaveAttribute("data-search-status", "");
  });
});
