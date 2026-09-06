import type { Ref } from "react";

const warned = new Set<string>();

/**
 * Warn, once per component, when one renders with its stylesheet missing.
 *
 * A consumer who imports the tokens and the base sheet but no component sheets
 * gets a page of unstyled blocks, and nothing errors: the components render,
 * the classes are on the elements, and no rule matches them. One app shipped
 * that way unnoticed.
 *
 * Every component sheet sets a marker custom property on the component's root,
 * so an absent marker is a missing sheet. The check is per component rather
 * than global because the sheets are per component: a consumer can hold
 * `tree.css` and be missing `card.css`, and only the component that is bare
 * can say so.
 *
 * Guarded on `process.env.NODE_ENV` rather than on `import.meta.env.DEV`. The
 * latter is replaced when this package is built, which would leave the check
 * dead in every published copy and warn nobody. The former is replaced by the
 * consumer's own bundler, so it survives into their development build and is
 * stripped from their production one.
 *
 * The guard bails only when it can see production. Where `process` is not
 * defined at all, which is an unbundled page and is also how the browser tests
 * run, the check runs rather than silently doing nothing. A warning that
 * defaults to off is a warning nobody receives.
 */
export function warnWhenUnstyled(node: unknown): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return;
  if (typeof HTMLElement === "undefined" || !(node instanceof HTMLElement)) return;

  const name = node.dataset.component;
  if (!name || warned.has(name)) return;

  const sheet = name.replace(/(?<!^)(?=[A-Z])/g, "-").toLowerCase();
  if (getComputedStyle(node).getPropertyValue(`--cs-styles-${sheet}`).trim()) return;

  warned.add(name);
  console.warn(
    `[@codesweep-ai/ui] ${name} rendered with no stylesheet, so it has no styling. ` +
      `Import "@codesweep-ai/ui/styles/components/${sheet}.css", or ` +
      `"@codesweep-ai/ui/styles/components.css" to cover every component.`,
  );
}

/**
 * A root ref that forwards and then checks. For the four components that call
 * `forwardRef` directly instead of going through `forwardRefToRoot`.
 */
export function checkedRootRef<T extends HTMLElement>(ref?: Ref<T>) {
  return (node: T | null) => {
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as { current: T | null }).current = node;
    warnWhenUnstyled(node);
  };
}
