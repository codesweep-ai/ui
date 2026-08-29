import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { cn } from "../lib/cn";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
  count?: number;
  onPressedChange?: (pressed: boolean) => void;
  children: React.ReactNode;
}

function ChipImpl({
  pressed = false,
  count,
  onPressedChange,
  onClick,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      {...props}
      data-component="Chip"
      type={type}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onPressedChange?.(!pressed);
      }}
      className={cn(
        "cs-component-chip-1",
        pressed ? "cs-component-chip-2" : "cs-component-chip-3",
        disabled && "cs-component-chip-4",
        className,
      )}
    >
      <span data-chip-label="">{children}</span>
      {count != null && " "}
      {count != null && <span className="cs-component-chip-5">{count}</span>}
    </button>
  );
}

export const Chip = forwardRefToRoot<HTMLButtonElement, ChipProps>(ChipImpl);
