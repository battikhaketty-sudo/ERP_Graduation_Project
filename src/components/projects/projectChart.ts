import type { Project, ProjectTask, TaskPriority } from "../../types/project";

export type ChartMonthBucket = {
  key: string;
  label: string;
  hours: number;
  count: number;
};

export type ProjectChartSnapshot = {
  months: ChartMonthBucket[];
  maxHours: number;
  maxCount: number;
  hasData: boolean;
};

const PRIORITY_TYPE_CODE: Record<TaskPriority, string> = {
  low: "L",
  medium: "M",
  high: "H",
  urgent: "U",
};

const toDate = (value?: string) => {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (date: Date, locale: string) =>
  date.toLocaleDateString(locale, { month: "short", year: "2-digit" });

const taskAnchorDate = (task: ProjectTask) =>
  toDate(task.dueDate) ?? toDate(task.startDate);

const addMonths = (date: Date, count: number) => {
  const next = new Date(date.getFullYear(), date.getMonth(), 1);
  next.setMonth(next.getMonth() + count);
  return next;
};

const monthsBetweenInclusive = (start: Date, end: Date) => {
  const months: Date[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    months.push(new Date(cursor));
    cursor = addMonths(cursor, 1);
  }
  return months;
};

export function priorityTypeCode(priority: TaskPriority): string {
  return PRIORITY_TYPE_CODE[priority] ?? "O";
}

export function formatTaskDate(value?: string): string {
  if (!value?.trim()) return "";
  return value.slice(0, 10).replace(/-/g, "/");
}

export function buildProjectChartSnapshot(
  project: Project,
  locale = "en",
): ProjectChartSnapshot {
  const tasks = project.tasks ?? [];
  const datedTasks = tasks
    .map((task) => ({ task, date: taskAnchorDate(task) }))
    .filter((item): item is { task: ProjectTask; date: Date } => Boolean(item.date));

  const projectStart = toDate(project.startDate);
  const projectEnd = toDate(project.endDate);
  const taskTimes = datedTasks.map((item) => item.date.getTime());

  let rangeStart: Date | null = null;
  let rangeEnd: Date | null = null;

  const candidatesStart = [
    projectStart?.getTime(),
    taskTimes.length ? Math.min(...taskTimes) : undefined,
  ].filter((value): value is number => typeof value === "number");

  const candidatesEnd = [
    projectEnd?.getTime(),
    taskTimes.length ? Math.max(...taskTimes) : undefined,
  ].filter((value): value is number => typeof value === "number");

  if (candidatesStart.length) rangeStart = new Date(Math.min(...candidatesStart));
  if (candidatesEnd.length) rangeEnd = new Date(Math.max(...candidatesEnd));

  if (!rangeStart && !rangeEnd) {
    return { months: [], maxHours: 0, maxCount: 0, hasData: false };
  }

  if (!rangeStart && rangeEnd) rangeStart = new Date(rangeEnd);
  if (!rangeEnd && rangeStart) rangeEnd = new Date(rangeStart);

  // Widen empty single-month ranges slightly for readability
  if (rangeStart && rangeEnd && monthKey(rangeStart) === monthKey(rangeEnd)) {
    rangeEnd = addMonths(rangeStart, 1);
  }

  const monthDates = monthsBetweenInclusive(rangeStart!, rangeEnd!);
  // Cap very long ranges; keep months that contain tasks when possible
  let capped = monthDates;
  if (monthDates.length > 18) {
    const taskKeys = new Set(datedTasks.map((item) => monthKey(item.date)));
    const withTasks = monthDates.filter((date) => taskKeys.has(monthKey(date)));
    capped =
      withTasks.length > 0
        ? withTasks.slice(-18)
        : monthDates.slice(monthDates.length - 18);
  }

  const buckets = new Map<string, ChartMonthBucket>();
  for (const date of capped) {
    const key = monthKey(date);
    buckets.set(key, {
      key,
      label: monthLabel(date, locale),
      hours: 0,
      count: 0,
    });
  }

  for (const { task, date } of datedTasks) {
    const key = monthKey(date);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.count += 1;
    bucket.hours += Number(task.expectedHours) || 0;
  }

  const months = [...buckets.values()];
  const maxHours = Math.max(0, ...months.map((m) => m.hours));
  const maxCount = Math.max(0, ...months.map((m) => m.count));

  return {
    months,
    maxHours,
    maxCount,
    hasData: months.some((m) => m.count > 0 || m.hours > 0) || tasks.length > 0,
  };
}
