/** Manual date entry helpers — prefers day-first (DDMMYYYY / DD/MM/YYYY). */

const pad = (value: number) => String(value).padStart(2, "0");

/** Format YYYY-MM-DD as DD/MM/YYYY for display. */
export const formatDateDisplay = (iso?: string | null): string => {
  if (!iso?.trim()) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
};

export const toIsoDate = (year: number, month: number, day: number): string | null => {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
};

const expandTwoDigitYear = (yy: number, now = new Date()) => {
  const current = now.getFullYear();
  const century = Math.floor(current / 100) * 100;
  let year = century + yy;
  // If more than 5 years in the future, treat as previous century.
  if (year > current + 5) year -= 100;
  return year;
};

/**
 * Parse a user-typed date into YYYY-MM-DD.
 * Supports:
 * - 22032023 (DDMMYYYY)
 * - 220323 (DDMMYY)
 * - 22/03/2023, 22-03-2023, 22.03.2023
 * - 2023-03-22 (ISO)
 */
export const parseManualDate = (
  raw: string,
  now = new Date(),
): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const separated =
    /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/.exec(trimmed);
  if (separated) {
    const day = Number(separated[1]);
    const month = Number(separated[2]);
    let year = Number(separated[3]);
    if (separated[3].length === 2) year = expandTwoDigitYear(year, now);
    return toIsoDate(year, month, day);
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 8) {
    // DDMMYYYY — e.g. 22032023 → 22/03/2023
    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));
    return toIsoDate(year, month, day);
  }
  if (digits.length === 6) {
    // DDMMYY — e.g. 220323
    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = expandTwoDigitYear(Number(digits.slice(4, 6)), now);
    return toIsoDate(year, month, day);
  }

  return null;
};

/** Keep only characters useful while typing a date. */
export const sanitizeDateTyping = (value: string) =>
  value.replace(/[^\d/.\-]/g, "").slice(0, 10);

export const isIsoInRange = (
  iso: string,
  min?: string,
  max?: string,
): boolean => {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
};
