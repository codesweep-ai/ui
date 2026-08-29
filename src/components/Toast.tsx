import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { cn } from "../lib/cn";
import type { ToastItem, ToastVariant } from "../lib/toast";

const ICONS: Record<ToastVariant, typeof CheckCircle> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

// Border-left accent per variant (drives the colored stripe on the leading edge).
const BORDER: Record<ToastVariant, string> = {
  success: "cs-component-toast-4",
  warning: "cs-component-toast-5",
  error: "cs-component-toast-6",
  info: "cs-component-toast-7",
};

const ICON_COLOR: Record<ToastVariant, string> = {
  success: "cs-component-toast-8",
  warning: "cs-component-toast-9",
  error: "cs-component-toast-10",
  info: "cs-component-toast-11",
};

export interface ToastProps {
  item: ToastItem;
  onDismiss: () => void;
  className?: string;
}

/**
 * Single toast. Visual only — orchestration (auto-dismiss, stacking) lives in
 * `ToastContainer`. `role="alert"` for warning/error (assertive), `role="status"`
 * for success/info (polite).
 */
function ToastImpl({ item, onDismiss, className }: ToastProps) {
  const Icon = ICONS[item.variant];
  const isAlert = item.variant === "warning" || item.variant === "error";
  return (
    <div
      data-component="Toast"
      data-variant={item.variant}
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      className={cn(
        "cs-toast-enter cs-component-toast-19 ",
        "cs-component-toast-20 ",
        "cs-component-toast-21 ",
        BORDER[item.variant],
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "cs-component-toast-23 ",
          ICON_COLOR[item.variant],
        )}
      />
      <div className="cs-component-toast-24 ">
        {item.message}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="cs-component-toast-27 "
      >
        <X className="cs-component-toast-28 " />
      </button>
    </div>
  );
}

export const Toast = forwardRefToRoot<HTMLDivElement, ToastProps>(ToastImpl);
