"use client";

import { useRef } from "react";
import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { cn } from "../lib/cn";

export interface SegmentedControlOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  /** Accessible name for icon-only labels. */
  ariaLabel?: string;
}

interface SegmentedControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: SegmentedControlOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function SegmentedControlImpl({
  options,
  value,
  onChange,
  disabled = false,
  className,
  "aria-label": ariaLabel = "Options",
  ...props
}: SegmentedControlProps) {
  if (options.length < 2 || options.length > 5) {
    throw new Error("SegmentedControl requires 2–5 options");
  }

  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabledIndexes = options
    .map((option, index) => (!disabled && !option.disabled ? index : -1))
    .filter((index) => index >= 0);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const tabStop = enabledIndexes.includes(selectedIndex) ? selectedIndex : enabledIndexes[0];

  const selectIndex = (index: number) => {
    refs.current[index]?.focus();
    onChange(options[index].value);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const position = enabledIndexes.indexOf(index);
    if (position < 0 || enabledIndexes.length === 0) return;

    let next: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = enabledIndexes[(position + 1) % enabledIndexes.length];
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = enabledIndexes[(position - 1 + enabledIndexes.length) % enabledIndexes.length];
    } else if (event.key === "Home") {
      next = enabledIndexes[0];
    } else if (event.key === "End") {
      next = enabledIndexes[enabledIndexes.length - 1];
    }

    if (next != null) {
      event.preventDefault();
      selectIndex(next);
    }
  };

  return (
    <div
      {...props}
      data-component="SegmentedControl"
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("cs-component-segmented-control-1", className)}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        const optionDisabled = disabled || option.disabled;
        return (
          <button
            key={option.value}
            data-segmented-option={option.value}
            data-segmented-active={checked ? "" : undefined}
            ref={(element) => { refs.current[index] = element; }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.ariaLabel}
            disabled={optionDisabled}
            tabIndex={index === tabStop ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "cs-component-segmented-control-2",
              checked ? "cs-component-segmented-control-3" : "cs-component-segmented-control-4",
              optionDisabled && "cs-component-segmented-control-5",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export const SegmentedControl = forwardRefToRoot<HTMLDivElement, SegmentedControlProps>(SegmentedControlImpl);
