/** Backend sends UTC with no timezone. Display and edit in Syria (UTC+3). */
export const SYRIA_OFFSET_HOURS = 3;
export const SYRIA_OFFSET_MS = SYRIA_OFFSET_HOURS * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, "0");

/** True when the value has a clock (hours), not a calendar date only. */
export const hasClockTime = (value?: string | null): boolean =>
  /T\d{2}:\d{2}|[ T]\d{2}:\d{2}/.test(value?.trim() ?? "");

export type SyriaDateParts = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** Parse an API timestamp as UTC even when `Z` is missing. */
export const parseApiUtcDate = (value?: string | null): Date | null => {
  if (!value?.trim()) return null;
  const trimmed = value.trim();

  if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const withT = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const date = new Date(/[zZ]$/.test(withT) ? withT : `${withT}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toSyriaParts = (date: Date): SyriaDateParts => {
  const shifted = new Date(date.getTime() + SYRIA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
    seconds: shifted.getUTCSeconds(),
  };
};

export const formatSyriaDate = (value?: string | null, fallback = ""): string => {
  if (!value?.trim()) return fallback;
  if (!hasClockTime(value)) {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    return match?.[1] ?? fallback;
  }
  const utc = parseApiUtcDate(value);
  if (!utc) return fallback;
  const parts = toSyriaParts(utc);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
};

export const formatSyriaDateTime = (
  value?: string | null,
  fallback = "-",
): string => {
  const utc = parseApiUtcDate(value);
  if (!utc) return value?.trim() || fallback;
  const parts = toSyriaParts(utc);
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year} ${pad(parts.hours)}:${pad(parts.minutes)}`;
};

export const apiUtcToSyriaDateTimeInput = (
  value?: string | null,
  fallback = "",
): string => {
  const utc = parseApiUtcDate(value);
  if (!utc) return fallback;
  const parts = toSyriaParts(utc);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hours)}:${pad(parts.minutes)}`;
};

export const nowSyriaDateInput = (): string => {
  const parts = toSyriaParts(new Date());
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
};

export const nowSyriaDateTimeInput = (hours?: number, minutes?: number): string => {
  const parts = toSyriaParts(new Date());
  const hh = hours ?? parts.hours;
  const mm = minutes ?? parts.minutes;
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(hh)}:${pad(mm)}`;
};

/** `YYYY-MM-DDTHH:mm` as Syria wall time → UTC ISO for the API. */
export const syriaDateTimeInputToUtcIso = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return "";
  const utcMs =
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
    ) - SYRIA_OFFSET_MS;
  return new Date(utcMs).toISOString();
};

/**
 * Syria calendar day start/end as UTC instants (midnight/end Syria − 3h).
 * Use for DateTime query ranges (attendance From/To), not date-only fields.
 */
export const syriaDateToUtcIso = (value: string, endOfDay = false): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return "";
  const utcMs =
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ) - SYRIA_OFFSET_MS;
  return new Date(utcMs).toISOString();
};

/** Date-only calendar day → UTC midnight/end. No ±3 (no clock hours). */
export const calendarDateToUtcIso = (value: string, endOfDay = false): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return "";
  return new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ),
  ).toISOString();
};
