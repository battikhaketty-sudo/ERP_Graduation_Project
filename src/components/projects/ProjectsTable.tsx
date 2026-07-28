import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import { Pagination } from "../Pagination";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { TableRowIndex } from "../ui/TableRowIndex";
import { EmptyState } from "../EmptyState";
import { ProjectStatusBadge } from "./ProjectBadges";
import { getProjectListProgressPercent } from "./projectProgress";
import type { Project } from "../../types/project";

type ProjectsTableProps = {
  projects: Project[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onProjectClick: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
};

const PAGE_SIZE = 5;

function ProgressCell({ percent }: { percent: number }) {
  return (
    <div className="mx-auto flex w-full max-w-[120px] flex-col items-center gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-hr-border">
        <div
          className="h-full rounded-full bg-hr-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-hr-muted">{percent}%</span>
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
}: ProjectsTableProps) {
  const { t } = useTranslation();

  if (!projects.length) {
    return (
      <section className="hr-card">
        <EmptyState message={t("projects.table.empty")} />
      </section>
    );
  }

  return (
    <section className="hr-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="hr-table-head">
              <th className="px-3 py-3 text-center font-medium">{t("table.columns.index")}</th>
              <th className="px-3 py-3 text-center font-medium">{t("table.columns.id")}</th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.table.columns.name")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.table.columns.manager")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.table.columns.assignee")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.table.columns.description")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.table.columns.progress")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.table.columns.status")}
              </th>
              <th className="px-3 py-3 text-center font-medium">{t("table.columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
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
                <td className="px-3 py-3 text-center">
                  <CopyableIdCell value={project.id} />
                </td>
                <td className="truncate px-3 py-3 text-center font-medium text-hr-text">
                  {project.name}
                </td>
                <td className="px-3 py-3 text-center">{project.managerName}</td>
                <td className="px-3 py-3 text-center">{project.assignedEmployeeName}</td>
                <td className="truncate px-3 py-3 text-center text-hr-muted">
                  {project.description}
                </td>
                <td className="px-3 py-3 text-center">
                  <ProgressCell percent={getProjectListProgressPercent(project)} />
                </td>
                <td className="px-3 py-3 text-center">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(project);
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
                        onDelete(project);
                      }}
                      className="text-red-400"
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
