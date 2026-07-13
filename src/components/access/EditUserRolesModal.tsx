import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { useTranslation } from "../../i18n";
import { getAllRoles } from "../../services/roles";
import { getUserById, updateUserRoles } from "../../services/users";
import type { AppRole } from "../../types/role";
import type { UserAccount } from "../../types/user";
import { getThrownErrorMessage } from "../../utils/apiResponse";
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

type EditUserRolesModalProps = {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function EditUserRolesModal({ userId, onClose, onSaved }: EditUserRolesModalProps) {
  const { t } = useTranslation();
  const [user, setUser] = useState<UserAccount | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [roleSearch, setRoleSearch] = useState("");
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
      const roleIds = userData.roles.map((role) => role.roleId);
      setUser(userData);
      setRoles(allRoles);
      setSelectedRoleIds(roleIds);
      setInitialRoleIds(roleIds);
      setFixedRoleIds(new Set(userData.roles.filter((role) => role.isFixed).map((r) => r.roleId)));
      setRoleSearch("");
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
    return roles.filter((role) => role.name.toLowerCase().includes(query));
  }, [roleSearch, roles]);

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
      await updateUserRoles(userId, selectedRoleIds);
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
      <form onSubmit={handleSubmit} className={`${modalClass} relative w-full max-w-lg`} noValidate>
        <ModalTitleBar
          title={t("access.users.editRolesTitle")}
          onClose={onClose}
          disabled={saving}
          variant="bordered"
        />

        <div className={modalBodyClass}>
        {error ? <p className={`mb-4 ${alertErrorClass}`}>{error}</p> : null}

        {loading ? (
          <p className="py-8 text-center text-hr-muted">{t("common.loading")}</p>
        ) : (
          <>
            <FormField label={t("access.users.columns.email")}>
              <input readOnly value={user?.email ?? ""} className={readOnlyClass} />
            </FormField>

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

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-hr-border p-3">
              {!filteredRoles.length ? (
                <p className="py-4 text-center text-sm text-hr-muted">
                  {roleSearch.trim() ? t("common.noResults") : t("access.roles.empty")}
                </p>
              ) : (
                filteredRoles.map((role) => {
                  const isFixed = fixedRoleIds.has(role.id);
                  const checked = selectedRoleIds.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className={[
                        "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-start transition",
                        checked ? "bg-hr-primary/5" : "",
                        isFixed ? "cursor-not-allowed opacity-70" : "hover:bg-hr-hover",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isFixed}
                        onChange={() => toggleRole(role.id)}
                        className="size-4 rounded border-hr-border text-hr-primary focus:ring-hr-primary/30"
                      />
                      <span className="text-sm text-hr-text">{role.name}</span>
                      {isFixed ? (
                        <span className="ms-auto text-xs text-hr-muted">
                          {t("access.users.fixedRole")}
                        </span>
                      ) : null}
                    </label>
                  );
                })
              )}
            </div>

            {isDirty ? (
              <p className={`mt-3 ${infoBannerClass}`}>{t("form.unsavedChanges")}</p>
            ) : (
              <p className="mt-3 text-xs text-hr-muted">{t("form.noChanges")}</p>
            )}
          </>
        )}
        </div>

        <div className={modalFooterClass}>
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
