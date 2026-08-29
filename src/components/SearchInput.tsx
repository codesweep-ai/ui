"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { useEffect, useRef, useCallback } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../lib/cn";

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "onKeyDown" | "placeholder" | "disabled" | "className" | "type" | "children"> {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Min characters before auto-search fires. 0 = no auto-search (manual only). Default: 0 */
  minChars?: number;
  /** Debounce delay in ms for auto-search. Default: 300 */
  debounceMs?: number;
  className?: string;
  /**
   * When true, render a "no results" message inline below the input.
   * Consumers set this based on their search result state. Default: false.
   * Added v1.2.0.
   */
  noResults?: boolean;
  /** Message shown when noResults=true. Default: "No results." */
  noResultsMessage?: string;
  /** Optional result/status content displayed below the input. */
  status?: React.ReactNode;
}

function SearchInputImpl({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  disabled = false,
  minChars = 0,
  debounceMs = 300,
  className,
  noResults = false,
  noResultsMessage = "No results.",
  status,
  "aria-label": ariaLabel,
  ...inputProps
}: SearchInputProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onSearchRef = useRef(onSearch);
  // Whether a query long enough to auto-search has been typed and not yet
  // cleared. It is deliberately not "the previously rendered value": that only
  // reports an emptied field when the *immediately* preceding value was still
  // >= minChars, so backspacing a query away one character at a time reaches
  // empty without the consumer ever being told, and its results never clear
  // (OPEN.md §7.16). It is deliberately not "the last value actually
  // dispatched" either — clearing the field faster than the debounce cancels
  // the pending search, and that must still report the field as empty.
  const hasEligibleQueryRef = useRef(false);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  const dispatchSearch = useCallback((next: string) => {
    if (next === "") hasEligibleQueryRef.current = false;
    onSearchRef.current(next);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Auto-search with debounce
  useEffect(() => {
    if (minChars <= 0) return;
    clearTimer();

    // An emptied field always reports, provided a searchable query had been
    // typed: otherwise the consumer is left showing results for a query that
    // is no longer on screen.
    if (value.length >= minChars) hasEligibleQueryRef.current = true;
    const shouldSearch =
      value.length >= minChars ||
      (value.length === 0 && hasEligibleQueryRef.current);

    if (shouldSearch) {
      timerRef.current = setTimeout(() => {
        dispatchSearch(value);
      }, debounceMs);
    }

    return clearTimer;
  }, [value, minChars, debounceMs, clearTimer, dispatchSearch]);

  const handleClear = () => {
    onChange("");
    dispatchSearch("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      clearTimer();
      dispatchSearch(value);
    } else if (e.key === "Escape") {
      handleClear();
    }
  };

  return (
    <div
      data-component="SearchInput"
      className={cn(
        "cs-component-search-input-11 ",
        disabled && "cs-component-search-input-12 ",
        className,
      )}
    >
    <div
      className={cn(
        "cs-component-search-input-13 ",
        "cs-component-search-input-14 ",
        "cs-component-search-input-15",
        "cs-component-search-input-16 ",
        "cs-component-search-input-17",
        "cs-component-search-input-18",
      )}
    >
      <input
        {...inputProps}
        data-search-input=""
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        disabled={disabled}
        className={cn(
          "cs-component-search-input-20 ",
          "cs-component-search-input-21 ",
          "cs-component-search-input-22 ",
          "cs-component-search-input-23 ",
          "cs-component-search-input-24",
          "cs-component-search-input-25",
          disabled && "cs-component-search-input-26"
        )}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className={cn(
            "cs-component-search-input-28 ",
            "cs-component-search-input-29 ",
            "cs-component-search-input-21 ",
            "cs-component-search-input-30 ",
            disabled && "cs-component-search-input-31 "
          )}
          aria-label="Clear search"
        >
          <X className="cs-component-search-input-33 " />
        </button>
      )}
      <button
        data-search-submit=""
        type="button"
        onClick={() => {
          clearTimer();
          dispatchSearch(value);
        }}
        disabled={disabled}
        className={cn(
          "cs-component-search-input-28 ",
          "cs-component-search-input-29 ",
          "cs-component-search-input-21 ",
          "cs-component-search-input-30 ",
          disabled && "cs-component-search-input-31 "
        )}
        aria-label="Search"
      >
        <Search className="cs-component-search-input-33 " />
      </button>
    </div>
      {noResults && value.length > 0 && (
        <span
          data-testid="searchinput-noresults"
          className="cs-component-search-input-37 "
        >
          {noResultsMessage}
        </span>
      )}
      {status && (
        <div data-search-status="" role="status" className="cs-component-search-input-37">
          {status}
        </div>
      )}
    </div>
  );
}

export const SearchInput = forwardRefToRoot<HTMLDivElement, SearchInputProps>(SearchInputImpl);
