import { RefreshCw, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { useFormValidation } from "../../hooks/useFormValidation";
import { useModalAutoFocus } from "../../hooks/useModalAutoFocus";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { useTranslation } from "../../i18n";
import { getAllPermissions } from "../../services/permissions";
import { addRole, deleteRole, getRoleById, updateRole } from "../../services/roles";
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
  inputClass,
  modalBodyClass,
  modalClass,
  modalFooterClass,
  readOnlyClass,
} from "../ui/formStyles";
import { ModalTitleBar } from "../ui/ModalTitleBar";
import { tablePanelClass, tableScrollClass } from "./access-ui";

type EditRoleModalProps = {
  mode: "add" | "edit";
  roleId?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
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

export function EditRoleModal({ mode, roleId, onClose, onSaved, onDeleted }: EditRoleModalProps) {
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const [form, setForm] = useState<RoleFormPayload>(emptyForm);
  const [roleNumber, setRoleNumber] = useState("");
  const [roleIsFixed, setRoleIsFixed] = useState(false);
  const [roleNameSnapshot, setRoleNameSnapshot] = useState("");
  const originalRoleRef = useRef<RoleFormPayload | null>(null);
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [fixedPermissionIds, setFixedPermissionIds] = useState<Set<string>>(new Set());
  const [permPage, setPermPage] = useState(1);
  const [formLoading, setFormLoading] = useState(mode === "edit");
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameFieldRef = useModalAutoFocus<HTMLInputElement>(!formLoading);
  const isBusy = saving || deleting;

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

  useModalDismiss(onClose, !isBusy);

  const loadRole = useCallback(async () => {
    if (mode !== "edit" || !roleId) {
      setForm(emptyForm);
      setRoleNumber("");
      setRoleIsFixed(false);
      setRoleNameSnapshot("");
      originalRoleRef.current = null;
      setFixedPermissionIds(new Set());
      setFormLoading(false);
      return;
    }

    setFormLoading(true);
    setError(null);
    try {
      const role = await getRoleById(roleId);
      const permissionIds = Array.from(
        new Set([
          ...role.permissionIds,
          ...role.permissions.filter((p) => p.isFixed).map((p) => p.permissionId),
        ]),
      );
      const loadedForm: RoleFormPayload = {
        name: role.name,
        description: role.description ?? "",
        isDefault: role.isDefault,
        level: Number(role.level) || 0,
        permissionIds,
      };
      originalRoleRef.current = loadedForm;
      setRoleNumber(role.id);
      setRoleIsFixed(Boolean(role.isFixed));
      setRoleNameSnapshot(role.name);
      setForm(loadedForm);
      setFixedPermissionIds(
        new Set(role.permissions.filter((p) => p.isFixed).map((p) => p.permissionId)),
      );
    } catch (err) {
      setRoleNumber(roleId);
      setRoleIsFixed(false);
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
    return permissions.filter((permission) =>
      permission.name.toLowerCase().includes(query),
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateAll()) return;

    setSaving(true);
    setError(null);
    try {
      const original = originalRoleRef.current;
      const permissionIds = Array.from(
        new Set([...(form.permissionIds ?? []), ...fixedPermissionIds]),
      );
      const payload: RoleFormPayload =
        roleIsFixed && original
          ? {
              name: original.name,
              description: original.description,
              isDefault: original.isDefault,
              level: original.level,
              permissionIds,
            }
          : {
              name: form.name,
              description: form.description,
              isDefault: form.isDefault,
              level: form.level,
              permissionIds,
            };
      if (mode === "edit" && roleId) {
        await updateRole(roleId, payload);
      } else {
        await addRole(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(getThrownErrorMessage(err, t("access.roles.errors.save")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!roleId || roleIsFixed) return;

    const confirmed = await confirm({
      message: t("access.roles.deleteConfirm", {
        name: roleNameSnapshot || form.name || roleId,
      }),
    });
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteRole(roleId);
      onDeleted?.();
      onSaved();
      onClose();
    } catch (err) {
      setError(getThrownErrorMessage(err, t("access.roles.errors.delete")));
    } finally {
      setDeleting(false);
    }
  };

  const title =
    mode === "add" ? t("access.roles.addLabel") : t("access.roles.editLabel");

  const displayRoleNumber = roleNumber || roleId || "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(event) => {
        if (!isBusy && event.target === event.currentTarget) onClose();
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
          disabled={isBusy}
          variant="bordered"
        />

        <div className={`${modalBodyClass} min-h-0`}>
          {roleIsFixed ? (
            <p className={`mb-4 ${infoBannerClass}`}>{t("access.roles.fixedHint")}</p>
          ) : null}
          {error ? <p className={`mb-4 ${alertErrorClass}`}>{error}</p> : null}

          {formLoading ? (
            <p className="py-6 text-center text-hr-muted">{t("access.roles.loadingForm")}</p>
          ) : (
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <FormField label={t("access.roles.fields.number")} hint={t("form.readOnlyId")}>
                <div className="flex h-11 items-center justify-center rounded-xl border border-hr-border bg-hr-hover px-4">
                  {displayRoleNumber ? (
                    <CopyableIdCell value={displayRoleNumber} head={6} tail={4} />
                  ) : (
                    <span className="text-sm text-hr-muted">{t("common.dash")}</span>
                  )}
                </div>
              </FormField>
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
                readOnly={roleIsFixed}
                disabled={roleIsFixed}
                autoComplete="off"
              />
              <FormField
                label={t("access.roles.columns.level")}
                hint={roleIsFixed ? undefined : t("form.levelHint")}
                error={getError("level")}
                htmlFor="role-level"
              >
                <input
                  id="role-level"
                  type="number"
                  min={0}
                  step={1}
                  value={form.level}
                  readOnly={roleIsFixed}
                  disabled={roleIsFixed}
                  onChange={(event) => {
                    setForm((current) => ({
                      ...current,
                      level: Math.max(0, Number(event.target.value) || 0),
                    }));
                    clearField("level");
                  }}
                  onBlur={() => touch("level")}
                  className={roleIsFixed ? readOnlyClass : inputClass}
                />
              </FormField>
              <div className="flex items-end pb-1">
                <label
                  className={[
                    "flex items-center gap-2 rounded-xl border border-hr-border px-4 py-3 text-sm text-hr-text transition",
                    roleIsFixed
                      ? "cursor-not-allowed opacity-70"
                      : "cursor-pointer hover:bg-hr-hover",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    disabled={roleIsFixed}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, isDefault: event.target.checked }))
                    }
                    className="size-4 rounded border-hr-border text-hr-primary disabled:pointer-events-none"
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
                  showCount={!roleIsFixed}
                  readOnly={roleIsFixed}
                  disabled={roleIsFixed}
                  className={roleIsFixed ? "cursor-not-allowed opacity-70" : undefined}
                  hint={roleIsFixed ? undefined : t("common.optional")}
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
                disabled={
                  permissionsLoading || selectedPermissionsCount <= fixedPermissionIds.size
                }
                className="rounded-lg border border-hr-border px-3 py-2 text-xs font-medium text-hr-text transition hover:bg-hr-hover disabled:opacity-50"
              >
                {t("form.clearSelection")}
              </button>
            </div>

            <div className={tablePanelClass}>
              <div className={tableScrollClass}>
                <table className="w-full table-fixed border-collapse text-sm">
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
                        {t("access.roles.columns.isFixed")}
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
                        <td colSpan={6} className="px-3 py-8 text-center text-hr-muted">
                          {t("access.roles.loadingPermissions")}
                        </td>
                      </tr>
                    ) : !pagedPermissions.length ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-hr-muted">
                          {permissionSearch.trim()
                            ? t("common.noResults")
                            : t("access.permissions.empty")}
                        </td>
                      </tr>
                    ) : (
                      pagedPermissions.map((permission, index) => {
                        const isAssignmentFixed = fixedPermissionIds.has(permission.id);
                        const isLocked = isAssignmentFixed;
                        const checked = (form.permissionIds ?? []).includes(permission.id);
                        const rowIndex = (permPage - 1) * PERM_PAGE_SIZE + index + 1;
                        return (
                          <tr
                            key={permission.id}
                            className={[
                              index % 2 ? "bg-hr-table-head" : "bg-hr-surface",
                              isLocked ? "opacity-70" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isLocked}
                                readOnly={isLocked}
                                onChange={() => togglePermission(permission.id)}
                                onClick={(event) => {
                                  if (isLocked) event.preventDefault();
                                }}
                                className="size-4 rounded border-hr-border text-hr-primary disabled:pointer-events-none disabled:cursor-not-allowed"
                                title={
                                  isLocked ? t("access.roles.fixedPermissionHint") : undefined
                                }
                                aria-label={
                                  isLocked
                                    ? t("access.roles.fixedPermissionHint")
                                    : permission.name
                                }
                              />
                            </td>
                            <td className="px-3 py-3 text-center text-hr-muted">{rowIndex}</td>
                            <td className="px-3 py-3 text-center font-medium text-hr-text">
                              {permission.name}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {isAssignmentFixed ? (
                                <span className="inline-flex rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                  {t("access.roles.columns.isFixed")}
                                </span>
                              ) : (
                                <span className="text-hr-muted">{t("common.dash")}</span>
                              )}
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

        <div className={`${modalFooterClass} flex-wrap justify-between gap-y-3 shrink-0 border-t border-hr-border`}>
          {mode === "edit" && roleId && !roleIsFixed ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isBusy || formLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="size-4" />
              {t("common.delete")}
            </button>
          ) : (
            <span className="hidden sm:block" aria-hidden />
          )}

          <div className="flex w-full flex-wrap gap-3 sm:ms-auto sm:w-auto">
            <button
              type="submit"
              disabled={formLoading || isBusy}
              className="rounded-xl bg-hr-primary px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t("common.saving") : t("access.roles.saveChanges")}
            </button>
            <button type="button" onClick={onClose} disabled={isBusy} className={cancelBtnClass}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
