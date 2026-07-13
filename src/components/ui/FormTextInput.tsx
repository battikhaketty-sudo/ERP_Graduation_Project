import { forwardRef, type InputHTMLAttributes } from "react";
import { FormField } from "./FormField";
import { fieldInputClass } from "./formStyles";

type FormTextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onValueBlur?: () => void;
  error?: string;
  hint?: string;
  required?: boolean;
};

export const FormTextInput = forwardRef<HTMLInputElement, FormTextInputProps>(
  function FormTextInput(
    {
      id,
      label,
      value,
      onChange,
      onValueBlur,
      error,
      hint,
      required,
      className,
      readOnly,
      disabled,
      ...rest
    },
    ref,
  ) {
    const inputId = id ?? rest.name;
    const hasError = Boolean(error);

    return (
      <FormField
        label={label}
        required={required}
        error={error}
        hint={hint}
        htmlFor={inputId}
      >
        <input
          {...rest}
          ref={ref}
          id={inputId}
          value={value}
          readOnly={readOnly}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          className={[
            fieldInputClass(hasError, readOnly ? "readonly" : "input"),
            className,
          ]
            .filter(Boolean)
            .join(" ")}
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
