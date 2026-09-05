import api from "./api";
import {
  assertSuccess,
  unwrapData,
  unwrapEntity,
  unwrapPage,
  unwrapPagedMeta,
} from "../utils/apiResponse";

export type EnumOption = {
  id: number;
  name: string;
  apiName?: string;
};

export type WorkingSchedule = {
  id: string;
  name: string;
  periodsCount: number;
  workingDaysCount: number;
  totalWorkingHoursWeekly: number;
  averageWorkingHoursPerDay: number;
};

export type WorkingPeriod = {
  id?: string;
  name: string;
  day: number;
  dayName: string;
  period: number;
  periodName: string;
  timeFrom: string;
  timeTo: string;
};

export type WorkingScheduleDetail = WorkingSchedule & {
  periods: WorkingPeriod[];
};

export type WorkingPeriodInput = {
  name: string;
  day: number;
  period: number;
  timeFrom: string;
  timeTo: string;
};

/** .NET DayOfWeek: Sunday=0 … Saturday=6. GET periods send these as strings. */
const DAY_ALIAS_TO_ID: Record<string, number> = {
  sunday: 0,
  sun: 0,
  الأحد: 0,
  "0": 0,
  monday: 1,
  mon: 1,
  الإثنين: 1,
  الاثنين: 1,
  "1": 1,
  tuesday: 2,
  tue: 2,
  الثلاثاء: 2,
  "2": 2,
  wednesday: 3,
  wed: 3,
  الأربعاء: 3,
  "3": 3,
  thursday: 4,
  thu: 4,
  الخميس: 4,
  "4": 4,
  friday: 5,
  fri: 5,
  الجمعة: 5,
  "5": 5,
  saturday: 6,
  sat: 6,
  السبت: 6,
  "6": 6,
};

const PERIOD_ALIAS_TO_ID: Record<string, number> = {
  working: 1,
  work: 1,
  عمل: 1,
  "1": 1,
  break: 2,
  راحة: 2,
  "2": 2,
};

const readEnumSource = (value: unknown): unknown => {
  if (Array.isArray(value)) return readEnumSource(value[0]);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return obj.id ?? obj.Id ?? obj.value ?? obj.Value ?? obj.name ?? obj.Name;
  }
  return value;
};

const readAliasKey = (value: unknown) => String(value ?? "").trim().toLowerCase();

const isNumericEnumId = (value: unknown) => {
  if (typeof value === "number") return Number.isInteger(value);
  return typeof value === "string" && /^-?\d+$/.test(value.trim());
};

export const resolveDayOfWeek = (value: unknown): number => {
  const source = readEnumSource(value);
  if (typeof source === "number" && Number.isInteger(source) && source >= 0 && source <= 6) {
    return source;
  }
  if (isNumericEnumId(source)) {
    const numeric = Number(source);
    if (numeric >= 0 && numeric <= 6) return numeric;
  }
  return DAY_ALIAS_TO_ID[readAliasKey(source)] ?? 0;
};

export const resolvePeriodType = (value: unknown, fallback = 1): number => {
  const source = readEnumSource(value);
  if (typeof source === "number" && (source === 1 || source === 2)) {
    return source;
  }
  if (isNumericEnumId(source)) {
    const numeric = Number(source);
    if (numeric === 1 || numeric === 2) return numeric;
  }
  return PERIOD_ALIAS_TO_ID[readAliasKey(source)] ?? fallback;
};

const FALLBACK_DAYS: EnumOption[] = [
  { id: 0, name: "Sunday", apiName: "Sunday" },
  { id: 1, name: "Monday", apiName: "Monday" },
  { id: 2, name: "Tuesday", apiName: "Tuesday" },
  { id: 3, name: "Wednesday", apiName: "Wednesday" },
  { id: 4, name: "Thursday", apiName: "Thursday" },
  { id: 5, name: "Friday", apiName: "Friday" },
  { id: 6, name: "Saturday", apiName: "Saturday" },
];

const FALLBACK_PERIODS: EnumOption[] = [
  { id: 1, name: "Working", apiName: "Working" },
  { id: 2, name: "Break", apiName: "Break" },
];

const uniqueEnumOptions = (options: EnumOption[]) => {
  const seen = new Map<number, EnumOption>();
  for (const option of options) {
    if (!Number.isFinite(option.id) || seen.has(option.id)) continue;
    seen.set(option.id, option);
  }
  return [...seen.values()].sort((left, right) => left.id - right.id);
};

const normalizeEnum = (item: Record<string, unknown>): EnumOption => {
  const apiName = String(item.name ?? item.Name ?? item.label ?? item.Label ?? "");
  const rawId = readEnumSource(item.id ?? item.Id ?? item.value ?? item.Value ?? apiName);
  const fromName =
    DAY_ALIAS_TO_ID[readAliasKey(apiName)] ??
    PERIOD_ALIAS_TO_ID[readAliasKey(apiName)] ??
    DAY_ALIAS_TO_ID[readAliasKey(rawId)] ??
    PERIOD_ALIAS_TO_ID[readAliasKey(rawId)];
  const id = isNumericEnumId(rawId) ? Number(rawId) : (fromName ?? Number.NaN);

  return {
    id,
    name: apiName || String(rawId ?? ""),
    apiName: apiName || String(rawId ?? ""),
  };
};

const normalizeSchedule = (item: Record<string, unknown>): WorkingSchedule => ({
  id: String(item.id ?? crypto.randomUUID()),
  name: String(item.name ?? "بدون اسم"),
  periodsCount: Number(item.periodsCount ?? 0),
  workingDaysCount: Number(item.workingDaysCount ?? 0),
  totalWorkingHoursWeekly: Number(item.totalWorkingHoursWeekly ?? 0),
  averageWorkingHoursPerDay: Number(item.averageWorkingHoursPerDay ?? 0),
});

const normalizePeriod = (item: Record<string, unknown>): WorkingPeriod => {
  const rawDay = item.day ?? item.Day ?? item.dayName ?? item.DayName;
  const rawPeriod = item.period ?? item.Period ?? item.periodName ?? item.PeriodName;
  const day = resolveDayOfWeek(rawDay);
  const period = resolvePeriodType(rawPeriod);
  return {
    id: String(item.id ?? item.Id ?? ""),
    name: String(item.name ?? item.Name ?? ""),
    day,
    dayName: String(readEnumSource(rawDay) ?? ""),
    period,
    periodName: String(readEnumSource(rawPeriod) ?? ""),
    timeFrom: String(item.timeFrom ?? item.TimeFrom ?? ""),
    timeTo: String(item.timeTo ?? item.TimeTo ?? ""),
  };
};

export const getWorkingSchedules = async (
  filters: {
    page?: number;
    limit?: number;
    name?: string;
  } = {},
) => {
  const { page = 1, limit = 10, name } = filters;
  const params: Record<string, string | number> = { Page: page, Limit: limit };
  if (name?.trim()) params.Name = name.trim();

  const res = await api.get("/working-schedules", { params });
  const records = unwrapPage<Record<string, unknown>>(res.data).map(normalizeSchedule);
  const meta = unwrapPagedMeta(res.data);

  return { records, meta };
};

export const getWorkingScheduleById = async (id: string) => {
  const res = await api.get(`/working-schedules/${id}`);
  const data = unwrapEntity<Record<string, unknown>>(res.data);
  const periods = Array.isArray(data.periods)
    ? data.periods.map((period) =>
        normalizePeriod(period as Record<string, unknown>),
      )
    : [];

  return {
    ...normalizeSchedule(data),
    periods,
  } satisfies WorkingScheduleDetail;
};

export const addWorkingSchedule = async (data: {
  name: string;
  periods: WorkingPeriodInput[];
}) => {
  const res = await api.post("/working-schedules", data);
  assertSuccess(res.data);
  return res.data;
};

export const updateWorkingSchedule = async (
  id: string,
  data: { name: string },
) => {
  const res = await api.put(`/working-schedules/${id}`, data);
  assertSuccess(res.data);
  return res.data;
};

export const deleteWorkingSchedule = async (id: string) => {
  const res = await api.delete(`/working-schedules/${id}`);
  assertSuccess(res.data);
  return res.data;
};

export const addWorkingPeriod = async (
  scheduleId: string,
  data: WorkingPeriodInput,
) => {
  const res = await api.post(`/working-schedules/${scheduleId}/periods`, data);
  assertSuccess(res.data);
  return res.data;
};

export const updateWorkingPeriod = async (
  scheduleId: string,
  periodId: string,
  data: WorkingPeriodInput,
) => {
  const res = await api.put(
    `/working-schedules/${scheduleId}/periods/${periodId}`,
    data,
  );
  assertSuccess(res.data);
  return res.data;
};

export const deleteWorkingPeriod = async (
  scheduleId: string,
  periodId: string,
) => {
  const res = await api.delete(
    `/working-schedules/${scheduleId}/periods/${periodId}`,
  );
  assertSuccess(res.data);
  return res.data;
};

const unwrapEnumList = (payload: unknown) => {
  const fromArray = (rows: unknown[]) =>
    rows
      .map((item) => normalizeEnum(item as Record<string, unknown>))
      .filter((item) => Number.isFinite(item.id));

  if (Array.isArray(payload)) {
    return fromArray(payload);
  }
  const data = unwrapData<unknown>(payload);
  if (Array.isArray(data)) {
    return fromArray(data);
  }
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["page", "Page", "items", "Items"]) {
      const rows = obj[key];
      if (Array.isArray(rows)) return fromArray(rows);
    }
  }
  return [];
};

export const getPeriodTypes = async () => {
  try {
    const res = await api.get("/constants/period-types");
    const periods = uniqueEnumOptions(unwrapEnumList(res.data)).filter(
      (item) => item.id === 1 || item.id === 2,
    );
    return periods.length === 2 ? periods : FALLBACK_PERIODS;
  } catch {
    return FALLBACK_PERIODS;
  }
};

export const getDaysOfWeek = async () => {
  try {
    const res = await api.get("/constants/days-of-week");
    const days = uniqueEnumOptions(unwrapEnumList(res.data)).filter(
      (item) => item.id >= 0 && item.id <= 6,
    );
    return days.length === 7 ? days : FALLBACK_DAYS;
  } catch {
    return FALLBACK_DAYS;
  }
};

export const apiTimeToLabel = (value: string) => {
  if (!value) return "09:00 AM";
  const parts = value.split(":");
  if (parts.length < 2) return value;

  let hours = Number(parts[0]);
  const minutes = parts[1]?.slice(0, 2) ?? "00";
  if (Number.isNaN(hours)) return value;

  const meridiem = hours >= 12 ? "PM" : "AM";
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;

  return `${hours}:${minutes} ${meridiem}`;
};

export { apiTimeToInputValue } from "../utils/timeInput";

export const labelToApiTime = (value: string) => {
  const trimmed = value.trim();
  const meridiemMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (meridiemMatch) {
    let hours = Number(meridiemMatch[1]);
    const minutes = meridiemMatch[2];
    const meridiem = meridiemMatch[3].toUpperCase();

    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${minutes}:00`;
  }

  const twentyFourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (twentyFourMatch) {
    const hours = Number(twentyFourMatch[1]);
    const minutes = twentyFourMatch[2];
    const seconds = twentyFourMatch[3] ?? "00";

    if (!Number.isNaN(hours) && hours >= 0 && hours <= 23) {
      return `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
    }
  }

  return "08:00:00";
};

export const formatHoursLabel = (value: number, suffix = "ساعة") => {
  if (!value) return `0 ${suffix}`;
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(1));
  return `${rounded} ${suffix}`;
};
