import { useTranslation } from "../../i18n";
import { Pagination } from "../Pagination";
import {
  cardSurfaceClass,
  tableHeadRowClass,
  tableRowClass,
} from "../ui/formStyles";
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
  onCancel: (invitation: ProjectInvitation) => void;
};

const PAGE_SIZE = 5;

export function InvitationsTable({
  invitations,
  currentPage,
  totalPages,
  onPageChange,
  onAccept,
  onReject,
  onCancel,
}: InvitationsTableProps) {
  const { t } = useTranslation();

  if (!invitations.length) {
    return (
      <section className={cardSurfaceClass}>
        <EmptyState message={t("projects.invitations.empty")} />
      </section>
    );
  }

  return (
    <section className={`${cardSurfaceClass} min-w-0`}>
      <div className="border-b border-hr-border px-5 py-4">
        <h2 className="text-base font-bold text-hr-text">{t("projects.invitations.title")}</h2>
      </div>
      <div className="min-w-0 max-w-full overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <colgroup>
            <col className="w-12" />
            <col className="w-[7.5rem]" />
            <col />
            <col className="w-[7.5rem]" />
            <col />
            <col className="w-28" />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-[5.5rem]" />
          </colgroup>
          <thead>
            <tr className={tableHeadRowClass}>
              <th className="px-2 py-3 text-center font-medium">{t("table.columns.index")}</th>
              <th className="px-2 py-3 text-center font-medium">{t("table.columns.id")}</th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.projectName")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.projectNumber")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.employeeName")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.status")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.startDate")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.endDate")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.invitedAt")}
              </th>
              <th className="px-2 py-3 text-center font-medium">{t("table.columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation, index) => (
              <tr
                key={invitation.id}
                className={`border-t border-hr-border ${tableRowClass(index)}`}
              >
                <td className="px-2 py-3 text-center text-hr-muted">
                  <TableRowIndex index={index} page={currentPage} pageSize={PAGE_SIZE} />
                </td>
                <td className="px-2 py-3 text-center">
                  <CopyableIdCell value={invitation.id} />
                </td>
                <td className="truncate px-2 py-3 text-center font-medium">{invitation.projectName}</td>
                <td className="px-2 py-3 text-center">
                  <CopyableIdCell value={invitation.projectId} />
                </td>
                <td className="truncate px-2 py-3 text-center">{invitation.employeeName}</td>
                <td className="px-2 py-3 text-center">
                  <InvitationStatusBadge status={invitation.status} />
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-center">
                  {invitation.startDate || t("common.dash")}
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-center">
                  {invitation.endDate || t("common.dash")}
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-center">{invitation.invitedAt}</td>
                <td className="px-2 py-3">
                  {invitation.status === "pending" ? (
                    <div className="mx-auto flex w-[5.5rem] flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => onAccept(invitation)}
                        className="rounded-md bg-green-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-green-600"
                      >
                        {t("common.accept")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(invitation)}
                        className="rounded-md bg-red-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-600"
                      >
                        {t("common.reject")}
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancel(invitation)}
                        className="rounded-md bg-slate-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-slate-600"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-hr-muted">{t("common.dash")}</span>
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
