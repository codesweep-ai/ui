const warned = new Set<string>();

const LABELABLE = "input, select, textarea";

/**
 * Warn when a `FormGroup` renders without the wiring it exists to supply.
 *
 * `FormGroup` is the kit's answer to "label this control and announce its
 * error". It delivers that by cloning its child, which it can only do when it
 * has exactly one valid element child: a second child, or a fragment, drops
 * `id`, `aria-describedby`, `aria-invalid` and `required` with no error. It
 * also gives its label an `htmlFor` only when the consumer supplies one, so a
 * group that omits it renders a label bound to nothing while the control still
 * takes the generated id.
 *
 * Both are silent. The field looks right, the helper text is on the page, and
 * a screen reader reaches neither. Two agents reading an installed copy found
 * both by decompiling `dist/`, which is not a way to learn a contract.
 *
 * The check reads the DOM rather than the props, so it sees what a reader
 * actually gets. A child that overrides `aria-describedby` with something that
 * does not exist leaves the helper unannounced exactly as a second child does,
 * and the same warning is the right one.
 *
 * It looks at `FormGroup` alone, by its `data-component`, because the two
 * predicates below are only failures in a component that promises this wiring.
 * A label without `htmlFor` beside one control is ordinary elsewhere.
 *
 * Guarded on `process.env.NODE_ENV` rather than `import.meta.env.DEV`. The
 * latter is replaced when this package is built, which would leave the check
 * dead in every published copy and warn nobody. The former is replaced by the
 * consumer's own bundler, so it survives into their development build and is
 * stripped from their production one.
 */
export function warnWhenFieldUnwired(node: unknown): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return;
  if (typeof HTMLElement === "undefined" || !(node instanceof HTMLElement)) return;
  if (node.dataset.component !== "FormGroup") return;

  // The helper and the error carry the ids FormGroup points `aria-describedby`
  // at. If one is on the page and nothing refers to it, it is not announced.
  const message = node.querySelector<HTMLElement>('[id$="-helper"], [id$="-error"]');
  if (message && !describedBy(node, message.id)) {
    warn(
      "unwired",
      `FormGroup rendered ${message.id.endsWith("-error") ? "an error" : "helper text"} that no ` +
        "control refers to, so a screen reader never reaches it. FormGroup wires " +
        "`aria-describedby` by cloning its child, which needs exactly one element child: a " +
        "second child or a fragment drops the wiring, and so does a child that sets its own " +
        "`aria-describedby`.",
    );
  }

  // A label that binds to nothing, beside the one control it was meant for.
  // Several controls is a composite group, where FormGroup's own documentation
  // says the label may stand alone.
  const label = node.querySelector("label");
  if (label && !label.htmlFor && node.querySelectorAll(LABELABLE).length === 1) {
    warn(
      "unlabelled",
      "FormGroup rendered a label with no `htmlFor` beside a single control, so the label names " +
        "nothing. Pass `htmlFor` with the control's id. Omit it only around a composite control, " +
        "such as CheckboxGroup or fieldset-style content, where there is no one control to name.",
    );
  }
}

/** Whether anything in the group points `aria-describedby` at this id. */
function describedBy(root: HTMLElement, id: string): boolean {
  if (!id) return false;
  for (const el of root.querySelectorAll("[aria-describedby]"))
    if (el.getAttribute("aria-describedby")?.split(/\s+/).includes(id)) return true;
  return false;
}

function warn(kind: string, message: string): void {
  if (warned.has(kind)) return;
  warned.add(kind);
  console.warn(`[@codesweep-ai/ui] ${message}`);
}
