import api from "./api";
import { sortNewestFirst } from "../utils/listOrder";
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

const normalizeEnum = (item: Record<string, unknown>): EnumOption => ({
  id: Number(item.id ?? 0),
  name: String(item.name ?? ""),
});

const normalizeSchedule = (item: Record<string, unknown>): WorkingSchedule => ({
  id: String(item.id ?? crypto.randomUUID()),
  name: String(item.name ?? "بدون اسم"),
  periodsCount: Number(item.periodsCount ?? 0),
  workingDaysCount: Number(item.workingDaysCount ?? 0),
  totalWorkingHoursWeekly: Number(item.totalWorkingHoursWeekly ?? 0),
  averageWorkingHoursPerDay: Number(item.averageWorkingHoursPerDay ?? 0),
});

const normalizePeriod = (item: Record<string, unknown>): WorkingPeriod => ({
  id: String(item.id ?? ""),
  name: String(item.name ?? ""),
  day: Number(item.day ?? 0),
  dayName: String(item.day ?? item.dayName ?? ""),
  period: Number(item.period ?? 0),
  periodName: String(item.period ?? item.periodName ?? ""),
  timeFrom: String(item.timeFrom ?? ""),
  timeTo: String(item.timeTo ?? ""),
});

export const getWorkingSchedules = async (filters: {
  page?: number;
  limit?: number;
  name?: string;
} = {}) => {
  const { page = 1, limit = 10, name } = filters;
  const params: Record<string, string | number> = { Page: page, Limit: limit };
  if (name?.trim()) params.Name = name.trim();

  const res = await api.get("/working-schedules", { params });
  const records = sortNewestFirst(
    unwrapPage<Record<string, unknown>>(res.data).map(normalizeSchedule),
  );
  const meta = unwrapPagedMeta(res.data);

  return { records, meta };
};

export const getWorkingScheduleById = async (id: string) => {
  const res = await api.get(`/working-schedules/${id}`);
  const data = unwrapEntity<Record<string, unknown>>(res.data);
  const periods = Array.isArray(data.periods)
    ? data.periods.map((period) => normalizePeriod(period as Record<string, unknown>))
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

export const updateWorkingSchedule = async (id: string, data: { name: string }) => {
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
  const res = await api.put(`/working-schedules/${scheduleId}/periods/${periodId}`, data);
  assertSuccess(res.data);
  return res.data;
};

export const deleteWorkingPeriod = async (scheduleId: string, periodId: string) => {
  const res = await api.delete(`/working-schedules/${scheduleId}/periods/${periodId}`);
  assertSuccess(res.data);
  return res.data;
};

const unwrapEnumList = (payload: unknown) => {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeEnum(item as Record<string, unknown>));
  }
  const data = unwrapData<Record<string, unknown>[]>(payload);
  if (!Array.isArray(data)) return [];
  return data.map((item) => normalizeEnum(item));
};

export const getPeriodTypes = async () => {
  const res = await api.get("/constants/period-types");
  return unwrapEnumList(res.data);
};

export const getDaysOfWeek = async () => {
  const res = await api.get("/constants/days-of-week");
  return unwrapEnumList(res.data);
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
