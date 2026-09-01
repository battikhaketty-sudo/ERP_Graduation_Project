import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { useTranslation } from "../../i18n";
import { deletePermission, getAllPermissions, getPermissions } from "../../services/permissions";
import type { AppPermission } from "../../types/permission";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { filterByName, paginateItems } from "../../utils/filterByName";
import { Pagination } from "../Pagination";
import { TablePanelHeader } from "../ui/TablePanelHeader";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { TableRowIndex } from "../ui/TableRowIndex";
import { iconBtnClass } from "../ui/formStyles";
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
  const { confirm } = useConfirmDialog();
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<PermissionModalState>(null);

  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      onNotice(null);
      const query = search.trim();

      if (query) {
        const filtered = filterByName(await getAllPermissions(), query);
        const paged = paginateItems(filtered, page, PAGE_SIZE);
        setPermissions(paged.records);
        setTotalPages(paged.totalPages);
      } else {
        const result = await getPermissions({ page, limit: PAGE_SIZE });
        setPermissions(result.records);
        setTotalPages(result.meta.totalPages || 1);
      }
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

  const handleDelete = async (permission: AppPermission) => {
    if (permission.isFixed) return;

    const confirmed = await confirm({
      message: t("access.permissions.deleteConfirm", { name: permission.name }),
    });
    if (!confirmed) return;

    try {
      await deletePermission(permission.id);
      onNotice(null);
      onDataChanged();
      await loadPermissions();
    } catch (err) {
      onNotice(getThrownErrorMessage(err, t("access.permissions.errors.delete")));
    }
  };

  return (
    <>
      <section className={tablePanelClass}>
        <TablePanelHeader
          title={t("access.permissions.title")}
          addLabel={t("access.permissions.addLabel")}
          onAddClick={openAddModal}
        />

        <div className={tableScrollClass}>
          <table className="w-full min-w-[820px] border-collapse text-sm">
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
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.permissions.columns.isFixed")}
                </th>
                <th className="px-3 py-3 text-center font-medium">{t("table.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-hr-muted">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : !permissions.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-hr-muted">
                    {t("access.permissions.empty")}
                  </td>
                </tr>
              ) : (
                permissions.map((permission, index) => (
                  <tr
                    key={permission.id}
                    className={index % 2 ? "bg-hr-table-head" : "bg-hr-surface"}
                  >
                    <td className="px-3 py-3 text-center text-hr-muted">
                      <TableRowIndex page={page} index={index} pageSize={PAGE_SIZE} />
                    </td>
                    <td className="px-3 py-3 text-center">
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
                    <td className="px-3 py-3 text-center">
                      {permission.isFixed ? (
                        <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          {t("access.permissions.columns.isFixed")}
                        </span>
                      ) : (
                        <span className="text-hr-muted">{t("common.dash")}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setModal({ mode: "edit", permission })}
                          className={iconBtnClass}
                          aria-label={t("access.permissions.editLabel")}
                        >
                          <Pencil className="size-4 text-amber-500" />
                        </button>
                        {!permission.isFixed ? (
                          <button
                            type="button"
                            onClick={() => void handleDelete(permission)}
                            className={iconBtnClass}
                            aria-label={t("common.delete")}
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </button>
                        ) : null}
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
