import { FileText, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DetailBackButton } from "./ui/DetailBackButton";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { TimeInput } from "./ui/TimeInput";
import { CopyableIdCell } from "./ui/CopyableIdCell";
import { TableRowIndex } from "./ui/TableRowIndex";
import type { WorkScheduleStatsSnapshot } from "./WorkScheduleStatsBanner";
import { WorkScheduleStatsBanner } from "./WorkScheduleStatsBanner";
import { apiTimeToInputValue, timeInputToMinutes } from "../utils/timeInput";
import {
  addWorkingPeriod,
  addWorkingSchedule,
  deleteWorkingPeriod,
  deleteWorkingSchedule,
  formatHoursLabel,
  getDaysOfWeek,
  getPeriodTypes,
  getWorkingScheduleById,
  getWorkingSchedules,
  labelToApiTime,
  type EnumOption,
  type WorkingPeriodInput,
  type WorkingSchedule,
  updateWorkingPeriod,
  updateWorkingSchedule,
} from "../services/workingScheduleApi";
import { getThrownErrorMessage } from "../utils/apiResponse";
const resolveEnumId = (value: unknown, options: EnumOption[], fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && options.some((option) => option.id === numeric)) {
    return numeric;
  }

  const label = String(value ?? "");
  const match = options.find((option) => option.name === label);
  return match?.id ?? options[0]?.id ?? fallback;
};

const periodHours = (row: PeriodRow) => {
  const minutes = timeInputToMinutes(row.timeTo) - timeInputToMinutes(row.timeFrom);
  return Math.max(0, minutes / 60);
};
const roundHours = (value: number) =>
  Number.isInteger(value) ? value : Number(value.toFixed(1));

const statsFromForm = (
  name: string,
  rows: PeriodRow[],
  weeklyDaysTarget: number,
): WorkScheduleStatsSnapshot => {
  const activeRows = rows.filter((row) => row.name.trim());
  const totalWeeklyHours = activeRows.reduce((sum, row) => sum + periodHours(row), 0);
  const workingDaysCount = weeklyDaysTarget || new Set(activeRows.map((row) => row.day)).size;

  return {
    title: name.trim() || "جدول عمل جديد",
    workingDaysCount,
    periodsCount: activeRows.length,
    totalWeeklyHours: roundHours(totalWeeklyHours),
    totalDailyHours: workingDaysCount
      ? roundHours(totalWeeklyHours / workingDaysCount)
      : 0,
  };
};

type WorkSchedulePanelProps = {
  onNotice: (message: string | null) => void;
};

type PanelView = "list" | "form";

type PeriodRow = {
  localId: string;
  id?: string;
  name: string;
  day: number;
  period: number;
  timeFrom: string;
  timeTo: string;
};

const DEFAULT_PERIOD_NAME = "الفترة الصباحية الأولى";
const DEFAULT_TIME_FROM = "08:00";
const DEFAULT_TIME_TO = "16:00";

const validatePeriodRows = (rows: PeriodRow[]) => {
  const activeRows = rows.filter((row) => row.name.trim());
  if (!activeRows.length) {
    return "يرجى إضافة فترة عمل واحدة على الأقل.";
  }
  return null;
};

const createPeriodRow = (
  dayOptions: EnumOption[],
  periodOptions: EnumOption[],
  dayId?: number,
): PeriodRow => ({
  localId: crypto.randomUUID(),
  name: DEFAULT_PERIOD_NAME,
  day: dayId ?? dayOptions[0]?.id ?? 0,
  period: periodOptions[0]?.id ?? 1,
  timeFrom: DEFAULT_TIME_FROM,
  timeTo: DEFAULT_TIME_TO,
});

const buildRowsForWeeklyDays = (
  count: number,
  dayOptions: EnumOption[],
  periodOptions: EnumOption[],
) =>
  dayOptions.slice(0, count).map((day) => createPeriodRow(dayOptions, periodOptions, day.id));

const PAGE_SIZE = 5;
const PERIOD_PAGE_SIZE = 5;
const WEEKLY_DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export function WorkSchedulePanel({ onNotice }: WorkSchedulePanelProps) {
  const { confirm } = useConfirmDialog();
  const [view, setView] = useState<PanelView>("list");
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [focusedScheduleId, setFocusedScheduleId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scheduleName, setScheduleName] = useState("");
  const [weeklyDaysTarget, setWeeklyDaysTarget] = useState(5);
  const [periodRows, setPeriodRows] = useState<PeriodRow[]>([]);
  const [periodPage, setPeriodPage] = useState(1);
  const [dayOptions, setDayOptions] = useState<EnumOption[]>([]);
  const [periodOptions, setPeriodOptions] = useState<EnumOption[]>([]);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  const notify = useCallback(
    (message: string | null) => {
      setFormNotice(message);
      onNotice(message);
    },
    [onNotice],
  );

  const loadConstants = useCallback(async () => {
    try {
      const [days, periods] = await Promise.all([getDaysOfWeek(), getPeriodTypes()]);
      setDayOptions(days);
      setPeriodOptions(periods);
      return { days, periods };
    } catch {
      const fallbackDays = [
        { id: 0, name: "الأحد" },
        { id: 1, name: "الإثنين" },
        { id: 2, name: "الثلاثاء" },
        { id: 3, name: "الأربعاء" },
        { id: 4, name: "الخميس" },
        { id: 5, name: "الجمعة" },
        { id: 6, name: "السبت" },
      ];
      const fallbackPeriods = [
        { id: 1, name: "عمل" },
        { id: 2, name: "راحة" },
      ];
      setDayOptions(fallbackDays);
      setPeriodOptions(fallbackPeriods);
      return { days: fallbackDays, periods: fallbackPeriods };
    }
  }, []);

  const loadSchedules = useCallback(
    async (targetPage = 1) => {
      try {
        setLoading(true);
        const { records, meta } = await getWorkingSchedules({
          page: targetPage,
          limit: PAGE_SIZE,
          name: search.trim() || undefined,
        });
        setSchedules(records);
        setPage(meta.currentPage || targetPage);
        setTotalPages(Math.max(meta.totalPages || 1, 1));
        setTotalCount(meta.totalItems || records.length);
        notify(null);
      } catch (err) {
        notify(getThrownErrorMessage(err, "تعذر تحميل جداول العمل"));
      } finally {
        setLoading(false);
      }
    },
    [notify, search],
  );

  useEffect(() => {
    void loadConstants();
  }, [loadConstants]);

  useEffect(() => {
    if (view !== "list") return;
    const timer = window.setTimeout(() => {
      void loadSchedules(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [view, search, loadSchedules]);

  const formStats = useMemo(
    () => statsFromForm(scheduleName, periodRows, weeklyDaysTarget),
    [periodRows, scheduleName, weeklyDaysTarget],
  );

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    return pages.slice(0, 5);
  }, [totalPages]);

  const periodTotalPages = Math.max(1, Math.ceil(periodRows.length / PERIOD_PAGE_SIZE));

  const visiblePeriodRows = useMemo(() => {
    const start = (periodPage - 1) * PERIOD_PAGE_SIZE;
    return periodRows.slice(start, start + PERIOD_PAGE_SIZE);
  }, [periodPage, periodRows]);

  const applyWeeklyDaysTarget = (count: number, days = dayOptions, periods = periodOptions) => {
    setWeeklyDaysTarget(count);
    setPeriodRows(buildRowsForWeeklyDays(count, days, periods));
    setPeriodPage(1);
  };

  const openAddForm = async () => {
    notify(null);
    const { days, periods } = await loadConstants();
    setEditingId(null);
    setScheduleName("");
    applyWeeklyDaysTarget(5, days, periods);
    setView("form");
  };

  const openEditForm = async (schedule: WorkingSchedule) => {
    try {
      notify(null);
      setFocusedScheduleId(schedule.id);
      const { days, periods } = await loadConstants();
      const detail = await getWorkingScheduleById(schedule.id);
      setEditingId(schedule.id);
      setScheduleName(detail.name);
      setWeeklyDaysTarget(detail.workingDaysCount || detail.periods.length || 5);
      setPeriodRows(
        detail.periods.length
          ? detail.periods.map((period) => ({
              localId: crypto.randomUUID(),
              id: period.id,
              name: period.name,
              day: resolveEnumId(period.day, days),
              period: resolveEnumId(period.period, periods, 1),
              timeFrom: apiTimeToInputValue(period.timeFrom, DEFAULT_TIME_FROM),
              timeTo: apiTimeToInputValue(period.timeTo, DEFAULT_TIME_TO),            }))
          : buildRowsForWeeklyDays(5, days, periods),
      );
      setPeriodPage(1);
      setView("form");
    } catch (err) {
      notify(getThrownErrorMessage(err, "تعذر تحميل بيانات الجدول"));
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    const confirmed = await confirm({
      message: "هل أنت متأكد من حذف جدول العمل؟",
    });
    if (!confirmed) return;

    try {
      await deleteWorkingSchedule(id);
      notify(null);
      await loadSchedules(page);
    } catch (err) {
      notify(getThrownErrorMessage(err, "فشل حذف جدول العمل"));
    }
  };

  const addPeriodRow = () => {
    setPeriodRows((prev) => [...prev, createPeriodRow(dayOptions, periodOptions)]);
    setPeriodPage(Math.max(1, Math.ceil((periodRows.length + 1) / PERIOD_PAGE_SIZE)));
  };

  const removePeriodRow = (localId: string) => {
    setPeriodRows((prev) => {
      const next = prev.filter((row) => row.localId !== localId);
      return next.length ? next : [createPeriodRow(dayOptions, periodOptions)];
    });
  };

  const updatePeriodRow = (localId: string, patch: Partial<PeriodRow>) => {
    setPeriodRows((prev) =>
      prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row)),
    );
  };

  const toPeriodInput = (row: PeriodRow): WorkingPeriodInput => ({
    name: row.name.trim(),
    day: row.day,
    period: row.period,
    timeFrom: labelToApiTime(row.timeFrom),
    timeTo: labelToApiTime(row.timeTo),
  });

  const handleSaveSchedule = async () => {
    if (!scheduleName.trim()) {
      notify("يرجى إدخال اسم الجدول.");
      return;
    }

    const periodValidationError = validatePeriodRows(periodRows);
    if (periodValidationError) {
      notify(periodValidationError);
      return;
    }

    const validPeriods = periodRows.filter((row) => row.name.trim());

    setSaving(true);
    notify(null);
    try {
      if (!editingId) {
        await addWorkingSchedule({
          name: scheduleName.trim(),
          periods: validPeriods.map(toPeriodInput),
        });
      } else {
        await updateWorkingSchedule(editingId, { name: scheduleName.trim() });

        const existingIds = new Set(
          validPeriods.filter((row) => row.id).map((row) => row.id as string),
        );
        const original = await getWorkingScheduleById(editingId);

        for (const period of original.periods) {
          if (period.id && !existingIds.has(period.id)) {
            await deleteWorkingPeriod(editingId, period.id);
          }
        }

        for (const row of validPeriods) {
          const payload = toPeriodInput(row);
          if (row.id) {
            await updateWorkingPeriod(editingId, row.id, payload);
          } else {
            await addWorkingPeriod(editingId, payload);
          }
        }
      }

      notify(null);
      setFormNotice(null);
      setView("list");
      await loadSchedules(1);
    } catch (err) {
      notify(getThrownErrorMessage(err, "فشل حفظ جدول العمل"));
    } finally {
      setSaving(false);
    }
  };

  const listToolbar = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-md flex-1 sm:min-w-[260px]">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن جدول عمل محدد"
          className="h-9 w-full rounded-lg border border-hr-border bg-white pe-3 ps-9 text-sm outline-none focus:border-hr-primary"
        />
      </div>

      <button
        type="button"
        onClick={() => void openAddForm()}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-hr-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-hr-primary-hover"
      >
        <Plus className="size-4" strokeWidth={2.5} />
        إضافة جدول عمل جديد
      </button>
    </div>
  );

  if (view === "form") {
    return (
      <section className="rounded-xl border border-[#B8E4F2] bg-white p-4 shadow-card sm:p-5">
        <DetailBackButton
          label="العودة إلى قائمة جداول العمل"
          onClick={() => setView("list")}
        />

        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-hr-muted">
          <span className="font-medium text-hr-primary">
            إدارة جدول العمل ({totalCount}) جدول
          </span>
          <span>›</span>
          <span className="text-hr-text">
            {editingId ? "تعديل جدول عمل" : "إضافة جدول عمل جديد"}
          </span>
        </div>

        <div className="mb-6">
          <WorkScheduleStatsBanner stats={formStats} />
        </div>

        <div className="mb-6 rounded-2xl border border-hr-border bg-[#FAFCFE] p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="size-5 text-hr-primary" />
            <h3 className="text-base font-bold text-hr-text">المعلومات الأساسية</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-hr-text">اسم الجدول</label>
              <input
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="أدخل اسم الجدول"
                className="h-11 w-full rounded-lg border border-hr-border bg-white px-3 outline-none focus:border-hr-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-hr-text">عدد أيام العمل الأسبوعية</label>
              <select
                value={weeklyDaysTarget}
                onChange={(e) => applyWeeklyDaysTarget(Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-hr-border bg-white px-3 outline-none focus:border-hr-primary"
              >
                <option value={0} disabled>
                  اختر عدد الأيام
                </option>
                {WEEKLY_DAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} {days === 1 ? "يوم" : "أيام"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-hr-border bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-hr-text">فترات العمل</h3>
            <button
              type="button"
              onClick={addPeriodRow}
              className="inline-flex items-center gap-2 rounded-lg bg-[#DDF1FA] px-4 py-2 text-sm font-medium text-[#3D7EA6] transition hover:bg-[#C8E9F7]"
            >
              <Plus className="size-4" />
              إضافة فترة
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-hr-border">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-[#F5FAFD] text-hr-muted">
                <tr>
                  <th className="px-3 py-3 text-center font-medium">#</th>
                  <th className="px-3 py-3 text-center font-medium">id</th>
                  <th className="px-3 py-3 text-center font-medium">اسم الفترة</th>
                  <th className="px-3 py-3 text-center font-medium">اليوم</th>
                  <th className="px-3 py-3 text-center font-medium">نوع الفترة</th>
                  <th className="px-3 py-3 text-center font-medium">من الوقت</th>
                  <th className="px-3 py-3 text-center font-medium">إلى الوقت</th>
                  <th className="px-3 py-3 text-center font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visiblePeriodRows.map((row, idx) => (
                  <tr
                    key={row.localId}
                    className={idx % 2 ? "border-t border-hr-border bg-[#F5FAFD]" : "border-t border-hr-border bg-white"}
                  >
                    <td className="px-3 py-3 text-center text-hr-muted">
                      <TableRowIndex
                        index={idx}
                        page={periodPage}
                        pageSize={PERIOD_PAGE_SIZE}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <CopyableIdCell value={row.id ?? row.localId} />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={row.name}
                        onChange={(e) => updatePeriodRow(row.localId, { name: e.target.value })}
                        placeholder={DEFAULT_PERIOD_NAME}
                        aria-label="اسم الفترة"
                        className="h-10 w-full min-w-[160px] rounded-lg border border-hr-border px-3 text-center outline-none focus:border-hr-primary"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={row.day}
                        onChange={(e) =>
                          updatePeriodRow(row.localId, { day: Number(e.target.value) })
                        }
                        aria-label="اليوم"
                        className="h-10 w-full min-w-[120px] rounded-lg border border-hr-border bg-white px-3 text-center outline-none focus:border-hr-primary"
                      >
                        {dayOptions.map((day) => (
                          <option key={day.id} value={day.id}>
                            {day.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={row.period}
                        onChange={(e) =>
                          updatePeriodRow(row.localId, { period: Number(e.target.value) })
                        }
                        aria-label="نوع الفترة"
                        className="h-10 w-full min-w-[120px] rounded-lg border border-hr-border bg-white px-3 text-center outline-none focus:border-hr-primary"
                      >
                        {periodOptions.map((period) => (
                          <option key={period.id} value={period.id}>
                            {period.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <TimeInput
                        value={row.timeFrom}
                        onChange={(value) => updatePeriodRow(row.localId, { timeFrom: value })}
                        aria-label="من الوقت"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <TimeInput
                        value={row.timeTo}
                        onChange={(value) => updatePeriodRow(row.localId, { timeTo: value })}
                        aria-label="إلى الوقت"
                      />
                    </td>                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removePeriodRow(row.localId)}
                        className="text-red-400 transition hover:text-red-600"
                        aria-label="حذف الفترة"
                      >
                        <X className="mx-auto size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {periodTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPeriodPage((current) => Math.max(1, current - 1))}
                disabled={periodPage <= 1}
                className="rounded px-2 py-1 text-hr-muted disabled:opacity-40"
              >
                ‹
              </button>
              {Array.from({ length: periodTotalPages }, (_, i) => i + 1)
                .slice(0, 5)
                .map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPeriodPage(pageNumber)}
                    className={[
                      "size-8 rounded-full text-sm",
                      pageNumber === periodPage
                        ? "bg-hr-primary text-white"
                        : "text-hr-muted hover:bg-gray-100",
                    ].join(" ")}
                  >
                    {pageNumber}
                  </button>
                ))}
              <button
                type="button"
                onClick={() =>
                  setPeriodPage((current) => Math.min(periodTotalPages, current + 1))
                }
                disabled={periodPage >= periodTotalPages}
                className="rounded px-2 py-1 text-hr-muted disabled:opacity-40"
              >
                ›
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {formNotice && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formNotice}
            </p>
          )}

          <div className="flex flex-wrap justify-start gap-3">
          <button
            type="button"
            onClick={() => void handleSaveSchedule()}
            disabled={saving}
            className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? "جاري الحفظ…" : "حفظ الجدول"}
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className="rounded-lg border border-hr-primary px-8 py-2.5 text-sm font-bold text-hr-primary transition hover:bg-[#F0F6FF]"
          >
            إلغاء
          </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#B8E4F2] bg-white p-4 shadow-card sm:p-5">
      {listToolbar}

      <div className="overflow-x-auto rounded-lg border border-hr-border">
        <table className="min-w-[980px] w-full table-fixed text-sm">
          <colgroup>
            <col className="w-14" />
            <col />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-24" />
          </colgroup>
          <thead className="bg-[#F5FAFD] text-hr-muted">
            <tr>
              <th className="px-3 py-3 text-center font-medium">#</th>
              <th className="px-3 py-3 text-center font-medium">id</th>
              <th className="px-3 py-3 text-center font-medium">اسم الجدول</th>
              <th className="px-3 py-3 text-center font-medium">عدد الفترات</th>
              <th className="px-3 py-3 text-center font-medium">عدد أيام العمل</th>
              <th className="px-3 py-3 text-center font-medium">إجمالي ساعات العمل الأسبوعي</th>
              <th className="px-3 py-3 text-center font-medium">متوسط ساعات العمل اليومي</th>
              <th className="px-3 py-3 text-center font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-hr-muted">
                  جاري التحميل…
                </td>
              </tr>
            ) : (
              schedules.map((item, idx) => (
                <tr
                  key={item.id}
                  className={[
                    "cursor-pointer",
                    idx % 2 ? "bg-[#F5FAFD]" : "bg-white",
                    focusedScheduleId === item.id ? "ring-1 ring-inset ring-[#5BB8E8]" : "",
                  ].join(" ")}
                  onClick={() => void openEditForm(item)}
                >
                  <td className="px-3 py-3 text-center text-hr-muted">
                    <TableRowIndex index={idx} page={page} pageSize={PAGE_SIZE} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CopyableIdCell value={item.id} />
                  </td>
                  <td className="truncate px-3 py-3 text-center font-medium text-hr-text">
                    {item.name}
                  </td>
                  <td className="px-3 py-3 text-center">{item.periodsCount}</td>
                  <td className="px-3 py-3 text-center">{item.workingDaysCount}</td>
                  <td className="px-3 py-3 text-center">
                    {formatHoursLabel(item.totalWorkingHoursWeekly)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {formatHoursLabel(item.averageWorkingHoursPerDay, "ساعات")}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void openEditForm(item);
                        }}
                        className="text-amber-500"
                        aria-label="تعديل"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteSchedule(item.id);
                        }}
                        className="text-red-400"
                        aria-label="حذف"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && !schedules.length && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-hr-muted">
                  لا توجد جداول عمل
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => page > 1 && void loadSchedules(page - 1)}
          disabled={page <= 1}
          className="rounded px-2 py-1 text-hr-muted disabled:opacity-40"
          aria-label="الصفحة السابقة"
        >
          ‹
        </button>
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            onClick={() => void loadSchedules(pageNumber)}
            className={[
              "size-8 rounded-full text-sm",
              pageNumber === page ? "bg-hr-primary text-white" : "text-hr-muted hover:bg-gray-100",
            ].join(" ")}
            aria-current={pageNumber === page ? "page" : undefined}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          onClick={() => page < totalPages && void loadSchedules(page + 1)}
          disabled={page >= totalPages}
          className="rounded px-2 py-1 text-hr-muted disabled:opacity-40"
          aria-label="الصفحة التالية"
        >
          ›
        </button>
      </div>
    </section>
  );
}
