import { useEffect, useState } from "react";
import { useTranslation } from "../../i18n";
import { getProjectTaskGraph } from "../../services/projects";
import { isTaskCompletedByFinalSection } from "../../services/projects/taskDependencies";
import type { Project, ProjectTask, TaskStats } from "../../types/project";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { cardSurfaceClass } from "../ui/formStyles";
import { StatusBanner } from "../ui/StatusBanner";
import { TableAddButton } from "../ui/TableToolbar";
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

const FILTERS: TaskFlowFilter[] = ["all"];

export function ProjectFlowPanel({
  project,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: ProjectFlowPanelProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [filter] = useState<TaskFlowFilter>("all");
  const [graphTasks, setGraphTasks] = useState<ProjectTask[]>(
    project.tasks.filter(
      (task) => !isTaskCompletedByFinalSection(task, project.sections),
    ),
  );
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);

  const graphReloadKey = `${project.id}:${project.tasksCount ?? project.tasks.length}:${project.tasks
    .map((task) => `${task.id}:${task.sectionId}:${task.title}:${task.dependencyCount ?? 0}`)
    .join("|")}`;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setGraphLoading(true);
      setGraphError(null);
      try {
        const tasks = await getProjectTaskGraph(project.id, project.tasks);
        if (!cancelled) {
          setGraphTasks(
            tasks.filter(
              (task) => !isTaskCompletedByFinalSection(task, project.sections),
            ),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setGraphTasks(
            project.tasks.filter(
              (task) => !isTaskCompletedByFinalSection(task, project.sections),
            ),
          );
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
      </div>
    </section>
  );
}
