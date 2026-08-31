import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "../../i18n";
import { getProjectTaskGraph } from "../../services/projects";
import type { Project, ProjectTask, TaskStats } from "../../types/project";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { cardSurfaceClass } from "../ui/formStyles";
import { StatusBanner } from "../ui/StatusBanner";
import { TableAddButton } from "../ui/TableToolbar";
import { buildProjectProgressSnapshot } from "./projectProgress";
import {
  TaskDependencyFlow,
  type TaskFlowFilter,
} from "./TaskDependencyFlow";

type ProjectFlowPanelProps = {
  project: Project;
  taskStats: TaskStats;
  onAddTask?: (sectionId?: string) => void;
  onEditTask?: (task: ProjectTask) => void;
  onDeleteTask?: (task: ProjectTask) => void;
};

const STATUS_COLORS: Record<string, string> = {
  onTrack: "#5BB8E8",
  late: "#FF6B6B",
};

function CompletionRing({ percent }: { percent: number }) {
  const size = 128;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative mx-auto size-32">
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-hr-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2F80ED"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-hr-primary">{percent}%</span>
      </div>
    </div>
  );
}

const FILTERS: TaskFlowFilter[] = ["all"];

export function ProjectFlowPanel({
  project,
  taskStats,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: ProjectFlowPanelProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filter] = useState<TaskFlowFilter>("all");
  const [graphTasks, setGraphTasks] = useState<ProjectTask[]>(project.tasks);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);

  const graphReloadKey = `${project.id}:${project.tasksCount ?? project.tasks.length}:${project.tasks
    .map((task) => `${task.id}:${task.title}:${task.dependencyCount ?? 0}`)
    .join("|")}`;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setGraphLoading(true);
      setGraphError(null);
      try {
        const tasks = await getProjectTaskGraph(project.id, project.tasks);
        if (!cancelled) setGraphTasks(tasks);
      } catch (err) {
        if (!cancelled) {
          setGraphTasks(project.tasks);
          setGraphError(
            getThrownErrorMessage(err, t("projects.detail.flow.loadError")),
          );
        }
      } finally {
        if (!cancelled) setGraphLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [graphReloadKey, project.id, project.tasks, t]);

  const snapshot = useMemo(
    () => buildProjectProgressSnapshot(project, taskStats),
    [project, taskStats],
  );

  return (
    <section className={`mb-5 ${cardSurfaceClass} overflow-hidden`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hr-border bg-hr-table-alt px-5 py-4">
        <div>
          <h3 className="text-base font-bold text-hr-text">
            {t("projects.detail.flow.title")}
          </h3>
          <p className="mt-1 text-sm text-hr-muted">
            {t("projects.detail.flow.subtitle")}
          </p>
        </div>
        {onAddTask ? (
          <TableAddButton
            label={t("projects.detail.flow.addTask")}
            onClick={() => onAddTask()}
          />
        ) : null}
      </div>

      <div className="space-y-5 p-5">
        <div className="rounded-2xl border border-hr-border bg-hr-surface p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-sm font-medium text-hr-text">
                {t("projects.detail.flow.tasksPath")}
              </p>
              <p className="text-xs text-hr-muted">
                {t("projects.detail.flow.graphHint")}
              </p>
            </div>
            <p className="text-xs text-hr-muted">
              {t("projects.detail.flow.taskCount", {
                count: graphTasks.length,
              })}
            </p>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("projects.detail.flow.searchPlaceholder")}
              className="h-10 min-w-[12rem] flex-1 rounded-xl border border-hr-border bg-hr-table-alt px-3 text-sm text-hr-text outline-none focus:border-hr-primary"
            />
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="rounded-lg bg-hr-primary px-3 py-2 text-xs font-semibold text-white"
                >
                  {t(`projects.detail.flow.filters.${key}`)}
                </button>
              ))}
            </div>
          </div>

          {graphError ? (
            <StatusBanner
              variant="error"
              message={graphError}
              className="mb-4"
            />
          ) : null}

          {graphLoading ? (
            <div className="flex h-[min(70vh,560px)] min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-hr-border bg-hr-table-alt px-4 text-sm text-hr-muted">
              {t("common.loading")}
            </div>
          ) : (
            <TaskDependencyFlow
              project={project}
              tasks={graphTasks}
              filter={filter}
              search={search}
              onEditTask={(task) => onEditTask?.(task)}
              onDeleteTask={(task) => onDeleteTask?.(task)}
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-hr-border bg-hr-surface p-4 text-center sm:col-span-2 lg:col-span-1">
            <p className="mb-3 text-sm font-medium text-hr-muted">
              {t("projects.detail.flow.completion")}
            </p>
            <CompletionRing percent={snapshot.completionPercent} />
            <p className="mt-3 text-xs text-hr-muted">
              {snapshot.taskStats.total
                ? t("projects.detail.flow.tasksSummary", {
                    total: snapshot.taskStats.total,
                    late: snapshot.taskStats.late,
                  })
                : t("projects.detail.flow.noTasks")}
            </p>
          </div>

          <div className="rounded-2xl border border-hr-border bg-hr-surface p-4">
            <p className="mb-4 text-sm font-medium text-hr-text">
              {t("projects.detail.flow.statusMix")}
            </p>
            <div className="space-y-3">
              {snapshot.statusDistribution.map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-hr-muted">
                      {t(`projects.detail.flow.status.${item.key}`)}
                    </span>
                    <span className="font-medium text-hr-text">
                      {item.count} · {item.percent}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-hr-border">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: STATUS_COLORS[item.key],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-hr-border bg-hr-surface p-4 sm:col-span-2 lg:col-span-1">
            <p className="mb-4 text-sm font-medium text-hr-text">
              {t("projects.detail.flow.timeline")}
            </p>
            {snapshot.timeline.hasRange ? (
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-hr-muted">
                  <span>{snapshot.timeline.startLabel}</span>
                  <span>{snapshot.timeline.endLabel}</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-hr-border">
                  <div
                    className={[
                      "h-full rounded-full transition-all",
                      snapshot.timeline.isOverdue ? "bg-red-500" : "bg-hr-primary",
                    ].join(" ")}
                    style={{
                      width: `${Math.min(100, snapshot.timeline.elapsedPercent)}%`,
                    }}
                  />
                  {!snapshot.timeline.isOverdue ? (
                    <span
                      className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-hr-surface bg-hr-primary"
                      style={{
                        insetInlineStart: `calc(${Math.min(100, snapshot.timeline.elapsedPercent)}% - 6px)`,
                      }}
                      title={t("projects.detail.flow.today")}
                    />
                  ) : null}
                </div>
                <p
                  className={[
                    "mt-2 text-xs",
                    snapshot.timeline.isOverdue ? "text-red-500" : "text-hr-muted",
                  ].join(" ")}
                >
                  {snapshot.timeline.isOverdue
                    ? t("projects.detail.flow.overdue")
                    : `${t("projects.detail.flow.today")} · ${snapshot.timeline.elapsedPercent}%`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-hr-muted">
                {t("projects.detail.flow.noTimeline")}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
