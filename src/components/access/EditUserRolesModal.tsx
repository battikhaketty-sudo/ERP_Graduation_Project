import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { useTranslation } from "../../i18n";
import { getAllRoles } from "../../services/roles";
import { getUserById, updateUserRoles } from "../../services/users";
import type { AppRole } from "../../types/role";
import type { UserAccount } from "../../types/user";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { Pagination } from "../Pagination";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { FormField } from "../ui/FormField";
import { ModalTitleBar } from "../ui/ModalTitleBar";
import {
  alertErrorClass,
  cancelBtnClass,
  infoBannerClass,
  modalBodyClass,
  modalClass,
  modalFooterClass,
  readOnlyClass,
} from "../ui/formStyles";
import { tablePanelClass, tableScrollClass, yesNoBadgeClass } from "./access-ui";

type EditUserRolesModalProps = {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

const PAGE_SIZE = 8;

export function EditUserRolesModal({ userId, onClose, onSaved }: EditUserRolesModalProps) {
  const { t } = useTranslation();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [roleSearch, setRoleSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [initialRoleIds, setInitialRoleIds] = useState<string[]>([]);
  const [fixedRoleIds, setFixedRoleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useModalDismiss(onClose, !saving);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [userData, allRoles] = await Promise.all([getUserById(userId), getAllRoles()]);
      const fixedIds = userData.roles
        .filter((role) => role.isFixed)
        .map((role) => role.roleId);
      const roleIds = Array.from(
        new Set([...userData.roles.map((role) => role.roleId), ...fixedIds]),
      );
      setUser(userData);
      setRoles(allRoles);
      setSelectedRoleIds(roleIds);
      setInitialRoleIds(roleIds);
      setFixedRoleIds(new Set(fixedIds));
      setRoleSearch("");
      setPage(1);
    } catch (err) {
      setError(getThrownErrorMessage(err, t("access.users.errors.load")));
    } finally {
      setLoading(false);
    }
  }, [t, userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRoles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    if (!query) return roles;
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        (role.description ?? "").toLowerCase().includes(query),
    );
  }, [roleSearch, roles]);

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / PAGE_SIZE));
  const pagedRoles = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRoles.slice(start, start + PAGE_SIZE);
  }, [filteredRoles, page]);

  useEffect(() => {
    setPage(1);
  }, [roleSearch]);

  const isDirty = useMemo(() => {
    const current = [...selectedRoleIds].sort().join(",");
    const initial = [...initialRoleIds].sort().join(",");
    return current !== initial;
  }, [initialRoleIds, selectedRoleIds]);

  const toggleRole = (roleId: string) => {
    if (fixedRoleIds.has(roleId)) return;
    setSelectedRoleIds((current) =>
      current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isDirty) return;

    setSaving(true);
    setError(null);
    try {
      const nextRoleIds = Array.from(new Set([...selectedRoleIds, ...fixedRoleIds]));
      await updateUserRoles(userId, nextRoleIds);
      onSaved();
      onClose();
    } catch (err) {
      setError(getThrownErrorMessage(err, t("access.users.errors.save")));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(event) => {
        if (!saving && event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className={`${modalClass} relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden`}
        noValidate
      >
        <ModalTitleBar
          title={t("access.users.editRolesTitle")}
          onClose={onClose}
          disabled={saving}
          variant="bordered"
        />

        <div className={`${modalBodyClass} min-h-0`}>
          {error ? <p className={`mb-4 ${alertErrorClass}`}>{error}</p> : null}

          {loading ? (
            <p className="py-8 text-center text-hr-muted">{t("common.loading")}</p>
          ) : (
            <>
              <div className="mb-5 grid gap-4 sm:grid-cols-3">
                <FormField label={t("access.users.columns.number")}>
                  <div className="flex h-11 items-center justify-center rounded-xl border border-hr-border bg-hr-hover px-4">
                    <CopyableIdCell value={user?.id || userId} head={6} tail={4} />
                  </div>
                </FormField>
                <FormField label={t("access.users.columns.email")}>
                  <input readOnly value={user?.email ?? ""} className={readOnlyClass} />
                </FormField>
                <FormField label={t("access.users.columns.isActive")}>
                  <div className="flex h-11 items-center justify-center rounded-xl border border-hr-border bg-hr-hover px-4">
                    <span
                      className={[
                        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                        yesNoBadgeClass(Boolean(user?.isActive)),
                      ].join(" ")}
                    >
                      {user?.isActive ? t("common.yes") : t("common.no")}
                    </span>
                  </div>
                </FormField>
              </div>

              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-hr-text">{t("access.users.rolesLabel")}</p>
                <span className="text-xs font-medium text-hr-muted">
                  {t("form.rolesSelected", { count: selectedRoleIds.length })}
                </span>
              </div>

              <div className="relative mb-3">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
                <input
                  value={roleSearch}
                  onChange={(event) => setRoleSearch(event.target.value)}
                  placeholder={t("form.searchRoles")}
                  className="h-10 w-full rounded-xl border border-hr-border bg-hr-input-bg pe-3 ps-10 text-start text-sm outline-none focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
                />
              </div>

              <div className={tablePanelClass}>
                <div className={tableScrollClass}>
                  <table className="w-full min-w-[720px] border-collapse text-sm">
                    <thead className="bg-hr-table-head text-hr-muted">
                      <tr>
                        <th className="px-3 py-3 text-center font-medium">
                          {t("table.columns.select")}
                        </th>
                        <th className="px-3 py-3 text-center font-medium">
                          {t("table.columns.index")}
                        </th>
                        <th className="px-3 py-3 text-center font-medium">
                          {t("access.roles.columns.name")}
                        </th>
                        <th className="px-3 py-3 text-center font-medium">
                          {t("access.roles.columns.isFixed")}
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
                      </tr>
                    </thead>
                    <tbody>
                      {!pagedRoles.length ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-hr-muted">
                            {roleSearch.trim() ? t("common.noResults") : t("access.roles.empty")}
                          </td>
                        </tr>
                      ) : (
                        pagedRoles.map((role, index) => {
                          const isFixed = fixedRoleIds.has(role.id);
                          const checked = selectedRoleIds.includes(role.id);
                          return (
                            <tr
                              key={role.id}
                              className={[
                                index % 2 ? "bg-hr-table-head" : "bg-hr-surface",
                                isFixed ? "opacity-70" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <td className="px-3 py-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={isFixed}
                                  readOnly={isFixed}
                                  onChange={() => toggleRole(role.id)}
                                  onClick={(event) => {
                                    if (isFixed) event.preventDefault();
                                  }}
                                  className="size-4 rounded border-hr-border text-hr-primary disabled:pointer-events-none disabled:cursor-not-allowed"
                                  title={
                                    isFixed ? t("access.users.fixedRoleHint") : undefined
                                  }
                                  aria-label={
                                    isFixed ? t("access.users.fixedRoleHint") : role.name
                                  }
                                />
                              </td>
                              <td className="px-3 py-3 text-center text-hr-muted">
                                {(page - 1) * PAGE_SIZE + index + 1}
                              </td>
                              <td className="px-3 py-3 text-center font-medium text-hr-text">
                                {role.name}
                              </td>
                              <td className="px-3 py-3 text-center">
                                {isFixed ? (
                                  <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                    {t("access.users.fixedRole")}
                                  </span>
                                ) : (
                                  <span className="text-hr-muted">{t("common.dash")}</span>
                                )}
                              </td>
                              <td className="max-w-[220px] truncate px-3 py-3 text-center text-hr-muted">
                                {role.description || t("common.dash")}
                              </td>
                              <td className="px-3 py-3 text-center text-hr-text">{role.level}</td>
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
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredRoles.length > PAGE_SIZE ? (
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                  />
                ) : null}
              </div>

              {isDirty ? (
                <p className={`mt-3 ${infoBannerClass}`}>{t("form.unsavedChanges")}</p>
              ) : (
                <p className="mt-3 text-xs text-hr-muted">{t("form.noChanges")}</p>
              )}
            </>
          )}
        </div>

        <div className={`${modalFooterClass} shrink-0 border-t border-hr-border`}>
          <button
            type="submit"
            disabled={loading || saving || !isDirty}
            className="rounded-xl bg-hr-primary px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t("common.saving") : t("access.users.saveRoles")}
          </button>
          <button type="button" onClick={onClose} disabled={saving} className={cancelBtnClass}>
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
