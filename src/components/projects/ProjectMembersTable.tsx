import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "../../i18n";
import type { ProjectMember } from "../../types/project";
import { TableAddButton } from "../ui/TableToolbar";
import { Pagination } from "../Pagination";
import { CopyableIdCell } from "../ui/CopyableIdCell";
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
}: ProjectMembersTableProps) {
  const { t } = useTranslation();

  return (
    <section className="hr-card">
      {showAddButton && (
        <div className="px-4 pt-4 sm:px-5">
          <TableAddButton
            label={t("projects.members.addMember")}
            onClick={() => onAddClick?.()}
            className="rounded-xl bg-[#F5A623] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#E8940A]"
          />
        </div>
      )}

      <div className="overflow-x-auto px-2 pb-2 pt-3 sm:px-4">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="hr-table-head">
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.index")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.id")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.detail.fields.managerId")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.name")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.members.columns.role")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.detail.fields.startDate")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("projects.detail.fields.endDate")}
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
                    {member.employeeId || t("common.dash")}
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    {member.employeeName}
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
