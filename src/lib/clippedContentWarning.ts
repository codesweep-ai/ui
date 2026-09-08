const warned = new Set<string>();
let pending: HTMLElement[] = [];
let scheduled = false;

/**
 * Warn, once per component, when a component sits inside a box that clips its
 * content without scrolling it.
 *
 * A consumer embeds a component in their own bounded layout, the content
 * overflows an ancestor whose `overflow` is neither visible nor scrollable,
 * and the rows below the fold are reachable by `scrollIntoView` and by nothing
 * a user does. Nothing errors and nothing looks wrong: the content is simply
 * not there. This repository has met it twice, and both times only its own
 * visual gate could see it, because `scripts/visual-baseline.mjs` walks the
 * document and asserts the same predicate this file does.
 *
 * Guarded on `process.env.NODE_ENV` rather than `import.meta.env.DEV`. The
 * latter is replaced when this package is built, which would leave the check
 * dead in every published copy. The former is replaced by the consumer's own
 * bundler, so it survives into their development build and is stripped from
 * their production one.
 */
export function warnWhenClipped(node: unknown): void {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") return;
  if (typeof HTMLElement === "undefined" || !(node instanceof HTMLElement)) return;
  if (typeof requestAnimationFrame === "undefined") return;

  // A ref runs during commit, before the browser has laid the page out, when
  // every box reads zero. Zero is not a measurement, and acting on one is what
  // sent an earlier correction pass in Tooltip into an infinite loop, so the
  // check waits for a frame that has one.
  pending.push(node);
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scheduled = false;
      const nodes = pending;
      pending = [];
      // One pass over everything that mounted this frame, so a page of
      // components forces one layout rather than one each.
      for (const element of nodes) report(element);
    });
  });
}

/** The nearest box that clips this node's content instead of scrolling it. */
function clippingAncestor(node: HTMLElement): HTMLElement | null {
  for (let el: HTMLElement | null = node; el; el = el.parentElement) {
    // The document is not a clipping box: the window scrolls it.
    if (el === document.documentElement || el === document.body) return null;
    // A box showing almost nothing is collapsed rather than clipping. A
    // CardGroup soloing one card leaves its siblings a couple of pixels tall,
    // which is deliberate and denies nobody anything.
    if (el.clientHeight < 8) continue;
    // A couple of pixels is rounding, not hidden content.
    if (el.scrollHeight - el.clientHeight <= 2) continue;
    const { overflowY } = getComputedStyle(el);
    // `visible` does not clip: the content spills out and an ancestor scrolls
    // it. Only a box that clips without scrolling loses it.
    if (overflowY === "visible" || /auto|scroll|overlay/.test(overflowY)) continue;
    return el;
  }
  return null;
}

function report(node: HTMLElement): void {
  if (!node.isConnected) return;
  const name = node.dataset.component;
  if (!name || warned.has(name)) return;

  const box = clippingAncestor(node);
  if (!box) return;

  warned.add(name);
  const label = box.getAttribute("data-component") ?? box.tagName.toLowerCase();
  const part = box.getAttribute("data-part");
  console.warn(
    `[@codesweep-ai/ui] ${name} is inside a ${label}${part ? `[${part}]` : ""} that hides ` +
      `${box.scrollHeight - box.clientHeight}px of content. That box has a bounded height and ` +
      "an overflow that clips without scrolling, so the content past its edge is reachable by " +
      "scrollIntoView and by nothing a user does. Give it `overflow-y: auto`, or let it size to " +
      "its content and hand the scrolling to an ancestor.",
  );
}
