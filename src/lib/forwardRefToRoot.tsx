import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from "react";

type RefElement<T> = ReactElement<{ ref?: ForwardedRef<T> }>;

function setRef<T>(ref: ForwardedRef<T> | undefined, value: T | null) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

/**
 * Preserve an existing component's render function while forwarding a ref to
 * the DOM element it returns. Components passed here must return one root DOM
 * element (or null) on every branch.
 */
export function forwardRefToRoot<T, P>(render: (props: P) => ReactNode) {
  const forwarded = forwardRef<T, P>((props, ref) => {
    const node = render(props as P);
    if (!isValidElement(node) || ref == null) return node;
    const existingRef = (node as RefElement<T> & { ref?: ForwardedRef<T> }).ref;
    return cloneElement(node as RefElement<T>, {
      ref: (value: T | null) => {
        setRef(existingRef, value);
        setRef(ref, value);
      },
    });
  });
  forwarded.displayName = render.name.replace(/Impl$/, "");
  return forwarded;
}
