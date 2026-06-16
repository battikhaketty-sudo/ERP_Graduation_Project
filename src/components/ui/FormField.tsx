import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  required?: boolean;
};

export function FormField({ label, children, required }: FormFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-hr-text">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
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
