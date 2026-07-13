import { forwardRef, type TextareaHTMLAttributes } from "react";
import { FormField } from "./FormField";
import { fieldInputClass } from "./formStyles";

type FormTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValueBlur?: () => void;
  error?: string;
  hint?: string;
  required?: boolean;
  showCount?: boolean;
  maxLength?: number;
};

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  function FormTextarea(
    {
      id,
      label,
      value,
      onChange,
      onValueBlur,
      error,
      hint,
      required,
      showCount,
      maxLength,
      className,
      ...rest
    },
    ref,
  ) {
    const inputId = id ?? rest.name;
    const hasError = Boolean(error);
    const countHint =
      showCount && maxLength
        ? `${value.length}/${maxLength}`
        : showCount
          ? String(value.length)
          : undefined;

    return (
      <FormField
        label={label}
        required={required}
        error={error}
        hint={hint ?? countHint}
        htmlFor={inputId}
      >
        <textarea
          {...rest}
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          aria-invalid={hasError || undefined}
          className={[fieldInputClass(hasError, "textarea"), className].filter(Boolean).join(" ")}
          onChange={(event) => onChange(event.target.value)}
          onBlur={(event) => {
            rest.onBlur?.(event);
            onValueBlur?.();
          }}
        />
      </FormField>
    );
  },
);
