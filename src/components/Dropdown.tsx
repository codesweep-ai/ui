import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/cn";
import { FormGroup } from "./FormGroup";
import { fieldMessageIds, useFormGroupField } from "../lib/formGroupField";
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
  /** Optional label rendered above the select. Added v0.3.0. */
  label?: string;
  /** id on the underlying <select>. Used as the label's htmlFor. Auto-generated when omitted. Added v0.3.0. */
  id?: string;
  /** Required marker on the label. Added v0.3.0. */
  required?: boolean;
  /** Grey helper text below the select. Added v0.3.0. */
  helper?: string;
  /** Red error message below the select; paints the red border. Added v0.3.0. */
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
  "aria-invalid": ariaInvalidProp,
  ...selectProps
}: DropdownProps) {
  const generatedId = useId();
  // A consumer's own FormGroup, when Dropdown is the control inside one. It
  // cannot wire the select itself, because Dropdown wraps it for the chevron
  // and `aria-describedby` on that wrapper is announced to nobody.
  const outer = useFormGroupField();
  const controlId = id ?? outer?.controlId ?? generatedId;
  const isEmpty = options.length === 0;
  const hasError = !!error;
  // FormGroup marks an invalid field with aria-invalid. Read it rather than
  // overwrite it, so a Dropdown inside an errored FormGroup paints its border
  // while the group keeps ownership of the message.
  const invalid =
    hasError
    || ariaInvalidProp === true
    || ariaInvalidProp === "true"
    || (outer?.invalid ?? false);
  // Its own chrome first, then the enclosing group's. Dropdown renders the
  // FormGroup below, so it is that group's parent and cannot read its context.
  const describedBy =
    fieldMessageIds(controlId, { helper, error }).describedBy ?? outer?.describedBy;
  const isRequired = required ?? (outer?.required || undefined);

  const control = (
    <div id={`${controlId}-wrapper`} data-component="Dropdown" className={cn("cs-component-dropdown-6 ", className)}>
      <select
        {...selectProps}
        id={controlId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isEmpty}
        required={isRequired}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
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
          invalid
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
      required={isRequired}
      helper={helper}
      error={error}
    >
      {control}
    </FormGroup>
  );
}

export const Dropdown = forwardRefToRoot<HTMLDivElement, DropdownProps>(DropdownImpl);
