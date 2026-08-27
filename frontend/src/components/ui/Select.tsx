"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

// The single dropdown control for the admin, organizer and auditor consoles.
//
// It stays a native <select>: keyboard navigation, type-ahead, screen-reader
// semantics and the mobile OS picker all come for free, and none of those were
// worth re-implementing. The only thing suppressed is the OS-drawn arrow, which
// is the one part that looked different on every platform — replaced by a
// token-coloured chevron so the control reads the same everywhere.
//
// Ref forwarding is required, not incidental: the admin forms bind these with
// react-hook-form's {...register(...)}, which attaches through the ref.

type SelectSize = "sm" | "md";

// pr- leaves room for the chevron so a long option label cannot run under it.
const SIZE_CLASSES: Record<SelectSize, string> = {
  sm: "h-9 pl-3 pr-9 text-xs",
  md: "h-11 pl-3 pr-10 text-sm",
};

const CHEVRON_CLASSES: Record<SelectSize, string> = {
  sm: "right-3 h-3.5 w-3.5",
  md: "right-3.5 h-4 w-4",
};

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  selectSize?: SelectSize;
  /** Renders the danger border for a failed validation, without owning the message. */
  invalid?: boolean;
  /** Applied to the positioning wrapper — use for width/margin, not for the control's own look. */
  wrapperClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { selectSize = "sm", invalid = false, wrapperClassName = "", className = "", disabled, ...props },
  ref,
) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={`w-full cursor-pointer appearance-none rounded-lg border bg-surface-white font-semibold text-text-primary outline-none transition-colors focus:ring-1 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-text-secondary ${
          invalid
            ? "border-danger focus:border-danger focus:ring-danger/20"
            : "border-border-subtle focus:border-secondary focus:ring-secondary/20"
        } ${SIZE_CLASSES[selectSize]} ${className}`}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-text-secondary ${
          CHEVRON_CLASSES[selectSize]
        } ${disabled ? "opacity-40" : ""}`}
      />
    </div>
  );
});

export default Select;
