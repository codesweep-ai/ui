---
name: ToastContainer
status: stable
since: 1.11.0
summary: Host for the toast system — mount once at the app root and call `toast.success(...)` etc. from anywhere.
keywords: [toast, notifications, snackbar, container, host, root, stacking,
           bottom-right, auto-dismiss, imperative api, pub sub, store,
           feedback layer]
use_when:
  - Adding the global toast / notification system to an app — mount once at root
avoid_when:
  - You need persistent / structural messaging — use an inline Alert / Banner
  - You need a blocking dialog — use a Modal
related: [Toast]
patterns: []
---

# ToastContainer

> Host for the toast system. Renders the stack of active toasts (bottom-right, 8px gap) and runs their auto-dismiss timers. Subscribes to the toast store on mount. Mount **once** at the app root; then anywhere in your app, call `toast.success(...)` / `.warning` / `.error` / `.info` to add a toast.

## Setup

```tsx
import { ToastContainer, toast } from "@codesweep-ai/ui";

export function App() {
  return (
    <>
      {/* your app */}
      <ToastContainer />
    </>
  );
}

// From anywhere:
toast.success("Saved");
toast.error("Couldn't save — retry", { important: true });
```

## Props

```typescript
interface ToastContainerProps {
  className?: string;
}
```

## Imperative API

```typescript
toast.success(message: string, opts?: ToastOptions): string  // returns id
toast.warning(message: string, opts?: ToastOptions): string
toast.error(message: string, opts?: ToastOptions): string
toast.info(message: string, opts?: ToastOptions): string
toast.dismiss(id: string): void
toast.clear(): void

interface ToastOptions {
  /** ms before auto-dismiss; `null` disables it. Default 4000. */
  duration?: number | null;
  /** Render with `role="alert"` and disable auto-dismiss. */
  important?: boolean;
}
```

## Layout

- Fixed at `bottom: var(--space-4)`, `right: var(--space-4)`, and `z-index: var(--z-toast)`.
- Vertical stack with `gap: var(--space-2)`.
- Container has `pointer-events: none` so it doesn't block clicks beneath it; each `<Toast>` re-enables pointer events on itself.

## Behavior

- Subscribes to the toast store on mount; re-renders on changes.
- Per-item auto-dismiss timers — only set for items with a finite `duration`.
- `important: true` → no auto-dismiss + `role="alert"`.
- The dismiss button on each toast removes it immediately.

## Accessibility

- The container itself is a passive layout element.
- Each toast carries its own role / aria-live (see [Toast](./Toast.md)).

## Traceability

Stack root: `data-component="ToastContainer"`.

## Compiling usage example

<!-- docs-compile -->
```tsx
import { ToastContainer, toast } from "@codesweep-ai/ui";
export function Example() { return <div><button onClick={() => toast.success("Saved")}>Save</button><ToastContainer /></div>; }
```
