"use client";

import { forwardRefToRoot } from "../lib/forwardRefToRoot";

import { Children, cloneElement, isValidElement, useId } from "react";
import { cn } from "../lib/cn";
import { FormGroupContext, fieldMessageIds, type FormGroupField } from "../lib/formGroupField";

// The wiring only means something on an element that can carry it: a native
// control, or an element the author has already declared a group, which is
// what a set of checkboxes is. FormGroup cannot see inside a component child,
// so it does not guess at one — that child reads the wiring from context and
// puts it on the element it knows about. Cloning regardless is how `required`
// came to sit on a `<div>` and an error message came to be described to one.
const WIRABLE_TAGS = new Set(["input", "select", "textarea"]);
const WIRABLE_ROLES = new Set(["group", "radiogroup"]);

function canCarryWiring(node: React.ReactElement<Record<string, unknown>>): boolean {
  if (typeof node.type !== "string") return false;
  return WIRABLE_TAGS.has(node.type) || WIRABLE_ROLES.has(String(node.props.role ?? ""));
}

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
  const { helperId, errorId, describedBy } = fieldMessageIds(controlId, { helper, error });

  // A control paints its error border from `aria-invalid`, which is the
  // standard signal, so nothing private passes between FormGroup and the
  // controls it wraps. Composite children (multiple nodes, fragments) are
  // rendered as-is, and so is any component child: those read `field` below.
  const field: FormGroupField = {
    controlId,
    describedBy,
    invalid: Boolean(error),
    required,
  };
  const childArr = Children.toArray(children);
  let enhancedChildren: React.ReactNode = children;
  if (childArr.length === 1 && isValidElement(childArr[0]) && canCarryWiring(childArr[0] as React.ReactElement<Record<string, unknown>>)) {
    const child = childArr[0] as React.ReactElement<Record<string, unknown>>;
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
      <FormGroupContext.Provider value={field}>{enhancedChildren}</FormGroupContext.Provider>
      {/* The message slot holds its line whether or not there is a message, so
          a field that turns invalid does not push everything below it down the
          page. A field with helper text already occupied the slot; this gives
          every other field the same footprint. */}
      <span className="cs-component-form-group-22 ">
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
      </span>
    </div>
  );
}

export const FormGroup = forwardRefToRoot<HTMLDivElement, FormGroupProps>(FormGroupImpl);
