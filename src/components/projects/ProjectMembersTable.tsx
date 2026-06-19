import { Pencil, Trash2 } from "lucide-react";
import type { ProjectMember } from "../../types/project";
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
  return (
    <section className="rounded-2xl bg-white shadow-card">
      {showAddButton && (
        <div className="flex justify-end px-4 pt-4 sm:px-5">
          <button
            type="button"
            onClick={onAddClick}
            className="rounded-xl bg-[#F5A623] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#E8940A]"
          >
            + إضافة عضو جديد
          </button>
        </div>
      )}

      <div className="overflow-x-auto px-2 pb-2 pt-3 sm:px-4">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="text-hr-muted">
            <tr>
              <th className="px-3 py-3 text-center font-medium">#</th>
              <th className="px-3 py-3 text-center font-medium">id</th>
              <th className="px-3 py-3 text-center font-medium">رقم الموظف</th>
              <th className="px-3 py-3 text-center font-medium">اسم الموظف</th>
              <th className="px-3 py-3 text-center font-medium">الدور</th>
              <th className="px-3 py-3 text-center font-medium">
                تاريخ الانضمام
              </th>
              <th className="px-3 py-3 text-center font-medium">
                تاريخ المغادرة
              </th>
              <th className="px-3 py-3 text-center font-medium">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-hr-muted"
                >
                  جاري التحميل…
                </td>
              </tr>
            ) : members.length ? (
              members.map((member, index) => (
                <tr
                  key={member.id}
                  className={index % 2 ? "bg-[#FAFCFE]" : "bg-white"}
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
                    {member.employeeId || "—"}
                  </td>
                  <td className="px-3 py-3 text-center font-medium">
                    {member.employeeName}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <MemberRoleBadge role={member.role} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {member.joinedAt || "—"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {member.leftAt || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(member)}
                        className="rounded-lg p-1.5 text-amber-500 transition hover:bg-amber-50"
                        aria-label="تعديل"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(member)}
                        className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50"
                        aria-label="حذف"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-10 text-center text-hr-muted"
                >
                  لا يوجد أعضاء في هذا المشروع
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
