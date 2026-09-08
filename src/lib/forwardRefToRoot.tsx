import {
  cloneElement,
  forwardRef,
  isValidElement,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from "react";

import { warnWhenUnstyled } from "./stylesheetWarning";
import { warnWhenClipped } from "./clippedContentWarning";

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
    if (!isValidElement(node)) return node;
    // Outside development the root is only cloned when there is a ref to
    // forward. In development it is cloned regardless, so the stylesheet check
    // below has a node to read.
    if (
      ref == null &&
      typeof process !== "undefined" &&
      process.env.NODE_ENV === "production"
    ) {
      return node;
    }
    const existingRef = (node as RefElement<T> & { ref?: ForwardedRef<T> }).ref;
    return cloneElement(node as RefElement<T>, {
      ref: (value: T | null) => {
        setRef(existingRef, value);
        setRef(ref, value);
        warnWhenUnstyled(value);
        warnWhenClipped(value);
      },
    });
  });
  forwarded.displayName = render.name.replace(/Impl$/, "");
  return forwarded;
}
