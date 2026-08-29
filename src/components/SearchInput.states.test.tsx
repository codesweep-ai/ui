import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchInput } from "./SearchInput";

describe("SearchInput — no-results state", () => {
  it("noResults message renders below the input when noResults=true AND value non-empty", () => {
    render(
      <SearchInput
        value="zzzz"
        onChange={() => {}}
        onSearch={() => {}}
        noResults
      />,
    );
    expect(screen.getByTestId("searchinput-noresults")).toBeInTheDocument();
    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("noResults message hidden when value is empty (no message until user has searched)", () => {
    render(
      <SearchInput value="" onChange={() => {}} onSearch={() => {}} noResults />,
    );
    expect(screen.queryByTestId("searchinput-noresults")).not.toBeInTheDocument();
  });

  it("noResults message hidden when noResults=false (default)", () => {
    render(<SearchInput value="x" onChange={() => {}} onSearch={() => {}} />);
    expect(screen.queryByTestId("searchinput-noresults")).not.toBeInTheDocument();
  });

  it("custom noResultsMessage", () => {
    render(
      <SearchInput
        value="x"
        onChange={() => {}}
        onSearch={() => {}}
        noResults
        noResultsMessage="Nothing matches your search."
      />,
    );
    expect(screen.getByText("Nothing matches your search.")).toBeInTheDocument();
  });
});
