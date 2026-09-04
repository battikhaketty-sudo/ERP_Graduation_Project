import { expandTwoDigitYear, toIsoDate } from "./manualDate";
import {
  apiUtcToSyriaDateTimeInput,
  nowSyriaDateTimeInput,
  syriaDateTimeInputToUtcIso,
} from "./syriaTime";

export const apiTimeToInputValue = (value: string, fallback = "09:00") => {
  if (!value) return fallback;

  const trimmed = value.trim();
  const twentyFourMatch = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (twentyFourMatch) {
    return `${String(Number(twentyFourMatch[1])).padStart(2, "0")}:${twentyFourMatch[2]}`;
  }

  const meridiemMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1]);
    const minutes = meridiemMatch[2];
    const meridiem = meridiemMatch[3].toUpperCase();

    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  return fallback;
};

export const isoToTimeInput = (value?: string, fallback = "09:00") => {
  if (!value) return fallback;
  return apiTimeToInputValue(value, fallback);
};

export const timeInputToIso = (time: string, baseDate = new Date()) => {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return baseDate.toISOString();

  const date = new Date(baseDate);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date.toISOString();
};

export const timeInputToMinutes = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
};

const padDatePart = (value: number) => String(value).padStart(2, "0");

/** Visible attendance format: dd/MM/yyyy HH:mm */
export const formatDateTimeDisplay = (localValue?: string | null): string => {
  if (!localValue?.trim()) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(localValue.trim());
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
};

const toLocalDateTimeValue = (
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
): string | null => {
  const isoDate = toIsoDate(year, month, day);
  if (!isoDate) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${isoDate}T${padDatePart(hours)}:${padDatePart(minutes)}`;
};

/**
 * Parse typed datetime into YYYY-MM-DDTHH:mm (local).
 * Prefers dd/MM/yyyy HH:mm — e.g. 04/09/2026 09:00.
 */
export const parseManualDateTime = (raw: string, now = new Date()): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const isoLocal = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})/.exec(trimmed);
  if (isoLocal) {
    return toLocalDateTimeValue(
      Number(isoLocal[1]),
      Number(isoLocal[2]),
      Number(isoLocal[3]),
      Number(isoLocal[4]),
      Number(isoLocal[5]),
    );
  }

  const display =
    /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})[ T]+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(
      trimmed,
    );
  if (display) {
    const day = Number(display[1]);
    const month = Number(display[2]);
    let year = Number(display[3]);
    if (display[3].length === 2) year = expandTwoDigitYear(year, now);
    let hours = Number(display[4]);
    const minutes = Number(display[5]);
    const meridiem = display[6]?.toUpperCase();
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return toLocalDateTimeValue(year, month, day, hours, minutes);
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 12) {
    return toLocalDateTimeValue(
      Number(digits.slice(4, 8)),
      Number(digits.slice(2, 4)),
      Number(digits.slice(0, 2)),
      Number(digits.slice(8, 10)),
      Number(digits.slice(10, 12)),
    );
  }

  return null;
};

export const sanitizeDateTimeTyping = (value: string) =>
  value.replace(/[^\d/.\-: TAPMapm]/g, "").slice(0, 22);

export const isLocalDateTimeInRange = (
  value: string,
  min?: string,
  max?: string,
): boolean => {
  if (min && value < min) return false;
  if (max && value > max) return false;
  return true;
};

export const isoToDateTimeInput = (value?: string, fallback = "") =>
  apiUtcToSyriaDateTimeInput(value, fallback);

export const dateTimeInputToIso = (value: string) => {
  if (!value.trim()) return "";
  return syriaDateTimeInputToUtcIso(value);
};

export const addHoursToDateTimeInput = (value: string, hours: number) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return "";
  const next = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
    ) +
      hours * 60 * 60 * 1000,
  );
  return `${next.getUTCFullYear()}-${padDatePart(next.getUTCMonth() + 1)}-${padDatePart(next.getUTCDate())}T${padDatePart(next.getUTCHours())}:${padDatePart(next.getUTCMinutes())}`;
};

const MAX_ATTENDANCE_SHIFT_MS = 24 * 60 * 60 * 1000;

export type AttendanceShiftError = "order" | "maxShift";

/** Checkout, if set, must be after check-in and within 24 hours. */
export const validateAttendanceShift = (
  checkinInput: string,
  checkoutInput?: string,
): AttendanceShiftError | null => {
  if (!checkoutInput?.trim()) return null;

  const startIso = dateTimeInputToIso(checkinInput);
  const endIso = dateTimeInputToIso(checkoutInput);
  if (!startIso || !endIso) return "order";

  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (end <= start) return "order";
  if (end - start > MAX_ATTENDANCE_SHIFT_MS) return "maxShift";
  return null;
};

export const defaultDateTimeInput = (hours = 9, minutes = 0) =>
  nowSyriaDateTimeInput(hours, minutes);
