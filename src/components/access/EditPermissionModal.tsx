import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { useFormValidation } from "../../hooks/useFormValidation";
import { useModalAutoFocus } from "../../hooks/useModalAutoFocus";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";
import {
  addPermission,
  deletePermission,
  getAllPermissions,
  updatePermission,
} from "../../services/permissions";
import type { AppPermission, PermissionFormPayload } from "../../types/permission";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { FormTextInput } from "../ui/FormTextInput";
import { FormTextarea } from "../ui/FormTextarea";
import {
  alertErrorClass,
  cancelBtnClass,
  modalBodyClass,
  modalClass,
  modalFooterClass,
} from "../ui/formStyles";
import { modalOverlayClass, ModalTitleBar } from "../ui/modalStyles";

type EditPermissionModalProps = {
  mode: "add" | "edit";
  permission?: AppPermission;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
};

const emptyForm: PermissionFormPayload = {
  name: "",
  description: "",
  resourceType: "",
};

const DESCRIPTION_MAX = 500;

export function EditPermissionModal({
  mode,
  permission,
  onClose,
  onSaved,
  onDeleted,
}: EditPermissionModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const { confirm } = useConfirmDialog();
  const [form, setForm] = useState<PermissionFormPayload>(emptyForm);
  const [resourceTypes, setResourceTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameFieldRef = useModalAutoFocus<HTMLInputElement>(true);
  const isLocked = mode === "edit" && Boolean(permission?.isFixed);
  const isBusy = saving || deleting;

  const { getError, touch, validateAll, reset, isValid } = useFormValidation(form, {
    name: (value) =>
      typeof value === "string" && value.trim()
        ? undefined
        : t("access.permissions.errors.nameRequired"),
    resourceType: (value) =>
      typeof value === "string" && value.trim()
        ? undefined
        : t("access.permissions.errors.resourceTypeRequired"),
  });

  useModalDismiss(onClose, !isBusy);

  useEffect(() => {
    reset();
    if (mode === "edit" && permission) {
      setForm({
        name: permission.name,
        description: permission.description ?? "",
        resourceType: permission.resourceType,
      });
    } else {
      setForm(emptyForm);
    }
  }, [mode, permission, reset]);

  useEffect(() => {
    void getAllPermissions()
      .then((records) => {
        const types = Array.from(
          new Set(records.map((item) => item.resourceType.trim()).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b, "ar"));
        setResourceTypes(types);
      })
      .catch(() => setResourceTypes([]));
  }, []);

  const resourceTypeListId = useMemo(() => `permission-resource-types-${mode}`, [mode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateAll()) return;

    setSaving(true);
    setError(null);
    try {
      if (mode === "edit" && permission) {
        await updatePermission(permission.id, form);
      } else {
        await addPermission(form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(getThrownErrorMessage(err, t("access.permissions.errors.save")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!permission || permission.isFixed) return;

    const confirmed = await confirm({
      message: t("access.permissions.deleteConfirm", { name: permission.name }),
    });
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deletePermission(permission.id);
      onDeleted?.();
      onSaved();
      onClose();
    } catch (err) {
      setError(getThrownErrorMessage(err, t("access.permissions.errors.delete")));
    } finally {
      setDeleting(false);
    }
  };

  const title =
    mode === "add" ? t("access.permissions.addLabel") : t("access.permissions.editLabel");

  return createPortal(
    <div
      className={modalOverlayClass}
      dir={dir}
      onClick={(event) => {
        if (!isBusy && event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={`${modalClass} relative w-full max-w-lg`} noValidate>
        <ModalTitleBar
          title={title}
          onClose={onClose}
          disabled={isBusy}
          variant="bordered"
        />

        <div className={modalBodyClass}>
        {isLocked ? (
          <p className="mb-4 rounded-xl border border-hr-border bg-hr-hover px-4 py-3 text-sm text-hr-muted">
            {t("access.permissions.fixedHint")}
          </p>
        ) : null}

        {error ? <p className={`mb-4 ${alertErrorClass}`}>{error}</p> : null}

        <div className="space-y-4">
          <FormTextInput
            ref={nameFieldRef}
            id="permission-name"
            label={t("access.permissions.columns.name")}
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            onValueBlur={() => touch("name")}
            error={getError("name")}
            required
            readOnly={isLocked}
            disabled={isLocked}
            autoComplete="off"
          />
          <FormTextInput
            id="permission-resource-type"
            label={t("access.permissions.columns.resourceType")}
            value={form.resourceType}
            onChange={(value) => setForm((current) => ({ ...current, resourceType: value }))}
            onValueBlur={() => touch("resourceType")}
            error={getError("resourceType")}
            hint={isLocked ? undefined : t("form.resourceTypeHint")}
            required
            readOnly={isLocked}
            disabled={isLocked}
            list={isLocked ? undefined : resourceTypeListId}
            autoComplete="off"
          />
          {!isLocked ? (
            <datalist id={resourceTypeListId}>
              {resourceTypes.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          ) : null}
          <FormTextarea
            id="permission-description"
            label={t("access.permissions.columns.description")}
            value={form.description ?? ""}
            onChange={(value) => setForm((current) => ({ ...current, description: value }))}
            rows={4}
            maxLength={DESCRIPTION_MAX}
            showCount
            hint={t("common.optional")}
          />
        </div>
        </div>

        <div className={`${modalFooterClass} flex-wrap justify-between gap-y-3`}>
          {mode === "edit" && permission && !permission.isFixed ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isBusy}
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
              disabled={isBusy || !isValid}
              className="rounded-xl bg-hr-primary px-6 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
            <button type="button" onClick={onClose} disabled={isBusy} className={cancelBtnClass}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
}
