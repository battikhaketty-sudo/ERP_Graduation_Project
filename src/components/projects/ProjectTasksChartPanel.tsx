import { useMemo } from "react";
import { useTranslation } from "../../i18n";
import type { Project } from "../../types/project";
import { cardSurfaceClass } from "../ui/formStyles";
import { TableAddButton } from "../ui/TableToolbar";
import {
  buildProjectChartSnapshot,
  formatTaskDate,
  priorityTypeCode,
  type ChartMonthBucket,
} from "./projectChart";

type ProjectTasksChartPanelProps = {
  project: Project;
  onAddTask?: (sectionId?: string) => void;
};

const CHART = {
  width: 520,
  height: 280,
  padTop: 36,
  padRight: 20,
  padBottom: 40,
  padLeft: 44,
};

function ChartValueLabel({
  x,
  y,
  value,
  tone = "primary",
}: {
  x: number;
  y: number;
  value: number | string;
  tone?: "primary" | "accent";
}) {
  const fillClass =
    tone === "accent" ? "fill-sky-300 dark:fill-sky-200" : "fill-hr-text";
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={12}
      fontWeight={700}
      className={fillClass}
      style={{ paintOrder: "stroke", stroke: "rgb(var(--hr-surface))", strokeWidth: 3 }}
    >
      {value}
    </text>
  );
}

function ComboChart({
  months,
  maxHours,
  maxCount,
}: {
  months: ChartMonthBucket[];
  maxHours: number;
  maxCount: number;
}) {
  const { t } = useTranslation();
  const innerW = CHART.width - CHART.padLeft - CHART.padRight;
  const innerH = CHART.height - CHART.padTop - CHART.padBottom;
  const n = months.length || 1;
  const slot = innerW / n;
  const barW = Math.min(32, Math.max(12, slot * 0.45));
  const hoursScale = maxHours > 0 ? maxHours : 1;
  const countScale = maxCount > 0 ? maxCount : 1;

  const barCenters = months.map((_, i) => CHART.padLeft + slot * i + slot / 2);
  const hoursY = (value: number) =>
    CHART.padTop + innerH - (value / hoursScale) * innerH;
  const countY = (value: number) =>
    CHART.padTop + innerH - (value / countScale) * innerH;

  const linePoints = months
    .map((month, i) => `${barCenters[i]},${countY(month.count)}`)
    .join(" ");

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: Math.round(hoursScale * ratio),
    y: CHART.padTop + innerH * (1 - ratio),
  }));

  if (!months.length) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-hr-muted">
        {t("projects.detail.chart.noChartData")}
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      className="h-auto w-full max-h-[300px] text-hr-text"
      role="img"
      aria-label={t("projects.detail.chart.title")}
    >
      {yTicks.map((tick) => (
        <g key={`tick-${tick.ratio}`}>
          <line
            x1={CHART.padLeft}
            y1={tick.y}
            x2={CHART.width - CHART.padRight}
            y2={tick.y}
            stroke="currentColor"
            className="text-hr-border"
            strokeWidth={1}
            strokeDasharray={tick.ratio === 0 ? undefined : "3 4"}
            opacity={tick.ratio === 0 ? 1 : 0.7}
          />
          <text
            x={CHART.padLeft - 8}
            y={tick.y + 4}
            textAnchor="end"
            fontSize={11}
            fontWeight={600}
            className="fill-hr-muted"
          >
            {tick.value}
          </text>
        </g>
      ))}

      <line
        x1={CHART.padLeft}
        y1={CHART.padTop}
        x2={CHART.padLeft}
        y2={CHART.padTop + innerH}
        stroke="currentColor"
        className="text-hr-border"
        strokeWidth={1.5}
      />

      {months.map((month, i) => {
        const x = barCenters[i] - barW / 2;
        const y = hoursY(month.hours);
        const h = Math.max(month.hours > 0 ? 2 : 0, CHART.padTop + innerH - y);
        return (
          <g key={month.key}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={4}
              className="fill-sky-400/90 dark:fill-sky-400"
            />
            {month.hours > 0 ? (
              <ChartValueLabel
                x={barCenters[i]}
                y={y - 8}
                value={Math.round(month.hours)}
                tone="primary"
              />
            ) : null}
            <text
              x={barCenters[i]}
              y={CHART.height - 14}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              className="fill-hr-muted"
            >
              {month.label}
            </text>
          </g>
        );
      })}

      {months.some((m) => m.count > 0) ? (
        <>
          <polyline
            points={linePoints}
            fill="none"
            className="stroke-sky-700 dark:stroke-sky-300"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {months.map((month, i) => (
            <g key={`pt-${month.key}`}>
              <circle
                cx={barCenters[i]}
                cy={countY(month.count)}
                r={5}
                className="fill-sky-700 dark:fill-sky-300"
                stroke="rgb(var(--hr-surface))"
                strokeWidth={2}
              />
              {month.count > 0 ? (
                <ChartValueLabel
                  x={barCenters[i]}
                  y={countY(month.count) - 12}
                  value={month.count}
                  tone="accent"
                />
              ) : null}
            </g>
          ))}
        </>
      ) : null}
    </svg>
  );
}

export function ProjectTasksChartPanel({
  project,
  onAddTask,
}: ProjectTasksChartPanelProps) {
  const { t, locale } = useTranslation();
  const snapshot = useMemo(
    () => buildProjectChartSnapshot(project, locale === "ar" ? "ar" : "en"),
    [locale, project],
  );

  const tasks = project.tasks ?? [];

  return (
    <section className={`mb-5 ${cardSurfaceClass} overflow-hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hr-border bg-hr-table-alt px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-hr-text">
            {t("projects.detail.chart.title")}
          </h3>
          <p className="mt-1 text-sm text-hr-muted">
            {t("projects.detail.chart.subtitle")}
          </p>
        </div>
        {onAddTask ? (
          <TableAddButton
            label={t("projects.detail.chart.addTask")}
            onClick={() => onAddTask()}
          />
        ) : null}
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="min-w-0 border-b border-hr-border lg:border-b-0 lg:border-e">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="bg-hr-table-alt text-hr-muted">
                  <th className="px-3 py-2.5 text-start text-xs font-medium">
                    {t("projects.detail.chart.columns.description")}
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium whitespace-nowrap">
                    {t("projects.detail.chart.columns.planStart")}
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium whitespace-nowrap">
                    {t("projects.detail.chart.columns.planEnd")}
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-medium">
                    {t("projects.detail.chart.columns.type")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.length ? (
                  tasks.map((task, index) => {
                    const assignee = task.assigneeNames[0];
                    return (
                      <tr
                        key={task.id}
                        className={
                          index % 2 ? "bg-hr-table-alt/40" : "bg-hr-surface"
                        }
                      >
                        <td className="max-w-[220px] px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="truncate font-medium text-hr-text"
                              title={task.title || task.name}
                            >
                              {task.title || task.name || t("common.dash")}
                            </span>
                            {assignee ? (
                              <span className="shrink-0 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                {assignee}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td
                          className="px-3 py-2.5 text-center text-xs text-hr-muted whitespace-nowrap"
                          dir="ltr"
                        >
                          {formatTaskDate(task.startDate) || t("common.dash")}
                        </td>
                        <td
                          className="px-3 py-2.5 text-center text-xs text-hr-muted whitespace-nowrap"
                          dir="ltr"
                        >
                          {formatTaskDate(task.dueDate) || t("common.dash")}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs font-bold text-hr-text">
                          {priorityTypeCode(task.priority)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-sm text-hr-muted"
                    >
                      {t("projects.detail.chart.noTasks")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-4">
          <div className="mb-3 flex flex-wrap gap-4 text-xs font-medium text-hr-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-sm bg-sky-400" />
              {t("projects.detail.chart.legendHours")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-5 rounded bg-sky-700 dark:bg-sky-300" />
              {t("projects.detail.chart.legendCount")}
            </span>
          </div>
          <ComboChart
            months={snapshot.months}
            maxHours={snapshot.maxHours}
            maxCount={snapshot.maxCount}
          />
        </div>
      </div>
    </section>
  );
}
