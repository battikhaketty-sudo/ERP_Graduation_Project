import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import { employeePath } from "../../constants/entityPaths";
import type { ProjectMember } from "../../types/project";
import { TableAddButton } from "../ui/TableToolbar";
import { Pagination } from "../Pagination";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { EntityLink } from "../ui/EntityLink";
import { TableRowIndex } from "../ui/TableRowIndex";
import { MemberRoleBadge } from "./ProjectBadges";

export const MEMBERS_PAGE_SIZE = 5;

type ProjectMembersTableProps = {
  members: ProjectMember[];
  currentPage: number;
  totalPages: number;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onEdit: (member: ProjectMember) => void;
  onDelete: (member: ProjectMember) => void;
  showAddButton?: boolean;
  onAddClick?: () => void;
  onLeaveProject?: () => void;
};

export function ProjectMembersTable({
  members,
  currentPage,
  totalPages,
  loading,
  onPageChange,
  onEdit,
  onDelete,
  showAddButton,
  onAddClick,
  onLeaveProject,
}: ProjectMembersTableProps) {
  const { t } = useTranslation();

  return (
    <section className="hr-card">
      {(showAddButton || onLeaveProject) && (
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-5">
          {showAddButton ? (
            <TableAddButton
              label={t("projects.members.addMember")}
              onClick={() => onAddClick?.()}
              className="rounded-xl bg-[#F5A623] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#E8940A]"
            />
          ) : null}
          {onLeaveProject ? (
            <button
              type="button"
              onClick={onLeaveProject}
              className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
            >
              {t("projects.detail.leaveProject")}
            </button>
          ) : null}
        </div>
      )}

      <div className="overflow-hidden px-2 pb-2 pt-3 sm:px-4">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="hr-table-head">
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.index")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.id")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.employeeId")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.name")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.role")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.joinedAt")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.leftAt")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-hr-muted">
                  {t("common.loading")}
                </td>
              </tr>
            ) : members.length ? (
              members.map((member, index) => (
                <tr
                  key={member.id}
                  className={index % 2 ? "hr-table-row-alt" : "hr-table-row"}
                >
                  <td className="px-3 py-3 text-center text-hr-muted">
                    <TableRowIndex
                      index={index}
                      page={currentPage}
                      pageSize={MEMBERS_PAGE_SIZE}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CopyableIdCell value={member.id} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CopyableIdCell
                      value={member.employeeId}
                      to={employeePath(member.employeeId)}
                    />
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    <EntityLink
                      to={employeePath(member.employeeId)}
                      title={member.employeeName}
                    >
                      {member.employeeName}
                    </EntityLink>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <MemberRoleBadge role={member.role} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {member.joinedAt || t("common.dash")}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {member.leftAt || t("common.dash")}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(member)}
                        className="hr-icon-btn text-amber-500 hover:bg-amber-950/30"
                        aria-label={t("common.edit")}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(member)}
                        className="hr-icon-btn text-red-400 hover:bg-red-950/30"
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
                <td colSpan={8} className="px-3 py-10 text-center text-hr-muted">
                  {t("common.noData")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </section>
  );
}
