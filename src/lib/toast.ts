// Imperative toast API. Components subscribe; `toast.success(...)` etc. emit.
// `<ToastContainer/>` is the host — mount it once at the app root. Everything
// else stays decoupled and can call `toast.x(...)` from anywhere.

export type ToastVariant = "success" | "warning" | "error" | "info";

export interface ToastOptions {
  /** ms before auto-dismiss; pass `null` to disable. Default 4000. */
  duration?: number | null;
  /** When true: render with `role="alert"` and don't auto-dismiss. */
  important?: boolean;
}

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  /** Effective duration after applying `important` (which forces null). */
  duration: number | null;
  important: boolean;
}

type Listener = (toasts: ToastItem[]) => void;

const DEFAULT_DURATION = 4000;
const listeners = new Set<Listener>();
let items: ToastItem[] = [];
let counter = 0;
const nextId = () => `cs-toast-${++counter}`;

function emit(): void {
  for (const l of listeners) l(items);
}

function show(variant: ToastVariant, message: string, opts: ToastOptions = {}): string {
  const id = nextId();
  const important = !!opts.important;
  // `important` forces no auto-dismiss; otherwise honor the option (null disables).
  const duration = important
    ? null
    : opts.duration === null
      ? null
      : (opts.duration ?? DEFAULT_DURATION);
  items = [...items, { id, variant, message, duration, important }];
  emit();
  return id;
}

export const toast = {
  success: (message: string, opts?: ToastOptions) => show("success", message, opts),
  warning: (message: string, opts?: ToastOptions) => show("warning", message, opts),
  error: (message: string, opts?: ToastOptions) => show("error", message, opts),
  info: (message: string, opts?: ToastOptions) => show("info", message, opts),
  /** Dismiss a single toast by id. */
  dismiss: (id: string): void => {
    items = items.filter((t) => t.id !== id);
    emit();
  },
  /** Clear all toasts. */
  clear: (): void => {
    items = [];
    emit();
  },
};

/** Subscribe to toast updates. Calls back immediately with the current list. */
export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}
