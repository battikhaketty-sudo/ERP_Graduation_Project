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

  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

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

export const isoToDateTimeInput = (value?: string, fallback = "") => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
};

export const dateTimeInputToIso = (value: string) => {
  if (!value.trim()) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString();
};

export const addHoursToDateTimeInput = (value: string, hours: number) => {
  if (!value.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  return isoToDateTimeInput(date.toISOString());
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

export const defaultDateTimeInput = (hours = 9, minutes = 0) => {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setHours(hours, minutes, 0, 0);
  return isoToDateTimeInput(date.toISOString());
};
