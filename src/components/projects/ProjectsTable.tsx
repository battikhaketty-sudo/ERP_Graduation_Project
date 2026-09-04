import { ListPlus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import { employeePath } from "../../constants/entityPaths";
import { Pagination } from "../Pagination";
import { TableRowIndex } from "../ui/TableRowIndex";
import { EntityLink } from "../ui/EntityLink";
import { EmptyState } from "../EmptyState";
import { ProjectStatusBadge } from "./ProjectBadges";
import type { Project } from "../../types/project";

type ProjectsTableProps = {
  projects: Project[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onProjectClick: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onAddTask?: (project: Project) => void;
  onAddClick?: () => void;
};

const PAGE_SIZE = 5;

function isOverdue(endDate: string, status: Project["status"]) {
  if (!endDate || status === "completed") return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

function RowActions({
  project,
  onEdit,
  onDelete,
  onAddTask,
}: {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onAddTask?: (project: Project) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {onAddTask && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAddTask(project);
          }}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-hr-primary px-2.5 text-xs font-bold text-white transition hover:bg-hr-primary-hover"
          title={t("projects.table.actions.addTask")}
        >
          <ListPlus className="size-3.5" />
          <span className="hidden sm:inline">{t("projects.table.actions.addTask")}</span>
        </button>
      )}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit(project);
        }}
        className="inline-flex h-8 items-center gap-1 rounded-lg border border-hr-border bg-hr-surface px-2.5 text-xs font-semibold text-hr-text transition hover:bg-hr-hover"
        title={t("projects.table.actions.changeStatus")}
      >
        <Pencil className="size-3.5 text-amber-500" />
        <span className="hidden lg:inline">{t("projects.table.actions.changeStatus")}</span>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(project);
        }}
        className="inline-flex size-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/30"
        aria-label={t("common.delete")}
        title={t("common.delete")}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export function ProjectsTable({
  projects,
  currentPage,
  totalPages,
  onPageChange,
  onProjectClick,
  onEdit,
  onDelete,
  onAddTask,
  onAddClick,
}: ProjectsTableProps) {
  const { t } = useTranslation();

  if (!projects.length) {
    return (
      <section className="hr-card">
        <EmptyState
          message={t("projects.table.empty")}
          actionLabel={onAddClick ? t("pages.projects.addProject") : undefined}
          onAction={onAddClick}
        />
      </section>
    );
  }

  return (
    <section className="hr-card">
      {/* Mobile: one card per project — what the user needs now */}
      <div className="space-y-3 p-3 md:hidden">
        {projects.map((project) => {
          const overdue = isOverdue(project.endDate, project.status);
          return (
            <article
              key={project.id}
              className="rounded-2xl border border-hr-border bg-hr-surface p-4 shadow-sm transition hover:border-hr-primary/40"
            >
              <button
                type="button"
                onClick={() => onProjectClick(project)}
                className="mb-3 flex w-full items-start justify-between gap-2 text-start"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold text-hr-text">{project.name}</h3>
                  <p className="mt-0.5 text-xs text-hr-muted">
                    {t("projects.table.columns.manager")}:{" "}
                    <EntityLink to={employeePath(project.managerId)}>
                      {project.managerName || t("common.dash")}
                    </EntityLink>
                  </p>
                </div>
                <ProjectStatusBadge status={project.status} />
              </button>
              <button
                type="button"
                onClick={() => onProjectClick(project)}
                className="mb-3 w-full text-start text-xs"
              >
                <p className="text-hr-muted">{t("projects.table.columns.endDate")}</p>
                <p
                  className={[
                    "mt-1 font-medium",
                    overdue ? "text-red-500" : "text-hr-text",
                  ].join(" ")}
                >
                  {project.endDate || t("common.dash")}
                </p>
              </button>
              <RowActions
                project={project}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddTask={onAddTask}
              />
            </article>
          );
        })}
      </div>

      {/* Desktop table: name, status, owner, deadline */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="hr-table-head">
              <th className="w-12 px-3 py-3 text-center font-medium">
                {t("table.columns.index")}
              </th>
              <th className="px-3 py-3 text-start font-medium">
                {t("projects.table.columns.name")}
              </th>
              <th className="w-[120px] px-3 py-3 text-center font-medium">
                {t("projects.table.columns.status")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.table.columns.manager")}
              </th>
              <th className="w-[120px] px-3 py-3 text-center font-medium">
                {t("projects.table.columns.endDate")}
              </th>
              <th className="w-[220px] px-3 py-3 text-center font-medium">
                {t("table.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => {
              const overdue = isOverdue(project.endDate, project.status);
              return (
                <tr
                  key={project.id}
                  className={[
                    "cursor-pointer border-t border-hr-border",
                    index % 2 ? "hr-table-row-alt" : "hr-table-row",
                  ].join(" ")}
                  onClick={() => onProjectClick(project)}
                >
                  <td className="px-3 py-3 text-center text-hr-muted">
                    <TableRowIndex index={index} page={currentPage} pageSize={PAGE_SIZE} />
                  </td>
                  <td className="truncate px-3 py-3 text-start font-medium text-hr-text">
                    {project.name}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <ProjectStatusBadge status={project.status} />
                  </td>
                  <td className="truncate px-3 py-3 text-center">
                    <EntityLink to={employeePath(project.managerId)}>
                      {project.managerName || t("common.dash")}
                    </EntityLink>
                  </td>
                  <td
                    className={[
                      "px-3 py-3 text-center font-medium",
                      overdue ? "text-red-500" : "text-hr-text",
                    ].join(" ")}
                  >
                    {project.endDate || t("common.dash")}
                  </td>
                  <td className="px-3 py-3">
                    <RowActions
                      project={project}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAddTask={onAddTask}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </section>
  );
}

export const PROJECTS_PAGE_SIZE = PAGE_SIZE;
