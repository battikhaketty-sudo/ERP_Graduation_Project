import { useCallback, useMemo, useState } from "react";

export type FieldValidator<T extends object> = (
  value: unknown,
  values: T,
) => string | undefined;

type Validators<T extends object> = Partial<Record<keyof T & string, FieldValidator<T>>>;

export function useFormValidation<T extends object>(values: T, validators: Validators<T>) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  const runValidator = useCallback(
    (field: keyof T & string) => {
      const validator = validators[field];
      if (!validator) return undefined;
      return validator(values[field], values);
    },
    [validators, values],
  );

  const getError = useCallback(
    (field: keyof T & string) => {
      const error = runValidator(field);
      if (!error) return undefined;
      if (touched[field] || submitted) return error;
      return undefined;
    },
    [runValidator, submitted, touched],
  );

  const touch = useCallback((field: keyof T & string) => {
    setTouched((current) => ({ ...current, [field]: true }));
  }, []);

  const touchAll = useCallback(() => {
    const next: Record<string, boolean> = {};
    Object.keys(validators).forEach((field) => {
      next[field] = true;
    });
    setTouched(next);
  }, [validators]);

  const validateAll = useCallback(() => {
    setSubmitted(true);
    touchAll();
    return Object.keys(validators).every((field) => !runValidator(field as keyof T & string));
  }, [runValidator, touchAll, validators]);

  const reset = useCallback(() => {
    setTouched({});
    setSubmitted(false);
  }, []);

  const clearField = useCallback((field: keyof T & string) => {
    setTouched((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: false };
    });
    setSubmitted(false);
  }, []);

  const isValid = useMemo(
    () =>
      Object.keys(validators).every((field) => !runValidator(field as keyof T & string)),
    [runValidator, validators],
  );

  return {
    getError,
    touch,
    validateAll,
    reset,
    clearField,
    isValid,
    submitted,
  };
}
