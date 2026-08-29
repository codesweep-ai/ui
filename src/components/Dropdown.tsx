import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";
import { FormGroup } from "./FormGroup";
import { useId } from "react";

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange" | "options" | "placeholder" | "disabled" | "className" | "id" | "required" | "children"> {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Text shown as the sole disabled option when `options` is empty. Default: "No options available." */
  emptyMessage?: string;
  /** Optional label rendered above the select. Added v1.3.0. */
  label?: string;
  /** id on the underlying <select>. Used as the label's htmlFor. Auto-generated when omitted. Added v1.3.0. */
  id?: string;
  /** Required marker on the label. Added v1.3.0. */
  required?: boolean;
  /** Grey helper text below the select. Added v1.3.0. */
  helper?: string;
  /** Red error message below the select; paints the red border. Added v1.3.0. */
  error?: string;
}

function DropdownImpl({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  emptyMessage = "No options available.",
  label,
  id,
  required,
  helper,
  error,
  "aria-label": ariaLabel,
  ...selectProps
}: DropdownProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const isEmpty = options.length === 0;
  const hasError = !!error;

  const control = (
    <div id={`${controlId}-wrapper`} data-component="Dropdown" className={cn("cs-component-dropdown-6 ", className)}>
      <select
        {...selectProps}
        id={controlId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isEmpty}
        required={required}
        aria-invalid={hasError || undefined}
        aria-label={ariaLabel ?? (!label ? placeholder ?? "Select option" : undefined)}
        data-testid={isEmpty ? "dropdown-empty" : undefined}
        className={cn(
          "cs-component-dropdown-8 ",
          "cs-component-dropdown-9 ",
          "cs-component-dropdown-10 ",
          "cs-component-dropdown-11 ",
          "cs-component-dropdown-12 ",
          "cs-component-dropdown-13 ",
          "cs-component-dropdown-14",
          hasError
            ? "cs-component-dropdown-15 "
            : "cs-component-dropdown-16 ",
          disabled && "cs-component-dropdown-17 ",
        )}
      >
        {isEmpty ? (
          <option value="" disabled>
            {emptyMessage}
          </option>
        ) : (
          <>
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </>
        )}
      </select>
      <ChevronDown
        className="cs-component-dropdown-20 "
      />
    </div>
  );

  // When no label/helper/error chrome is requested, render the bare control so
  // existing consumers see no layout change.
  if (!label && !helper && !error) {
    return control;
  }

  return (
    <FormGroup
      label={label}
      htmlFor={controlId}
      required={required}
      helper={helper}
      error={error}
    >
      {control}
    </FormGroup>
  );
}

export const Dropdown = forwardRefToRoot<HTMLDivElement, DropdownProps>(DropdownImpl);
