/** Minimum age for an employee (years). */
export const MIN_EMPLOYEE_AGE = 16;
/** Maximum sensible age for an employee (years). */
export const MAX_EMPLOYEE_AGE = 100;

const pad = (value: number) => String(value).padStart(2, "0");

/** Format a local Date as YYYY-MM-DD for `<input type="date">`. */
export const toDateInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Normalize any common birth-date string to YYYY-MM-DD (local calendar day).
 * Returns "" when the value cannot be parsed.
 */
export const normalizeBirthDateValue = (value?: string | null): string => {
  if (!value?.trim()) return "";
  const trimmed = value.trim();

  const isoDay = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoDay) {
    const candidate = `${isoDay[1]}-${isoDay[2]}-${isoDay[3]}`;
    return parseLocalDate(candidate) ? candidate : "";
  }

  const slash = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(trimmed);
  if (slash) {
    const month = Number(slash[1]);
    const day = Number(slash[2]);
    const year = Number(slash[3]);
    // Prefer MDY when month looks like a month; otherwise try DMY.
    const mdy = parseLocalDate(
      `${year}-${pad(month)}-${pad(day)}`,
    );
    if (mdy && month <= 12) return toDateInputValue(mdy);
    const dmy = parseLocalDate(
      `${year}-${pad(day)}-${pad(month)}`,
    );
    if (dmy) return toDateInputValue(dmy);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return toDateInputValue(
    new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
  );
};

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC shift). */
export const parseLocalDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
};

export const getBirthDateBounds = (now = new Date()) => {
  const max = new Date(
    now.getFullYear() - MIN_EMPLOYEE_AGE,
    now.getMonth(),
    now.getDate(),
  );
  const min = new Date(
    now.getFullYear() - MAX_EMPLOYEE_AGE,
    now.getMonth(),
    now.getDate(),
  );
  return {
    min: toDateInputValue(min),
    max: toDateInputValue(max),
  };
};

export const getAgeYears = (birthDate: Date, onDate = new Date()) => {
  let age = onDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = onDate.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && onDate.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age;
};

export type BirthDateIssue =
  | "invalid"
  | "future"
  | "tooYoung"
  | "tooOld";

/** Returns an issue code when the birth date is not acceptable for an employee. */
export const getBirthDateIssue = (
  value: string | undefined | null,
  now = new Date(),
): BirthDateIssue | null => {
  if (!value?.trim()) return null;

  const normalized = normalizeBirthDateValue(value);
  const birth = normalized ? parseLocalDate(normalized) : null;
  if (!birth) return "invalid";

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (birth.getTime() > today.getTime()) return "future";

  const age = getAgeYears(birth, today);
  if (age < MIN_EMPLOYEE_AGE) return "tooYoung";
  if (age > MAX_EMPLOYEE_AGE) return "tooOld";
  return null;
};

/** Keep only birth dates that pass employee age rules. */
export const sanitizeEmployeeBirthDate = (
  value: string | undefined | null,
  now = new Date(),
): string => {
  const normalized = normalizeBirthDateValue(value);
  if (!normalized) return "";
  return getBirthDateIssue(normalized, now) ? "" : normalized;
};
