"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { Children, cloneElement, isValidElement, useId } from "react";
import { cn } from "../lib/cn";

interface FormGroupProps {
  /**
   * Field label rendered above the control (uppercase label utility).
   * Optional — when omitted, no label renders but helper/error still work.
   * Used internally by composite controls (CheckboxGroup, Dropdown) that
   * want the helper/error treatment without an extra label row.
   */
  label?: string;
  /**
   * `id` to associate the label with the control. Required when the control
   * is a single native input/select/textarea. May be omitted when wrapping a
   * composite control (CheckboxGroup, fieldset-style content) — in that case
   * the group renders an `aria-label`-friendly label without an htmlFor.
   */
  htmlFor?: string;
  /** Renders a `*` after the label and forwards `required` to the child input. */
  required?: boolean;
  /** Grey hint text below the control. Hidden when `error` is set. */
  helper?: string;
  /** Red message below the control. Replaces helper when set; forwards `aria-invalid` to the child. */
  error?: string;
  /** Additional className on the wrapper. */
  className?: string;
  /** The control (Input, Dropdown, CheckboxGroup, custom input). */
  children: React.ReactNode;
}

/**
 * Label + control + helper/error composition. The canonical way to render a
 * single form field. Generates stable IDs for helper/error and auto-wires
 * `aria-describedby` and `aria-invalid` on the child control.
 */
function FormGroupImpl({
  label,
  htmlFor,
  required = false,
  helper,
  error,
  className,
  children,
}: FormGroupProps) {
  const reactId = useId();
  const controlId = htmlFor ?? `formgroup-${reactId}`;
  const helperId = helper ? `${controlId}-helper` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = errorId ?? helperId;

  // If a single React element is passed, clone it to forward id / aria props.
  // - DOM elements (input/select/textarea/...) receive DOM-safe attrs only.
  // - Component children additionally receive `error` (boolean) so design-
  //   system components like Input can paint their error border in sync.
  // Composite children (multiple nodes, fragments) are rendered as-is.
  const childArr = Children.toArray(children);
  let enhancedChildren: React.ReactNode = children;
  if (childArr.length === 1 && isValidElement(childArr[0])) {
    const child = childArr[0] as React.ReactElement<Record<string, unknown>>;
    const isDomElement = typeof child.type === "string";
    const next: Record<string, unknown> = {
      id: (child.props.id as string | undefined) ?? controlId,
      "aria-describedby":
        (child.props["aria-describedby"] as string | undefined) ?? describedBy,
      "aria-invalid":
        (child.props["aria-invalid"] as boolean | undefined) ??
        (error ? true : undefined),
      required:
        (child.props.required as boolean | undefined) ??
        (required || undefined),
    };
    if (!isDomElement) {
      next.error =
        (child.props.error as boolean | undefined) ?? (error ? true : undefined);
    }
    enhancedChildren = cloneElement(child, next);
  }

  return (
    <div
      data-component="FormGroup"
      className={cn(
        "cs-component-form-group-15 ",
        className,
      )}
    >
      {label && (
        <label
          htmlFor={htmlFor ? controlId : undefined}
          className={cn("text-label-upper cs-component-form-group-16")}
        >
          {label}
          {required && (
            <span
              aria-hidden="true"
              className="cs-component-form-group-18 "
            >
              *
            </span>
          )}
        </label>
      )}
      {enhancedChildren}
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="cs-component-form-group-20 "
        >
          {error}
        </span>
      ) : helper ? (
        <span
          id={helperId}
          className="cs-component-form-group-21 "
        >
          {helper}
        </span>
      ) : null}
    </div>
  );
}

export const FormGroup = forwardRefToRoot<HTMLDivElement, FormGroupProps>(FormGroupImpl);
