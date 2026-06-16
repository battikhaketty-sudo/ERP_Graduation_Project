import { Pencil, Trash2 } from "lucide-react";
import { Pagination } from "../Pagination";
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
};

const PAGE_SIZE = 5;

export function ProjectsTable({
  projects,
  currentPage,
  totalPages,
  onPageChange,
  onProjectClick,
  onEdit,
  onDelete,
}: ProjectsTableProps) {
  if (!projects.length) {
    return (
      <section className="overflow-hidden rounded-2xl bg-white shadow-card">
        <EmptyState message="لا توجد مشاريع" />
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-[#F5FAFD] text-hr-muted">
              <th className="px-3 py-3 text-center font-medium">#</th>
              <th className="px-3 py-3 text-center font-medium">اسم المشروع</th>
              <th className="px-3 py-3 text-center font-medium">المدير المباشر</th>
              <th className="px-3 py-3 text-center font-medium">الموظف المكلف</th>
              <th className="px-3 py-3 text-center font-medium">الوصف</th>
              <th className="px-3 py-3 text-center font-medium">تاريخ البداية</th>
              <th className="px-3 py-3 text-center font-medium">تاريخ النهاية</th>
              <th className="px-3 py-3 text-center font-medium">الحالة</th>
              <th className="px-3 py-3 text-center font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
              <tr
                key={project.id}
                className={[
                  "cursor-pointer border-t border-hr-border transition hover:bg-[#F8FBFE]",
                  index % 2 ? "bg-[#FAFCFE]" : "bg-white",
                ].join(" ")}
                onClick={() => onProjectClick(project)}
              >
                <td className="px-3 py-3 text-center text-hr-muted">
                  {(currentPage - 1) * PAGE_SIZE + index + 1}
                </td>
                <td className="truncate px-3 py-3 text-center font-medium text-hr-text">
                  {project.name}
                </td>
                <td className="px-3 py-3 text-center">{project.managerName}</td>
                <td className="px-3 py-3 text-center">{project.assignedEmployeeName}</td>
                <td className="truncate px-3 py-3 text-center text-hr-muted">{project.description}</td>
                <td className="px-3 py-3 text-center">{project.startDate}</td>
                <td className="px-3 py-3 text-center">{project.endDate}</td>
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
                      aria-label="تعديل"
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
                      aria-label="حذف"
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
