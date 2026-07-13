import { useEffect, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import { useProjectLabels } from "../../hooks/useProjectLabels";
import { useTranslation } from "../../i18n";
import { getAllProjects } from "../../services/projects";
import type { InvitationFormPayload, Project } from "../../types/project";
import { mapNamedOptions } from "../../utils/selectOptions";
import { FormField } from "../ui/FormField";
import { SearchableSelect } from "../ui/SearchableSelect";
import { alertErrorClass, cancelBtnClass, ModalCloseButton, ModalTitleBar } from "../ui/modalStyles";
import {
  inputClass,
  modalCardClass,
  modalOverlayClass,
  textareaClass,
} from "./project-ui";

type InviteMemberModalProps = {
  isOpen: boolean;
  projects: Project[];
  defaultProjectId?: string;
  onClose: () => void;
  onSubmit: (payload: InvitationFormPayload) => Promise<void>;
};

export function InviteMemberModal({
  isOpen,
  projects,
  defaultProjectId,
  onClose,
  onSubmit,
}: InviteMemberModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const { inviteMemberRoleOptions } = useProjectLabels();
  const defaultRole = inviteMemberRoleOptions[0]?.apiLabel ?? "";
  const { employees, loading } = useReferenceOptions(isOpen, {
    departments: false,
    contractTypes: false,
    employees: true,
  });

  const [form, setForm] = useState({
    projectId: "",
    employeeId: "",
    role: defaultRole,
    message: "",
    expiresAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectOptions, setProjectOptions] = useState<Project[]>(projects);

  useEffect(() => {
    if (!isOpen) return;
    void getAllProjects()
      .then(setProjectOptions)
      .catch(() => setProjectOptions(projects));
  }, [isOpen, projects]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm({
      projectId: defaultProjectId ?? projectOptions[0]?.id ?? "",
      employeeId: "",
      role: inviteMemberRoleOptions[0]?.apiLabel ?? "",
      message: "",
      expiresAt: "",
    });
  }, [defaultProjectId, isOpen, inviteMemberRoleOptions, projectOptions]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.projectId || !form.employeeId || !form.role) {
      setError(t("projects.modals.inviteMember.errors.required"));
      return;
    }

    const employee = employees.find((item) => item.id === form.employeeId);
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        projectId: form.projectId,
        employeeId: form.employeeId,
        employeeName: employee?.name ?? "",
        role: form.role,
        message: form.message.trim() || undefined,
        expiresAt:
          form.expiresAt ||
          new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      });
      onClose();
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : t("projects.modals.inviteMember.errors.sendFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={modalOverlayClass} dir={dir}>
      <div className={`${modalCardClass} relative max-w-xl`}>
        <ModalCloseButton onClick={onClose} disabled={saving} />
        <ModalTitleBar
          title={t("projects.modals.inviteMember.title")}
          onClose={onClose}
          disabled={saving}
          hideCloseButton
        />

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          <FormField
            label={t("projects.modals.inviteMember.fields.project")}
            required
            hint={t("projects.modals.inviteMember.fields.projectHint")}
          >
            <SearchableSelect
              value={form.projectId}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, projectId: value }))
              }
              options={mapNamedOptions(
                projectOptions.map((project) => ({
                  id: project.id,
                  name: project.name,
                })),
              )}
              placeholder={t("projects.modals.inviteMember.placeholders.project")}
            />
          </FormField>

          <FormField
            label={t("projects.modals.inviteMember.fields.employee")}
            required
            hint={t("projects.modals.inviteMember.fields.employeeHint")}
          >
            <SearchableSelect
              value={form.employeeId}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, employeeId: value }))
              }
              options={mapNamedOptions(employees, {
                description: (employee) => employee.id,
              })}
              placeholder={t("projects.modals.inviteMember.placeholders.employee")}
              loading={loading}
            />
          </FormField>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.modals.inviteMember.fields.role")}
            </label>
            <select
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, role: event.target.value }))
              }
              className={inputClass}
            >
              <option value="">{t("common.select")}</option>
              {inviteMemberRoleOptions.map((role) => (
                <option key={role.id} value={role.apiLabel}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.modals.inviteMember.fields.message")}{" "}
              <span className="text-hr-muted">({t("common.optional")})</span>
            </label>
            <textarea
              value={form.message}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, message: event.target.value }))
              }
              className={textareaClass}
              placeholder={t("projects.modals.inviteMember.placeholders.message")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.detail.fields.endDate")}
            </label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, expiresAt: event.target.value }))
              }
              className={inputClass}
            />
          </div>

          {error && (
            <p className={alertErrorClass}>
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-hr-primary px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving
                ? t("projects.modals.inviteMember.sending")
                : t("projects.modals.inviteMember.submit")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={cancelBtnClass}
            >
              {t("common.cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
