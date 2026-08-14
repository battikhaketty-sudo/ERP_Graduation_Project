import { Pencil } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../../i18n";
import { getUsers } from "../../services/users";
import type { UserAccount } from "../../types/user";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { Pagination } from "../Pagination";
import { TablePanelHeader } from "../ui/TablePanelHeader";
import { TableRowIndex } from "../ui/TableRowIndex";
import { iconBtnClass } from "../ui/formStyles";
import { EditUserRolesModal } from "./EditUserRolesModal";
import { tablePanelClass, tableScrollClass, yesNoBadgeClass } from "./access-ui";

type UsersTabProps = {
  search: string;
  onNotice: (message: string | null) => void;
  onDataChanged: () => void;
};

const PAGE_SIZE = 10;

export function UsersTab({ search, onNotice, onDataChanged }: UsersTabProps) {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      onNotice(null);
      const result = await getUsers({
        page,
        limit: PAGE_SIZE,
        email: search.trim() || undefined,
      });
      setUsers(result.records);
      setTotalPages(result.meta.totalPages || 1);
    } catch (err) {
      onNotice(getThrownErrorMessage(err, t("access.users.errors.loadList")));
    } finally {
      setLoading(false);
    }
  }, [onNotice, page, search, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <>
      <section className={tablePanelClass}>
        <TablePanelHeader title={t("access.users.title")} />

        <div className={tableScrollClass}>
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-14" />
              <col />
              <col className="w-32" />
              <col className="w-28" />
            </colgroup>
            <thead className="bg-hr-table-head text-hr-muted">
              <tr>
                <th className="px-3 py-3 text-center font-medium">{t("table.columns.index")}</th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.users.columns.email")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.users.columns.isActive")}
                </th>
                <th className="px-3 py-3 text-center font-medium">{t("table.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-hr-muted">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : !users.length ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-hr-muted">
                    {t("access.users.empty")}
                  </td>
                </tr>
              ) : (
                users.map((user, index) => (
                  <tr
                    key={user.id}
                    className={index % 2 ? "bg-hr-table-head" : "bg-hr-surface"}
                  >
                    <td className="px-3 py-3 text-center text-hr-muted">
                      <TableRowIndex page={page} index={index} pageSize={PAGE_SIZE} />
                    </td>
                    <td className="truncate px-3 py-3 text-center font-medium text-hr-text">
                      {user.email}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                          yesNoBadgeClass(user.isActive),
                        ].join(" ")}
                      >
                        {user.isActive ? t("common.yes") : t("common.no")}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingUserId(user.id)}
                          className={iconBtnClass}
                          aria-label={t("access.users.editRolesTitle")}
                        >
                          <Pencil className="size-4 text-amber-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </section>

      {editingUserId ? (
        <EditUserRolesModal
          userId={editingUserId}
          onClose={() => setEditingUserId(null)}
          onSaved={() => {
            onDataChanged();
            void loadUsers();
          }}
        />
      ) : null}
    </>
  );
}
