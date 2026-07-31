import { CheckCircle2, Pencil, RotateCcw, Play, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import { DetailBackButton } from "../ui/DetailBackButton";
import { useMemo, useState } from "react";
import type {
  Project,
  ProjectSection,
  ProjectTask,
  TaskStatus,
} from "../../types/project";
import { pointsForPriority } from "../../services/projects/performancePoints";
import { Pagination } from "../Pagination";
import { TableAddButton } from "../ui/TableToolbar";
import { TableRowIndex } from "../ui/TableRowIndex";
import { PriorityBadge, TaskStatusBadge } from "./ProjectBadges";

export const SECTION_TASKS_PAGE_SIZE = 5;

type SectionDetailViewProps = {
  project: Project;
  section: ProjectSection;
  onBack: () => void;
  onEditSection: () => void;
  onDeleteSection: () => void;
  onAddTask: () => void;
  onEditTask: (task: ProjectTask) => void;
  onDeleteTask: (task: ProjectTask) => void;
  onSetTaskStatus: (task: ProjectTask, status: TaskStatus) => void;
};

export function SectionDetailView({
  project,
  section,
  onBack,
  onEditSection,
  onDeleteSection,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onSetTaskStatus,
}: SectionDetailViewProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const sectionTasks = useMemo(
    () => project.tasks.filter((task) => task.sectionId === section.id),
    [project.tasks, section.id],
  );

  const totalPages = Math.max(1, Math.ceil(sectionTasks.length / SECTION_TASKS_PAGE_SIZE));
  const paginatedTasks = sectionTasks.slice(
    (page - 1) * SECTION_TASKS_PAGE_SIZE,
    page * SECTION_TASKS_PAGE_SIZE,
  );

  return (
    <main className="min-w-0 flex-1 bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
      <DetailBackButton
        label={t("projects.sectionDetail.backLabel")}
        onClick={onBack}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-hr-primary px-5 py-4 text-white">
        <div>
          <h1 className="text-xl font-bold">{section.name}</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEditSection}
            className="rounded-xl bg-hr-surface px-5 py-2 text-sm font-bold text-hr-primary"
          >
            {t("common.edit")}
          </button>
          <button
            type="button"
            onClick={onDeleteSection}
            className="rounded-xl bg-hr-surface px-5 py-2 text-sm font-bold text-red-400"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>

      <section className="hr-card">
        <div className="px-4 pt-4 sm:px-5">
          <TableAddButton
            label={t("projects.sectionDetail.addTask")}
            onClick={onAddTask}
            className="inline-flex items-center gap-2 rounded-xl border border-hr-border bg-hr-accent-bg px-4 py-2 text-sm font-bold text-hr-accent-text"
          />
        </div>

        <div className="overflow-x-auto px-2 pb-2 pt-3 sm:px-4">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="hr-table-head">
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("table.columns.index")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.sectionDetail.columns.title")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.sectionDetail.columns.priority")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.sectionDetail.columns.status")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.sectionDetail.columns.assignees")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("table.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.length ? (
                paginatedTasks.map((task, index) => {
                  const isCompleted = task.status === "completed";
                  const points = pointsForPriority(task.priority);
                  return (
                    <tr
                      key={task.id}
                      className={index % 2 ? "hr-table-row-alt" : "hr-table-row"}
                    >
                      <td className="px-2 py-2.5 text-center text-xs text-hr-muted">
                        <TableRowIndex
                          index={index}
                          page={page}
                          pageSize={SECTION_TASKS_PAGE_SIZE}
                        />
                      </td>
                      <td
                        className="max-w-[12rem] truncate px-2 py-2.5 text-center font-medium"
                        title={task.title}
                      >
                        {task.title}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <TaskStatusBadge status={task.status} />
                      </td>
                      <td
                        className="max-w-[8rem] truncate px-2 py-2.5 text-center text-xs"
                        title={task.assigneeNames.join(", ") || undefined}
                      >
                        {task.assigneeNames.length
                          ? task.assigneeNames.length === 1
                            ? task.assigneeNames[0]
                            : task.assigneeNames.length
                          : t("common.dash")}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {!isCompleted && task.status !== "in_progress" && (
                            <button
                              type="button"
                              onClick={() => onSetTaskStatus(task, "in_progress")}
                              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 px-2 py-1 text-[11px] font-medium text-sky-600 transition hover:bg-sky-50 dark:border-sky-900 dark:text-sky-400 dark:hover:bg-sky-950/40"
                              title={t("projects.sectionDetail.startProgress")}
                            >
                              <Play className="size-3.5" />
                              {t("projects.sectionDetail.startProgress")}
                            </button>
                          )}
                          {!isCompleted ? (
                            <button
                              type="button"
                              onClick={() => onSetTaskStatus(task, "completed")}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2 py-1 text-[11px] font-medium text-emerald-600 transition hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                              title={t("projects.sectionDetail.pointsOnComplete", {
                                points,
                              })}
                            >
                              <CheckCircle2 className="size-3.5" />
                              {t("projects.sectionDetail.markComplete")}
                              <span className="text-[10px] opacity-80">
                                {t("projects.sectionDetail.pointsOnComplete", {
                                  points,
                                })}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSetTaskStatus(task, "todo")}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-[11px] font-medium text-amber-600 transition hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-950/40"
                              title={t("projects.sectionDetail.reopen")}
                            >
                              <RotateCcw className="size-3.5" />
                              {t("projects.sectionDetail.reopen")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            className="text-amber-500"
                            aria-label={t("common.edit")}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTask(task)}
                            className="text-red-400"
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-hr-muted">
                    {t("common.noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-hr-border px-4 py-3">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </section>
    </main>
  );
}
