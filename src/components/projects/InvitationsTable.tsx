import { useTranslation } from "../../i18n";
import { employeePath, projectPath } from "../../constants/entityPaths";
import { Pagination } from "../Pagination";
import {
  cardSurfaceClass,
  tableHeadRowClass,
  tableRowClass,
} from "../ui/formStyles";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { EntityLink } from "../ui/EntityLink";
import { TableRowIndex } from "../ui/TableRowIndex";
import { TableAddButton } from "../ui/TableToolbar";
import { InvitationStatusBadge } from "./ProjectBadges";
import type { ProjectInvitation } from "../../types/project";

type InvitationsTableProps = {
  invitations: ProjectInvitation[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onAccept: (invitation: ProjectInvitation) => void;
  onReject: (invitation: ProjectInvitation) => void;
  onCancel?: (invitation: ProjectInvitation) => void;
  /** When true, hide project columns (already inside a project). */
  projectScoped?: boolean;
  title?: string;
  emptyMessage?: string;
  showInviteButton?: boolean;
  onInviteClick?: () => void;
  /** Personal inbox: accept / reject. Project manage: cancel only. */
  actionsMode?: "personal" | "manage";
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
  projectScoped = false,
  title,
  emptyMessage,
  showInviteButton,
  onInviteClick,
  actionsMode = "personal",
}: InvitationsTableProps) {
  const { t } = useTranslation();
  const heading = title ?? t("projects.invitations.title");
  const empty = emptyMessage ?? t("projects.invitations.empty");
  const colSpan = projectScoped ? 8 : 10;

  return (
    <section className={`${cardSurfaceClass} min-w-0`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hr-border px-5 py-4">
        <h2 className="text-base font-bold text-hr-text">{heading}</h2>
        {showInviteButton ? (
          <TableAddButton
            label={t("pages.projects.inviteMember")}
            onClick={() => onInviteClick?.()}
          />
        ) : null}
      </div>
      <div className="min-w-0 max-w-full overflow-hidden">
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className={tableHeadRowClass}>
              <th className="px-2 py-3 text-center font-medium">
                {t("table.columns.index")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("table.columns.id")}
              </th>
              {!projectScoped && (
                <>
                  <th className="px-2 py-3 text-center font-medium">
                    {t("projects.invitations.columns.projectName")}
                  </th>
                  <th className="px-2 py-3 text-center font-medium">
                    {t("projects.invitations.columns.projectNumber")}
                  </th>
                </>
              )}
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.employeeName")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.status")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.responseDate")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.expiresAt")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("projects.invitations.columns.invitedAt")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("table.columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {invitations.length ? (
              invitations.map((invitation, index) => (
                <tr
                  key={invitation.id}
                  className={`border-t border-hr-border ${tableRowClass(index)}`}
                >
                  <td className="px-2 py-3 text-center text-hr-muted">
                    <TableRowIndex
                      index={index}
                      page={currentPage}
                      pageSize={PAGE_SIZE}
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <CopyableIdCell value={invitation.id} />
                  </td>
                  {!projectScoped && (
                    <>
                      <td className="truncate px-2 py-3 text-center font-medium">
                        <EntityLink
                          to={projectPath(invitation.projectId)}
                          title={invitation.projectName}
                        >
                          {invitation.projectName}
                        </EntityLink>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <CopyableIdCell
                          value={invitation.projectId}
                          to={projectPath(invitation.projectId)}
                        />
                      </td>
                    </>
                  )}
                  <td className="truncate px-2 py-3 text-center">
                    <EntityLink
                      to={employeePath(invitation.employeeId)}
                      title={invitation.employeeName}
                    >
                      {invitation.employeeName}
                    </EntityLink>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <InvitationStatusBadge status={invitation.status} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-center">
                    {invitation.respondedAt || t("common.dash")}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-center">
                    {invitation.expiresAt || t("common.dash")}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-center">
                    {invitation.invitedAt}
                  </td>
                  <td className="px-2 py-3">
                    {invitation.status === "pending" ? (
                      <div className="mx-auto flex w-[5.5rem] flex-col gap-1">
                        {actionsMode === "personal" && (
                          <>
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
                          </>
                        )}
                        {actionsMode === "manage" && onCancel ? (
                          <button
                            type="button"
                            onClick={() => onCancel(invitation)}
                            className="rounded-md bg-slate-500 px-2 py-1 text-[11px] font-bold text-white hover:bg-slate-600"
                          >
                            {t("common.cancel")}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-hr-muted">{t("common.dash")}</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-3 py-10 text-center text-sm text-hr-muted"
                >
                  {empty}
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

export const INVITATIONS_PAGE_SIZE = PAGE_SIZE;
