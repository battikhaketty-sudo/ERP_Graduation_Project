import { Pagination } from "../Pagination";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { TableRowIndex } from "../ui/TableRowIndex";
import { EmptyState } from "../EmptyState";
import { InvitationStatusBadge } from "./ProjectBadges";
import type { ProjectInvitation } from "../../types/project";

type InvitationsTableProps = {
  invitations: ProjectInvitation[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAccept: (invitation: ProjectInvitation) => void;
  onReject: (invitation: ProjectInvitation) => void;
};

const PAGE_SIZE = 5;

export function InvitationsTable({
  invitations,
  currentPage,
  totalPages,
  onPageChange,
  onAccept,
  onReject,
}: InvitationsTableProps) {
  if (!invitations.length) {
    return (
      <section className="overflow-hidden rounded-2xl bg-white shadow-card">
        <EmptyState message="لا توجد دعوات" />
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="border-b border-hr-border px-5 py-4">
        <h2 className="text-base font-bold text-hr-text">إدارة الدعوات</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="bg-[#F5FAFD] text-hr-muted">
              <th className="px-3 py-3 text-center font-medium">#</th>
              <th className="px-3 py-3 text-center font-medium">id</th>
              <th className="px-3 py-3 text-center font-medium">اسم المشروع</th>
              <th className="px-3 py-3 text-center font-medium">رقم المشروع</th>
              <th className="px-3 py-3 text-center font-medium">اسم الموظف</th>
              <th className="px-3 py-3 text-center font-medium">الحالة</th>
              <th className="px-3 py-3 text-center font-medium">تاريخ البدء</th>
              <th className="px-3 py-3 text-center font-medium">تاريخ الانتهاء</th>
              <th className="px-3 py-3 text-center font-medium">تاريخ الدعوة</th>
              <th className="px-3 py-3 text-center font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation, index) => (
              <tr
                key={invitation.id}
                className={[
                  "border-t border-hr-border",
                  index % 2 ? "bg-[#FAFCFE]" : "bg-white",
                ].join(" ")}
              >
                <td className="px-3 py-3 text-center text-hr-muted">
                  <TableRowIndex index={index} page={currentPage} pageSize={PAGE_SIZE} />
                </td>
                <td className="px-3 py-3 text-center">
                  <CopyableIdCell value={invitation.id} />
                </td>
                <td className="px-3 py-3 text-center font-medium">{invitation.projectName}</td>
                <td className="px-3 py-3 text-center">{invitation.projectNumber}</td>
                <td className="px-3 py-3 text-center">{invitation.employeeName}</td>
                <td className="px-3 py-3 text-center">
                  <InvitationStatusBadge status={invitation.status} />
                </td>
                <td className="px-3 py-3 text-center">{invitation.startDate}</td>
                <td className="px-3 py-3 text-center">{invitation.endDate}</td>
                <td className="px-3 py-3 text-center">{invitation.invitedAt}</td>
                <td className="px-3 py-3">
                  {invitation.status === "pending" ? (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAccept(invitation)}
                        className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-600"
                      >
                        قبول
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(invitation)}
                        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600"
                      >
                        رفض
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-hr-muted">—</span>
                  )}
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

export const INVITATIONS_PAGE_SIZE = PAGE_SIZE;
