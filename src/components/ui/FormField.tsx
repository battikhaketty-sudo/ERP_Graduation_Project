import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  htmlFor?: string;
};

export function FormField({
  label,
  children,
  required,
  hint,
  error,
  htmlFor,
}: FormFieldProps) {
  return (
    <div
      className="mb-4 text-start"
      data-field-error={error ? "true" : undefined}
    >
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-hr-text">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="mt-1 text-xs text-hr-muted">{hint}</p>}
    </div>
  );
}

export function StepBadge({ step }: { step: number }) {
  return (
    <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-accent text-sm font-bold text-white">
      {step}
    </span>
  );
}
