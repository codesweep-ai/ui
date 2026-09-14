import { createContext, useContext } from "react";

/**
 * The wiring a `FormGroup` generates for the field it wraps.
 *
 * `FormGroup` owns the ids, because it renders the helper and the error text
 * that those ids are on. The control has to carry the references to them, and
 * only the control knows which element that is: a component that renders a
 * wrapper around a `<select>` cannot have `aria-describedby` dropped on the
 * wrapper and call the message announced.
 */
export interface FormGroupField {
  /** id of the control the label points at. */
  controlId: string;
  /** id of the helper or error text, for `aria-describedby`. Error wins. */
  describedBy?: string;
  /** Whether the group is showing an error. */
  invalid: boolean;
  /** Whether the group was marked required. */
  required: boolean;
}

export const FormGroupContext = createContext<FormGroupField | null>(null);

/**
 * The ids a `FormGroup` gives its messages, derived in one place.
 *
 * `FormGroup` renders the two spans and needs both ids. A control that renders
 * its own `FormGroup`, as `Dropdown` and `CheckboxGroup` do, is the parent of
 * that group and cannot read the context it provides, so it derives the same
 * ids from the same id it passed in. Sharing the function rather than the
 * convention is what keeps the two from drifting apart.
 */
export function fieldMessageIds(
  controlId: string,
  messages: { helper?: string; error?: string },
): { helperId?: string; errorId?: string; describedBy?: string } {
  const helperId = messages.helper ? `${controlId}-helper` : undefined;
  const errorId = messages.error ? `${controlId}-error` : undefined;
  return { helperId, errorId, describedBy: errorId ?? helperId };
}

/**
 * The wiring of the enclosing `FormGroup`, or null outside one.
 *
 * A control that renders a single native element needs nothing: `FormGroup`
 * wires an `<input>`, `<select>` or `<textarea>` child directly, and so an
 * element already marked `role="group"`. A control that renders anything else
 * reads the wiring here and puts it where it belongs.
 *
 * ```tsx
 * function MyField(props) {
 *   const field = useFormGroupField();
 *   return (
 *     <div className="wrapper">
 *       <input
 *         id={field?.controlId}
 *         aria-describedby={field?.describedBy}
 *         aria-invalid={field?.invalid || undefined}
 *         required={field?.required || undefined}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useFormGroupField(): FormGroupField | null {
  return useContext(FormGroupContext);
}
