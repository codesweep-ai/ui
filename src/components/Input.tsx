import { forwardRef } from "react";
import { cn } from "../lib/cn";

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "prefix" | "type"
>;
type NativeTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "size" | "prefix"
>;

type InputType = "text" | "email" | "password" | "number" | "tel" | "url";

interface InputBaseProps {
  /** Visual size. Default: "md" */
  size?: "sm" | "md";
  /** Error state — paints the red border + ring. */
  error?: boolean;
  /** Inline content rendered inside the left edge (icon or short label). */
  prefix?: React.ReactNode;
  /** Inline content rendered inside the right edge (icon, unit suffix). */
  suffix?: React.ReactNode;
  /** Additional className on the wrapper. */
  className?: string;
}

interface SingleLineInputProps extends InputBaseProps, NativeInputProps {
  /** HTML type attribute. Default: "text". Ignored when `multiline` is true. */
  type?: InputType;
  multiline?: false;
}

interface MultilineInputProps extends InputBaseProps, NativeTextareaProps {
  /** Render a <textarea> instead of <input>. */
  multiline: true;
  /** Visible row count when multiline. Default: 3 */
  rows?: number;
}

type InputProps = SingleLineInputProps | MultilineInputProps;

const sizeFieldStyles: Record<"sm" | "md", string> = {
  sm: "cs-component-input-18",
  md: "cs-component-input-19",
};

/**
 * Standard text input. Use `multiline` for textareas. For search-specific
 * patterns use `SearchInput`. For label + helper + error composition, wrap
 * this in `FormGroup`.
 */
export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  function Input(props, ref) {
    const {
      size = "md",
      error = false,
      prefix,
      suffix,
      className,
      disabled,
      readOnly,
      ...rest
    } = props;

    const wrapperClass = cn(
      "cs-component-input-21 ",
      "cs-component-input-22 ",
      "cs-component-input-23",
      error
        ? "cs-component-input-24"
        : "cs-component-input-25 ",
      disabled && "cs-component-input-26 ",
      readOnly && "cs-component-input-27",
      className,
    );

    const fieldClass = cn(
      "cs-component-input-28 ",
      "cs-component-input-29 ",
      "cs-component-input-30",
      "cs-component-input-31",
      sizeFieldStyles[size],
      // Strip padding off the field when prefix/suffix already pad the wrapper.
      prefix && "cs-component-input-32",
      suffix && "cs-component-input-33",
    );

    const affixClass = cn(
      "cs-component-input-34 ",
      "cs-component-input-35",
      size === "sm" ? "cs-component-input-37" : "cs-component-input-38",
    );

    if (props.multiline) {
      const { multiline: _multi, rows = 3, ...textareaRest } = rest as MultilineInputProps;
      return (
        <div data-component="Input" data-multiline="true" className={wrapperClass}>
          {prefix && <span className={affixClass}>{prefix}</span>}
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows}
            disabled={disabled}
            readOnly={readOnly}
            className={cn(fieldClass, "cs-component-input-41 ")}
            {...(textareaRest as NativeTextareaProps)}
          />
          {suffix && <span className={affixClass}>{suffix}</span>}
        </div>
      );
    }

    const { type = "text", ...inputRest } = rest as SingleLineInputProps;
    return (
      <div data-component="Input" className={wrapperClass}>
        {prefix && <span className={affixClass}>{prefix}</span>}
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          type={type}
          disabled={disabled}
          readOnly={readOnly}
          className={fieldClass}
          {...(inputRest as NativeInputProps)}
        />
        {suffix && <span className={affixClass}>{suffix}</span>}
      </div>
    );
  },
);
