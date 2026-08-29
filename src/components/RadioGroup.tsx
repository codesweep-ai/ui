"use client";

import { useRef } from "react";
import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { cn } from "../lib/cn";

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  /** Secondary line under the label — a cost, a caveat, a "use when". */
  description?: React.ReactNode;
  disabled?: boolean;
  /** Accessible name, when the label alone does not read well out of context. */
  ariaLabel?: string;
}

interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Stacked by default; `horizontal` for a short row of short labels. */
  orientation?: "vertical" | "horizontal";
}

/**
 * An exclusive choice among two or more options, each able to carry a
 * description.
 *
 * `SegmentedControl` covers the compact 2–5 case and throws beyond it, and
 * `Dropdown` hides the options until opened. Neither fits a choice that is the
 * subject of the page rather than a control on it — six options, each needing a
 * line of explanation, all worth seeing at once. `CheckboxGroup` has pointed at
 * "a radio group" since before one existed.
 */
function RadioGroupImpl({
  options,
  value,
  onChange,
  disabled = false,
  orientation = "vertical",
  className,
  "aria-label": ariaLabel = "Options",
  ...props
}: RadioGroupProps) {
  if (options.length < 2) {
    throw new Error("RadioGroup requires at least 2 options");
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
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      next = enabledIndexes[(position + 1) % enabledIndexes.length];
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
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
      data-component="RadioGroup"
      data-radio-orientation={orientation}
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "cs-component-radio-group-1",
        orientation === "horizontal"
          ? "cs-component-radio-group-2"
          : "cs-component-radio-group-3",
        className,
      )}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        const optionDisabled = disabled || option.disabled;
        return (
          <button
            key={option.value}
            data-radio-option={option.value}
            data-radio-active={checked ? "" : undefined}
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
              "cs-component-radio-group-4",
              checked && "cs-component-radio-group-5",
              optionDisabled && "cs-component-radio-group-6",
            )}
          >
            <span aria-hidden="true" className="cs-component-radio-group-7" />
            <span className="cs-component-radio-group-8">
              <span data-radio-label="" className="cs-component-radio-group-9">
                {option.label}
              </span>
              {option.description && (
                <span data-radio-description="" className="cs-component-radio-group-10">
                  {option.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export const RadioGroup = forwardRefToRoot<HTMLDivElement, RadioGroupProps>(RadioGroupImpl);
