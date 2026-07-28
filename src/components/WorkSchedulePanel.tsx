import { FileText, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUrlQueryNavigation } from "../hooks/useUrlQueryNavigation";
import { useTranslation } from "../i18n";
import { TableToolbar } from "./ui/TableToolbar";
import { DetailBackButton } from "./ui/DetailBackButton";
import {
  accentBtnClass,
  alertErrorClass,
  cancelBtnClass,
} from "./ui/formStyles";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { TimeInput } from "./ui/TimeInput";
import { CopyableIdCell } from "./ui/CopyableIdCell";
import { TableRowIndex } from "./ui/TableRowIndex";
import type { WorkScheduleStatsSnapshot } from "./WorkScheduleStatsBanner";
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

const DAY_I18N_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const PERIOD_I18N_KEYS: Record<number, "work" | "break"> = {
  1: "work",
  2: "break",
};

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
  rows: PeriodRow[],
  weeklyDaysTarget: number,
): WorkScheduleStatsSnapshot => {
  const activeRows = rows.filter((row) => row.name.trim());
  const totalWeeklyHours = activeRows.reduce((sum, row) => sum + periodHours(row), 0);
  const workingDaysCount = weeklyDaysTarget || new Set(activeRows.map((row) => row.day)).size;

  return {
    workingDaysCount,
    periodsCount: activeRows.length,
    totalWeeklyHours: roundHours(totalWeeklyHours),
    totalDailyHours: workingDaysCount
      ? roundHours(totalWeeklyHours / workingDaysCount)
      : 0,
  };
};

export type WorkScheduleHeaderState = {
  isFormView: true;
  scheduleTitle: string;
  stats: WorkScheduleStatsSnapshot;
};

type WorkSchedulePanelProps = {
  onNotice: (message: string | null) => void;
  onHeaderStateChange?: (state: WorkScheduleHeaderState | null) => void;
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

const DEFAULT_TIME_FROM = "08:00";
const DEFAULT_TIME_TO = "16:00";

const validatePeriodRows = (rows: PeriodRow[]) =>
  rows.some((row) => row.name.trim());

const createPeriodRow = (
  dayOptions: EnumOption[],
  periodOptions: EnumOption[],
  defaultPeriodName: string,
  dayId?: number,
): PeriodRow => ({
  localId: crypto.randomUUID(),
  name: defaultPeriodName,
  day: dayId ?? dayOptions[0]?.id ?? 0,
  period: periodOptions[0]?.id ?? 1,
  timeFrom: DEFAULT_TIME_FROM,
  timeTo: DEFAULT_TIME_TO,
});

const buildRowsForWeeklyDays = (
  count: number,
  dayOptions: EnumOption[],
  periodOptions: EnumOption[],
  defaultPeriodName: string,
) =>
  dayOptions
    .slice(0, count)
    .map((day) => createPeriodRow(dayOptions, periodOptions, defaultPeriodName, day.id));

const PAGE_SIZE = 5;
const PERIOD_PAGE_SIZE = 5;
const WEEKLY_DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export function WorkSchedulePanel({
  onNotice,
  onHeaderStateChange,
}: WorkSchedulePanelProps) {
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const {
    value: scheduleParam,
    pushValue: openScheduleInUrl,
    removeValue: clearScheduleFromUrl,
    goBack: goBackToScheduleList,
  } = useUrlQueryNavigation({ param: "schedule" });
  const hoursSuffix = t("common.hours");
  const defaultPeriodName = t("hr.workSchedule.defaultPeriodName");
  const defaultScheduleTitle = t("hr.workSchedule.defaultTitle");
  const [view, setView] = useState<PanelView>("list");
  const [schedules, setSchedules] = useState<WorkingSchedule[]>([]);
  const [focusedScheduleId, setFocusedScheduleId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const translateDayOptions = useCallback(
    (days: EnumOption[]) =>
      days.map((day) => ({
        ...day,
        name: t(`hr.workSchedule.days.${DAY_I18N_KEYS[day.id] ?? "sunday"}`),
      })),
    [t],
  );

  const translatePeriodOptions = useCallback(
    (periods: EnumOption[]) =>
      periods.map((period) => ({
        ...period,
        name: t(`hr.workSchedule.periodTypes.${PERIOD_I18N_KEYS[period.id] ?? "work"}`),
      })),
    [t],
  );

  const loadConstants = useCallback(async () => {
    try {
      const [days, periods] = await Promise.all([getDaysOfWeek(), getPeriodTypes()]);
      const translatedDays = translateDayOptions(days);
      const translatedPeriods = translatePeriodOptions(periods);
      setDayOptions(translatedDays);
      setPeriodOptions(translatedPeriods);
      return { days: translatedDays, periods: translatedPeriods };
    } catch {
      const fallbackDays = translateDayOptions([
        { id: 0, name: "Sunday" },
        { id: 1, name: "Monday" },
        { id: 2, name: "Tuesday" },
        { id: 3, name: "Wednesday" },
        { id: 4, name: "Thursday" },
        { id: 5, name: "Friday" },
        { id: 6, name: "Saturday" },
      ]);
      const fallbackPeriods = translatePeriodOptions([
        { id: 1, name: "Work" },
        { id: 2, name: "Break" },
      ]);
      setDayOptions(fallbackDays);
      setPeriodOptions(fallbackPeriods);
      return { days: fallbackDays, periods: fallbackPeriods };
    }
  }, [translateDayOptions, translatePeriodOptions]);

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
        notify(null);
      } catch (err) {
        notify(getThrownErrorMessage(err, t("hr.workSchedule.errors.loadList")));
      } finally {
        setLoading(false);
      }
    },
    [notify, search, t],
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
    () => statsFromForm(periodRows, weeklyDaysTarget),
    [periodRows, weeklyDaysTarget],
  );

  useEffect(() => {
    if (view !== "form") {
      onHeaderStateChange?.(null);
      return;
    }

    onHeaderStateChange?.({
      isFormView: true,
      scheduleTitle: scheduleName.trim() || defaultScheduleTitle,
      stats: formStats,
    });
  }, [view, scheduleName, defaultScheduleTitle, formStats, onHeaderStateChange]);

  useEffect(
    () => () => {
      onHeaderStateChange?.(null);
    },
    [onHeaderStateChange],
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
    setPeriodRows(buildRowsForWeeklyDays(count, days, periods, defaultPeriodName));
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

  useEffect(() => {
    if (!scheduleParam) {
      setView("list");
      return;
    }

    let cancelled = false;

    const loadForm = async () => {
      if (scheduleParam === "new") {
        await openAddForm();
        return;
      }

      if (cancelled) return;

      try {
        notify(null);
        setFocusedScheduleId(scheduleParam);
        const { days, periods } = await loadConstants();
        const detail = await getWorkingScheduleById(scheduleParam);
        if (cancelled) return;
        setEditingId(scheduleParam);
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
                timeTo: apiTimeToInputValue(period.timeTo, DEFAULT_TIME_TO),
              }))
            : buildRowsForWeeklyDays(5, days, periods, defaultPeriodName),
        );
        setPeriodPage(1);
        setView("form");
      } catch (err) {
        if (!cancelled) {
          notify(getThrownErrorMessage(err, t("hr.workSchedule.errors.loadDetail")));
          clearScheduleFromUrl();
        }
      }
    };

    void loadForm();

    return () => {
      cancelled = true;
    };
  }, [scheduleParam]);

  const handleDeleteSchedule = async (id: string) => {
    const confirmed = await confirm({
      message: t("hr.workSchedule.confirms.delete"),
    });
    if (!confirmed) return;

    try {
      await deleteWorkingSchedule(id);
      notify(null);
      await loadSchedules(page);
    } catch (err) {
      notify(getThrownErrorMessage(err, t("hr.workSchedule.errors.delete")));
    }
  };

  const addPeriodRow = () => {
    setPeriodRows((prev) => [
      ...prev,
      createPeriodRow(dayOptions, periodOptions, defaultPeriodName),
    ]);
    setPeriodPage(Math.max(1, Math.ceil((periodRows.length + 1) / PERIOD_PAGE_SIZE)));
  };

  const removePeriodRow = (localId: string) => {
    setPeriodRows((prev) => {
      const next = prev.filter((row) => row.localId !== localId);
      return next.length
        ? next
        : [createPeriodRow(dayOptions, periodOptions, defaultPeriodName)];
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
      notify(t("hr.workSchedule.errors.nameRequired"));
      return;
    }

    if (!validatePeriodRows(periodRows)) {
      notify(t("hr.workSchedule.errors.periodRequired"));
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
      clearScheduleFromUrl();
      await loadSchedules(1);
    } catch (err) {
      notify(getThrownErrorMessage(err, t("hr.workSchedule.errors.save")));
    } finally {
      setSaving(false);
    }
  };

  const listToolbar = (
    <TableToolbar
      addLabel={t("hr.workSchedule.addLabel")}
      onAddClick={() => openScheduleInUrl("new")}
      addClassName="inline-flex shrink-0 items-center gap-2 rounded-lg bg-hr-primary px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-hr-primary-hover"
    >
        <div className="relative w-full max-w-md sm:min-w-[260px]">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("hr.workSchedule.searchPlaceholder")}
          className="h-9 w-full rounded-lg border border-hr-border bg-hr-surface pe-3 ps-9 text-sm outline-none focus:border-hr-primary"
        />
      </div>
    </TableToolbar>
  );

  if (view === "form") {
    return (
      <section className="rounded-xl border border-hr-border bg-hr-surface p-4 shadow-card sm:p-5">
        <DetailBackButton
          label={t("hr.workSchedule.backLabel")}
          onClick={goBackToScheduleList}
        />

        <div className="mb-6 rounded-2xl border border-hr-border bg-hr-table-alt p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="size-5 text-hr-primary" />
            <h3 className="text-base font-bold text-hr-text">{t("hr.workSchedule.basicInfo")}</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("hr.workSchedule.columns.scheduleName")}
              </label>
              <input
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder={t("hr.workSchedule.namePlaceholder")}
                className="h-11 w-full rounded-lg border border-hr-border bg-hr-surface px-3 outline-none focus:border-hr-primary"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("hr.workSchedule.weeklyDaysLabel")}
              </label>
              <select
                value={weeklyDaysTarget}
                onChange={(e) => applyWeeklyDaysTarget(Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-hr-border bg-hr-surface px-3 outline-none focus:border-hr-primary"
              >
                <option value={0} disabled>
                  {t("hr.workSchedule.selectDaysCount")}
                </option>
                {WEEKLY_DAY_OPTIONS.map((days) => (
                  <option key={days} value={days}>
                    {days} {days === 1 ? t("common.day") : t("common.days")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-hr-border bg-hr-surface p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-hr-text">{t("hr.workSchedule.periodsSection")}</h3>
            <button
              type="button"
              onClick={addPeriodRow}
              className={`${accentBtnClass} rounded-lg`}
            >
              <Plus className="size-4" />
              {t("hr.workSchedule.addPeriod")}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-hr-border">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-hr-table-head text-hr-muted">
                <tr>
                  <th className="px-3 py-3 text-center font-medium">{t("table.columns.index")}</th>
                  <th className="px-3 py-3 text-center font-medium">{t("table.columns.id")}</th>
                  <th className="px-3 py-3 text-center font-medium">{t("hr.workSchedule.form.periodName")}</th>
                  <th className="px-3 py-3 text-center font-medium">{t("hr.workSchedule.form.day")}</th>
                  <th className="px-3 py-3 text-center font-medium">{t("hr.workSchedule.form.periodType")}</th>
                  <th className="px-3 py-3 text-center font-medium">{t("hr.workSchedule.form.fromTime")}</th>
                  <th className="px-3 py-3 text-center font-medium">{t("hr.workSchedule.form.toTime")}</th>
                  <th className="px-3 py-3 text-center font-medium">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {visiblePeriodRows.map((row, idx) => (
                  <tr
                    key={row.localId}
                    className={idx % 2 ? "border-t border-hr-border bg-hr-table-head" : "border-t border-hr-border bg-hr-surface"}
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
                        placeholder={defaultPeriodName}
                        aria-label={t("hr.workSchedule.form.periodName")}
                        className="h-10 w-full min-w-[160px] rounded-lg border border-hr-border px-3 text-center outline-none focus:border-hr-primary"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={row.day}
                        onChange={(e) =>
                          updatePeriodRow(row.localId, { day: Number(e.target.value) })
                        }
                        aria-label={t("hr.workSchedule.form.day")}
                        className="h-10 w-full min-w-[120px] rounded-lg border border-hr-border bg-hr-surface px-3 text-center outline-none focus:border-hr-primary"
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
                        aria-label={t("hr.workSchedule.form.periodType")}
                        className="h-10 w-full min-w-[120px] rounded-lg border border-hr-border bg-hr-surface px-3 text-center outline-none focus:border-hr-primary"
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
                        aria-label={t("hr.workSchedule.form.fromTime")}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <TimeInput
                        value={row.timeTo}
                        onChange={(value) => updatePeriodRow(row.localId, { timeTo: value })}
                        aria-label={t("hr.workSchedule.form.toTime")}
                      />
                    </td>                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removePeriodRow(row.localId)}
                        className="text-red-400 transition hover:text-red-600"
                        aria-label={t("hr.workSchedule.form.deletePeriod")}
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
                        : "text-hr-muted hover:bg-hr-hover",
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
            <p className={alertErrorClass}>
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
            {saving ? t("hr.workSchedule.saving") : t("hr.workSchedule.saveSchedule")}
          </button>
          <button
            type="button"
            onClick={goBackToScheduleList}
            className={cancelBtnClass}
          >
            {t("common.cancel")}
          </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-hr-border bg-hr-surface p-4 shadow-card sm:p-5">
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
          <thead className="bg-hr-table-head text-hr-muted">
            <tr>
              <th className="px-3 py-3 text-center font-medium">{t("table.columns.index")}</th>
              <th className="px-3 py-3 text-center font-medium">{t("table.columns.id")}</th>
              <th className="px-3 py-3 text-center font-medium">{t("hr.workSchedule.columns.scheduleName")}</th>
              <th className="px-3 py-3 text-center font-medium">{t("hr.workSchedule.columns.periodsCount")}</th>
              <th className="px-3 py-3 text-center font-medium">{t("hr.workSchedule.columns.workingDays")}</th>
              <th className="px-3 py-3 text-center font-medium">{t("hr.workSchedule.columns.weeklyHours")}</th>
              <th className="px-3 py-3 text-center font-medium">{t("hr.workSchedule.columns.dailyHours")}</th>
              <th className="px-3 py-3 text-center font-medium">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-hr-muted">
                  {t("common.loading")}
                </td>
              </tr>
            ) : (
              schedules.map((item, idx) => (
                <tr
                  key={item.id}
                  className={[
                    "cursor-pointer",
                    idx % 2 ? "bg-hr-table-head" : "bg-hr-surface",
                    focusedScheduleId === item.id ? "ring-1 ring-inset ring-[#5BB8E8]" : "",
                  ].join(" ")}
                  onClick={() => openScheduleInUrl(item.id)}
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
                    {formatHoursLabel(item.totalWorkingHoursWeekly, hoursSuffix)}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {formatHoursLabel(item.averageWorkingHoursPerDay, hoursSuffix)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openScheduleInUrl(item.id);
                        }}
                        className="text-amber-500"
                        aria-label={t("common.edit")}
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
                        aria-label={t("common.delete")}
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
                  {t("hr.workSchedule.empty")}
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
          aria-label={t("table.pagination.previous")}
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
              pageNumber === page ? "bg-hr-primary text-white" : "text-hr-muted hover:bg-hr-hover",
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
          aria-label={t("table.pagination.next")}
        >
          ›
        </button>
      </div>
    </section>
  );
}
