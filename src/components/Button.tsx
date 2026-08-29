import { forwardRefToRoot } from "../lib/forwardRefToRoot";
import { Children, cloneElement, isValidElement, type ReactElement } from "react";
import { cn } from "../lib/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success" | "warning";
  size?: "sm" | "md";
  /** Merge button styling and behaviour onto the single child element. */
  asChild?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  primary:
    "cs-component-button-10 ",
  secondary:
    "cs-component-button-11 ",
  danger:
    "cs-component-button-12 ",
  ghost:
    "cs-component-button-13 ",
  success:
    "cs-component-button-14 ",
  warning:
    "cs-component-button-15 ",
};

const sizeStyles: Record<string, string> = {
  sm: "cs-component-button-16 ",
  md: "cs-component-button-17 ",
};

function ButtonImpl({
  variant = "primary",
  size = "md",
  className,
  children,
  asChild = false,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const mergedClassName = cn(
    "cs-component-button-22 ",
    "cs-component-button-23 ",
    "cs-component-button-24 ",
    "cs-component-button-25 ",
    "cs-component-button-26",
    variantStyles[variant],
    sizeStyles[size],
    disabled && "cs-component-button-27 ",
    className,
  );

  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child)) throw new Error("Button asChild requires one React element");
    const element = child as ReactElement<{
      className?: string;
      "data-component"?: string;
      "aria-disabled"?: boolean;
    }>;
    return cloneElement(element, {
      ...props,
      "data-component": "Button",
      "aria-disabled": disabled || undefined,
      className: cn(mergedClassName, element.props.className),
    });
  }

  return (
    <button
      data-component="Button"
      type={type}
      disabled={disabled}
      className={mergedClassName}
      {...props}
    >
      {children}
    </button>
  );
}

export const Button = forwardRefToRoot<HTMLElement, ButtonProps>(ButtonImpl);
