import { Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../../i18n";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { deleteRole, getRoles } from "../../services/roles";
import type { AppRole } from "../../types/role";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { Pagination } from "../Pagination";
import { TablePanelHeader } from "../ui/TablePanelHeader";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { TableRowIndex } from "../ui/TableRowIndex";
import { iconBtnClass } from "../ui/formStyles";
import { EditRoleModal } from "./EditRoleModal";
import { tablePanelClass, tableScrollClass, yesNoBadgeClass } from "./access-ui";

type RolesTabProps = {
  search: string;
  onNotice: (message: string | null) => void;
  onDataChanged: () => void;
};

type RoleModalState = { mode: "add" } | { mode: "edit"; roleId: string } | null;

const PAGE_SIZE = 10;

export function RolesTab({ search, onNotice, onDataChanged }: RolesTabProps) {
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<RoleModalState>(null);

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      onNotice(null);
      const result = await getRoles({
        page,
        limit: PAGE_SIZE,
        name: search.trim() || undefined,
      });
      setRoles(result.records);
      setTotalPages(result.meta.totalPages || 1);
    } catch (err) {
      onNotice(getThrownErrorMessage(err, t("access.roles.errors.loadList")));
    } finally {
      setLoading(false);
    }
  }, [onNotice, page, search, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRoles();
    }, search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [loadRoles, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const openAddModal = () => setModal({ mode: "add" });

  const handleDelete = async (role: AppRole) => {
    const confirmed = await confirm({
      message: t("access.roles.deleteConfirm", { name: role.name }),
    });
    if (!confirmed) return;

    try {
      await deleteRole(role.id);
      onNotice(null);
      onDataChanged();
      await loadRoles();
    } catch (err) {
      onNotice(getThrownErrorMessage(err, t("access.roles.errors.delete")));
    }
  };

  return (
    <>
      <section className={tablePanelClass}>
        <TablePanelHeader
          title={t("access.roles.title")}
          addLabel={t("access.roles.addLabel")}
          onAddClick={openAddModal}
        />

        <div className={tableScrollClass}>
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="bg-hr-table-head text-hr-muted">
              <tr>
                <th className="px-3 py-3 text-center font-medium">{t("table.columns.index")}</th>
                <th className="px-3 py-3 text-center font-medium">{t("table.columns.id")}</th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.roles.columns.name")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.roles.columns.description")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.roles.columns.level")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.roles.columns.isDefault")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("access.roles.columns.permissionsCount")}
                </th>
                <th className="px-3 py-3 text-center font-medium">{t("table.columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-hr-muted">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : !roles.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-hr-muted">
                    {t("access.roles.empty")}
                  </td>
                </tr>
              ) : (
                roles.map((role, index) => {
                  return (
                    <tr
                      key={role.id}
                      className={index % 2 ? "bg-hr-table-head" : "bg-hr-surface"}
                    >
                      <td className="px-3 py-3 text-center text-hr-muted">
                        <TableRowIndex page={page} index={index} pageSize={PAGE_SIZE} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <CopyableIdCell value={role.id} />
                      </td>
                      <td className="px-3 py-3 text-center font-medium text-hr-text">
                        {role.name}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-3 text-center text-hr-muted">
                        {role.description || t("common.dash")}
                      </td>
                      <td className="px-3 py-3 text-center text-hr-text">
                        {role.level}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={[
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            yesNoBadgeClass(role.isDefault),
                          ].join(" ")}
                        >
                          {role.isDefault ? t("common.yes") : t("common.no")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-hr-text">
                        {role.numberOfPermissions}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setModal({ mode: "edit", roleId: role.id })}
                            className={iconBtnClass}
                            aria-label={t("access.roles.editLabel")}
                          >
                            <Pencil className="size-4 text-amber-500" />
                          </button>
                          {!role.isFixed ? (
                            <button
                              type="button"
                              onClick={() => void handleDelete(role)}
                              className={iconBtnClass}
                              aria-label={t("common.delete")}
                            >
                              <Trash2 className="size-4 text-red-500" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </section>

      {modal ? (
        <EditRoleModal
          mode={modal.mode}
          roleId={modal.mode === "edit" ? modal.roleId : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            onDataChanged();
            void loadRoles();
          }}
        />
      ) : null}
    </>
  );
}
