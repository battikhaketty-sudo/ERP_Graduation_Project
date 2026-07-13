import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../../i18n";
import { getPermissions } from "../../services/permissions";
import type { AppPermission } from "../../types/permission";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { Pagination } from "../Pagination";
import { TablePanelHeader } from "../ui/TablePanelHeader";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { TableRowIndex } from "../ui/TableRowIndex";
import { EditPermissionModal } from "./EditPermissionModal";
import { tablePanelClass, tableScrollClass } from "./access-ui";

type PermissionsTabProps = {
  search: string;
  onNotice: (message: string | null) => void;
  onDataChanged: () => void;
};

type PermissionModalState =
  | { mode: "add" }
  | { mode: "edit"; permission: AppPermission }
  | null;

const PAGE_SIZE = 10;

export function PermissionsTab({
  search,
  onNotice,
  onDataChanged,
}: PermissionsTabProps) {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<PermissionModalState>(null);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      onNotice(null);
      const result = await getPermissions({
        page,
        limit: PAGE_SIZE,
        name: search.trim() || undefined,
      });
      setPermissions(result.records);
      setTotalPages(result.meta.totalPages || 1);
    } catch (err) {
      onNotice(getThrownErrorMessage(err, t("access.permissions.errors.loadList")));
    } finally {
      setLoading(false);
    }
  }, [onNotice, page, search, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPermissions();
    }, search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadPermissions, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const openAddModal = () => setModal({ mode: "add" });

  return (
    <>
      <section className={tablePanelClass}>
        <TablePanelHeader
          title={t("access.permissions.title")}
          addLabel={t("access.permissions.addLabel")}
          onAddClick={openAddModal}
        />

        <div className={tableScrollClass}>
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-hr-table-head text-hr-muted">
              <tr>
                <th className="px-3 py-3 text-center font-medium">{t("table.columns.index")}</th>
                <th className="px-3 py-3 text-center font-medium">{t("table.columns.id")}</th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.permissions.columns.name")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.permissions.columns.description")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.permissions.columns.resourceType")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-hr-muted">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : !permissions.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-hr-muted">
                    {t("access.permissions.empty")}
                  </td>
                </tr>
              ) : (
                permissions.map((permission, index) => (
                  <tr
                    key={permission.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setModal({ mode: "edit", permission })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setModal({ mode: "edit", permission });
                      }
                    }}
                    className={[
                      "cursor-pointer transition-colors hover:bg-hr-table-hover",
                      index % 2 ? "bg-hr-table-head" : "bg-hr-surface",
                    ].join(" ")}
                    aria-label={t("access.permissions.editLabel")}
                  >
                    <td className="px-3 py-3 text-center text-hr-muted">
                      <TableRowIndex page={page} index={index} pageSize={PAGE_SIZE} />
                    </td>
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <CopyableIdCell value={permission.id} />
                    </td>
                    <td className="px-3 py-3 text-center font-medium text-hr-text">
                      {permission.name}
                    </td>
                    <td className="max-w-[260px] truncate px-3 py-3 text-center text-hr-muted">
                      {permission.description || t("common.dash")}
                    </td>
                    <td className="px-3 py-3 text-center text-hr-text">
                      {permission.resourceType || t("common.dash")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </section>

      {modal ? (
        <EditPermissionModal
          mode={modal.mode}
          permission={modal.mode === "edit" ? modal.permission : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            onDataChanged();
            void loadPermissions();
          }}
          onDeleted={() => {
            onNotice(null);
            onDataChanged();
            void loadPermissions();
          }}
        />
      ) : null}
    </>
  );
}
