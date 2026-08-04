import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import { DetailBackButton } from "../ui/DetailBackButton";
import { useMemo, useState } from "react";
import type { Project, ProjectSection, ProjectTask } from "../../types/project";
import { Pagination } from "../Pagination";
import { TableAddButton } from "../ui/TableToolbar";
import { TableRowIndex } from "../ui/TableRowIndex";
import { PriorityBadge } from "./ProjectBadges";

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

        <div className="px-2 pb-2 pt-3 sm:px-4">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-10" />
              <col className="w-12" />
              <col />
              <col className="w-[5.25rem]" />
              <col className="w-[18%]" />
              <col className="w-14" />
              <col className="w-[5.5rem]" />
              <col className="w-[5.5rem]" />
              <col className="w-[4.5rem]" />
              <col className="w-[4.5rem]" />
            </colgroup>
            <thead>
              <tr className="hr-table-head">
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("table.columns.index")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.detail.fields.number")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.sectionDetail.columns.title")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.sectionDetail.columns.priority")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.table.columns.description")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.sectionDetail.columns.hours")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.detail.fields.startDate")}
                </th>
                <th className="px-2 py-2.5 text-center text-xs font-medium">
                  {t("projects.detail.fields.endDate")}
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
                paginatedTasks.map((task, index) => (
                  <tr key={task.id} className={index % 2 ? "hr-table-row-alt" : "hr-table-row"}>
                    <td className="px-2 py-2.5 text-center text-xs text-hr-muted">
                      <TableRowIndex
                        index={index}
                        page={page}
                        pageSize={SECTION_TASKS_PAGE_SIZE}
                      />
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs">{task.number}</td>
                    <td className="truncate px-2 py-2.5 text-center font-medium" title={task.title}>
                      {task.title}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td
                      className="truncate px-2 py-2.5 text-center text-xs text-hr-muted"
                      title={task.description || undefined}
                    >
                      {task.description || t("common.dash")}
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs">{task.expectedHours}</td>
                    <td className="px-2 py-2.5 text-center text-xs whitespace-nowrap">
                      {task.startDate || t("common.dash")}
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs whitespace-nowrap">
                      {task.dueDate || t("common.dash")}
                    </td>
                    <td
                      className="truncate px-2 py-2.5 text-center text-xs"
                      title={task.assigneeNames.join(", ") || undefined}
                    >
                      {task.assigneeNames.length
                        ? task.assigneeNames.length === 1
                          ? task.assigneeNames[0]
                          : task.assigneeNames.length
                        : t("common.dash")}
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
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
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-3 py-10 text-center text-hr-muted">
                    {t("common.noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </section>
    </main>
  );
}
