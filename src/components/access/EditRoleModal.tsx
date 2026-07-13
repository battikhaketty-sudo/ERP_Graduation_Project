import { RefreshCw, Search, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFormValidation } from "../../hooks/useFormValidation";
import { useModalAutoFocus } from "../../hooks/useModalAutoFocus";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { useTranslation } from "../../i18n";
import { getAllPermissions } from "../../services/permissions";
import { addRole, getRoleById, updateRole } from "../../services/roles";
import type { AppPermission } from "../../types/permission";
import type { RoleFormPayload } from "../../types/role";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { Pagination } from "../Pagination";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { FormField } from "../ui/FormField";
import { FormTextInput } from "../ui/FormTextInput";
import { FormTextarea } from "../ui/FormTextarea";
import {
  alertErrorClass,
  cancelBtnClass,
  infoBannerClass,
  modalBodyClass,
  modalClass,
  modalFooterClass,
  selectClass,
} from "../ui/formStyles";
import { ModalTitleBar } from "../ui/ModalTitleBar";
import { ROLE_LEVEL_OPTIONS, normalizeRoleLevel, tablePanelClass, tableScrollClass } from "./access-ui";

type EditRoleModalProps = {
  mode: "add" | "edit";
  roleId?: string;
  onClose: () => void;
  onSaved: () => void;
};

const emptyForm: RoleFormPayload = {
  name: "",
  description: "",
  isDefault: false,
  level: 2,
  permissionIds: [],
};

const PERM_PAGE_SIZE = 8;
const DESCRIPTION_MAX = 500;

const sampleForm = (): RoleFormPayload => ({
  name: "دور تجريبي",
  description: "دور للاختبار — يمكن حذفه لاحقاً",
  isDefault: false,
  level: 5,
  permissionIds: [],
});

export function EditRoleModal({ mode, roleId, onClose, onSaved }: EditRoleModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<RoleFormPayload>(emptyForm);
  const [roleNumber, setRoleNumber] = useState("");
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [fixedPermissionIds, setFixedPermissionIds] = useState<Set<string>>(new Set());
  const [permPage, setPermPage] = useState(1);
  const [formLoading, setFormLoading] = useState(mode === "edit");
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameFieldRef = useModalAutoFocus<HTMLInputElement>(!formLoading);

  const validators = useMemo(
    () => ({
      name: (value: unknown) =>
        typeof value === "string" && value.trim()
          ? undefined
          : t("access.roles.errors.nameRequired"),
      level: (value: unknown) =>
        typeof value === "number" && value >= 0
          ? undefined
          : t("form.invalidLevel"),
    }),
    [t],
  );

  const { getError, touch, validateAll, reset, clearField } = useFormValidation(form, validators);

  useModalDismiss(onClose, !saving);

  const loadRole = useCallback(async () => {
    if (mode !== "edit" || !roleId) {
      setForm(emptyForm);
      setRoleNumber("");
      setFixedPermissionIds(new Set());
      setFormLoading(false);
      return;
    }

    setFormLoading(true);
    setError(null);
    try {
      const role = await getRoleById(roleId);
      setRoleNumber(role.id);
      setForm({
        name: role.name,
        description: role.description ?? "",
        isDefault: role.isDefault,
        level: normalizeRoleLevel(role.level),
        permissionIds: role.permissionIds,
      });
      setFixedPermissionIds(
        new Set(role.permissions.filter((p) => p.isFixed).map((p) => p.permissionId)),
      );
    } catch (err) {
      setRoleNumber(roleId);
      setError(getThrownErrorMessage(err, t("access.roles.errors.load")));
    } finally {
      setFormLoading(false);
    }
  }, [mode, roleId, t]);

  const loadPermissions = useCallback(async () => {
    setPermissionsLoading(true);
    setPermissionsError(null);
    try {
      const allPermissions = await getAllPermissions();
      setPermissions(allPermissions);
    } catch (err) {
      setPermissionsError(getThrownErrorMessage(err, t("access.roles.errors.loadPermissions")));
      setPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    reset();
    void loadRole();
    void loadPermissions();
  }, [mode, roleId, loadRole, loadPermissions, reset]);

  const filteredPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();
    if (!query) return permissions;
    return permissions.filter(
      (permission) =>
        permission.name.toLowerCase().includes(query) ||
        permission.resourceType.toLowerCase().includes(query) ||
        (permission.description ?? "").toLowerCase().includes(query),
    );
  }, [permissionSearch, permissions]);

  const permTotalPages = Math.max(1, Math.ceil(filteredPermissions.length / PERM_PAGE_SIZE));
  const pagedPermissions = useMemo(() => {
    const start = (permPage - 1) * PERM_PAGE_SIZE;
    return filteredPermissions.slice(start, start + PERM_PAGE_SIZE);
  }, [filteredPermissions, permPage]);

  useEffect(() => {
    setPermPage(1);
  }, [permissionSearch]);

  const selectedPermissionsCount = form.permissionIds?.length ?? 0;
  const selectablePermissionIds = useMemo(
    () =>
      permissions
        .filter((permission) => !fixedPermissionIds.has(permission.id))
        .map((permission) => permission.id),
    [fixedPermissionIds, permissions],
  );

  const selectableFilteredPermissionIds = useMemo(
    () =>
      filteredPermissions
        .filter((permission) => !fixedPermissionIds.has(permission.id))
        .map((permission) => permission.id),
    [filteredPermissions, fixedPermissionIds],
  );

  const togglePermission = (permissionId: string) => {
    if (fixedPermissionIds.has(permissionId)) return;
    setForm((current) => {
      const ids = current.permissionIds ?? [];
      return {
        ...current,
        permissionIds: ids.includes(permissionId)
          ? ids.filter((id) => id !== permissionId)
          : [...ids, permissionId],
      };
    });
  };

  const selectAllPermissions = () => {
    const targetIds =
      selectableFilteredPermissionIds.length > 0
        ? selectableFilteredPermissionIds
        : selectablePermissionIds;

    setForm((current) => ({
      ...current,
      permissionIds: Array.from(
        new Set([...(current.permissionIds ?? []), ...fixedPermissionIds, ...targetIds]),
      ),
    }));
  };

  const clearSelectablePermissions = () => {
    setForm((current) => ({
      ...current,
      permissionIds: Array.from(fixedPermissionIds),
    }));
  };

  const fillSampleData = () => {
    setForm((current) => ({
      ...sampleForm(),
      permissionIds: current.permissionIds ?? [],
    }));
    clearField("name");
    clearField("level");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateAll()) return;

    setSaving(true);
    setError(null);
    try {
      if (mode === "edit" && roleId) {
        await updateRole(roleId, form);
      } else {
        await addRole(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(getThrownErrorMessage(err, t("access.roles.errors.save")));
    } finally {
      setSaving(false);
    }
  };

  const title =
    mode === "add" ? t("access.roles.addLabel") : t("access.roles.editLabel");

  const displayRoleNumber = roleNumber || roleId || "";

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
          title={title}
          onClose={onClose}
          disabled={saving}
          variant="bordered"
          trailing={
            import.meta.env.DEV && mode === "add" ? (
              <button
                type="button"
                onClick={fillSampleData}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-hr-primary/40 px-3 py-1.5 text-xs font-medium text-hr-primary transition hover:bg-hr-primary/5"
              >
                <Wand2 className="size-3.5" />
                {t("form.fillSample")}
              </button>
            ) : undefined
          }
        />

        <div className={`${modalBodyClass} min-h-0`}>
          {error ? <p className={`mb-4 ${alertErrorClass}`}>{error}</p> : null}

          {formLoading ? (
            <p className="py-6 text-center text-hr-muted">{t("access.roles.loadingForm")}</p>
          ) : (
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              {mode === "edit" ? (
                <FormField label={t("access.roles.fields.number")} hint={t("form.readOnlyId")}>
                  <div className="flex h-11 items-center justify-center rounded-xl border border-hr-border bg-hr-hover px-4">
                    {displayRoleNumber ? (
                      <CopyableIdCell value={displayRoleNumber} head={6} tail={4} />
                    ) : (
                      <span className="text-sm text-hr-muted">{t("common.dash")}</span>
                    )}
                  </div>
                </FormField>
              ) : null}
              <FormTextInput
                ref={nameFieldRef}
                id="role-name"
                label={t("access.roles.columns.name")}
                value={form.name}
                onChange={(value) => {
                  setForm((current) => ({ ...current, name: value }));
                  clearField("name");
                }}
                onValueBlur={() => touch("name")}
                error={getError("name")}
                placeholder={t("access.roles.placeholders.name")}
                required
                autoComplete="off"
              />
              <FormField
                label={t("access.roles.columns.level")}
                hint={t("form.levelHint")}
                error={getError("level")}
                htmlFor="role-level"
              >
                <select
                  id="role-level"
                  value={form.level}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      level: Number(event.target.value) || 2,
                    }));
                    clearField("level");
                  }}
                  onBlur={() => touch("level")}
                  className={selectClass}
                >
                  {ROLE_LEVEL_OPTIONS.map((option) => (
                    <option key={option.key} value={option.value}>
                      {t(`access.level.${option.key}`)} ({option.value})
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="flex items-end pb-1">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-hr-border px-4 py-3 text-sm text-hr-text transition hover:bg-hr-hover">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, isDefault: event.target.checked }))
                    }
                    className="size-4 rounded border-hr-border text-hr-primary"
                  />
                  {t("access.roles.columns.isDefault")}
                </label>
              </div>
              <div className="md:col-span-2">
                <FormTextarea
                  id="role-description"
                  label={t("access.roles.columns.description")}
                  value={form.description ?? ""}
                  onChange={(value) => setForm((current) => ({ ...current, description: value }))}
                  placeholder={t("access.roles.placeholders.description")}
                  rows={3}
                  maxLength={DESCRIPTION_MAX}
                  showCount
                  hint={t("common.optional")}
                />
              </div>
            </div>
          )}

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold text-hr-primary">
                {t("access.tabs.permissions")}
              </h4>
              <span className="text-xs font-medium text-hr-muted">
                {t("form.permissionsSelected", { count: selectedPermissionsCount })}
              </span>
            </div>

            {permissionsError ? (
              <div className={`mb-3 flex flex-wrap items-center justify-between gap-3 ${infoBannerClass}`}>
                <p className="text-sm">{permissionsError}</p>
                <button
                  type="button"
                  onClick={() => void loadPermissions()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-hr-surface px-3 py-1.5 text-xs font-semibold text-hr-primary shadow-sm transition hover:bg-hr-hover"
                >
                  <RefreshCw className="size-3.5" />
                  {t("access.roles.retryPermissions")}
                </button>
              </div>
            ) : null}

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
                <input
                  value={permissionSearch}
                  onChange={(event) => setPermissionSearch(event.target.value)}
                  placeholder={t("form.searchPermissions")}
                  disabled={permissionsLoading}
                  className="h-10 w-full rounded-xl border border-hr-border bg-hr-input-bg pe-3 ps-10 text-sm outline-none focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20 disabled:opacity-60"
                />
              </div>
              <button
                type="button"
                onClick={selectAllPermissions}
                disabled={permissionsLoading || !selectablePermissionIds.length}
                className="rounded-lg border border-hr-border px-3 py-2 text-xs font-medium text-hr-text transition hover:bg-hr-hover disabled:opacity-50"
              >
                {t("common.selectAll")}
              </button>
              <button
                type="button"
                onClick={clearSelectablePermissions}
                disabled={permissionsLoading || selectedPermissionsCount <= fixedPermissionIds.size}
                className="rounded-lg border border-hr-border px-3 py-2 text-xs font-medium text-hr-text transition hover:bg-hr-hover disabled:opacity-50"
              >
                {t("form.clearSelection")}
              </button>
            </div>

            <div className={tablePanelClass}>
              <div className={tableScrollClass}>
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead className="bg-hr-table-head text-hr-muted">
                    <tr>
                      <th className="px-3 py-3 text-center font-medium">
                        {t("access.permissions.columns.select")}
                      </th>
                      <th className="px-3 py-3 text-center font-medium">
                        {t("table.columns.index")}
                      </th>
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
                    {permissionsLoading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-hr-muted">
                          {t("access.roles.loadingPermissions")}
                        </td>
                      </tr>
                    ) : !pagedPermissions.length ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-8 text-center text-hr-muted">
                          {permissionSearch.trim()
                            ? t("common.noResults")
                            : t("access.permissions.empty")}
                        </td>
                      </tr>
                    ) : (
                      pagedPermissions.map((permission, index) => {
                        const isRoleFixed = fixedPermissionIds.has(permission.id);
                        const checked = (form.permissionIds ?? []).includes(permission.id);
                        const rowIndex = (permPage - 1) * PERM_PAGE_SIZE + index + 1;
                        return (
                          <tr
                            key={permission.id}
                            className={index % 2 ? "bg-hr-table-head" : "bg-hr-surface"}
                          >
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isRoleFixed}
                                onChange={() => togglePermission(permission.id)}
                                className="size-4 rounded border-hr-border text-hr-primary disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-3 py-3 text-center text-hr-muted">{rowIndex}</td>
                            <td className="px-3 py-3 text-center font-medium text-hr-text">
                              {permission.name}
                            </td>
                            <td className="px-3 py-3 text-center text-hr-muted">
                              {permission.description || t("common.dash")}
                            </td>
                            <td className="px-3 py-3 text-center text-hr-text">
                              {permission.resourceType || t("common.dash")}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {!permissionsLoading && filteredPermissions.length > PERM_PAGE_SIZE ? (
                <Pagination
                  currentPage={permPage}
                  totalPages={permTotalPages}
                  onPageChange={setPermPage}
                />
              ) : null}
            </div>
          </section>
        </div>

        <div className={`${modalFooterClass} shrink-0 border-t border-hr-border`}>
          <button
            type="submit"
            disabled={formLoading || saving}
            className="rounded-xl bg-hr-primary px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t("common.saving") : t("access.roles.saveChanges")}
          </button>
          <button type="button" onClick={onClose} disabled={saving} className={cancelBtnClass}>
            {t("common.cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}
