import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import { useProjectLabels } from "../../hooks/useProjectLabels";
import { useTranslation } from "../../i18n";
import { getAllProjects } from "../../services/projects";
import type { InvitationFormPayload, Project } from "../../types/project";
import { isEndOfLocalDayPast } from "../../utils/manualDate";
import { mapEmployeeOptions, mapNamedOptions } from "../../utils/selectOptions";
import { getThrownApiDisplay } from "../../utils/apiResponse";
import { FormField } from "../ui/FormField";
import { SearchableSelect } from "../ui/SearchableSelect";
import { ManualDateInput } from "../ui/ManualDateInput";
import { readOnlyClass } from "../ui/formStyles";
import {
  alertErrorClass,
  cancelBtnClass,
  ModalCloseButton,
  ModalTitleBar,
} from "../ui/modalStyles";
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
  /** When true (e.g. opened from project detail), project cannot be changed. */
  lockProject?: boolean;
  onClose: () => void;
  onSubmit: (payload: InvitationFormPayload) => Promise<void>;
};

export function InviteMemberModal({
  isOpen,
  projects,
  defaultProjectId,
  lockProject = false,
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

  const projectLocked = lockProject || Boolean(defaultProjectId && projects.length === 1);

  useEffect(() => {
    if (!isOpen) return;
    if (projectLocked) {
      setProjectOptions(projects);
      return;
    }
    void getAllProjects()
      .then(setProjectOptions)
      .catch(() => setProjectOptions(projects));
  }, [isOpen, projectLocked, projects]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    const projectId =
      defaultProjectId ??
      (projectLocked ? projects[0]?.id : "") ??
      projectOptions[0]?.id ??
      "";
    setForm({
      projectId,
      employeeId: "",
      role: inviteMemberRoleOptions[0]?.apiLabel ?? "",
      message: "",
      expiresAt: "",
    });
  }, [
    defaultProjectId,
    isOpen,
    inviteMemberRoleOptions,
    projectLocked,
    projectOptions,
    projects,
  ]);

  const selectedProject = useMemo(
    () =>
      projectOptions.find((item) => item.id === form.projectId) ??
      projects.find((item) => item.id === form.projectId) ??
      null,
    [form.projectId, projectOptions, projects],
  );

  const projectStartDate = selectedProject?.startDate?.slice(0, 10) || "";

  const isProjectManager = (employee: { id: string; userId?: string }) => {
    const managerId = selectedProject?.managerId?.trim();
    if (!managerId) return false;
    return employee.id === managerId || Boolean(employee.userId && employee.userId === managerId);
  };

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.projectId || !form.employeeId || !form.role) {
      setError(t("projects.modals.inviteMember.errors.required"));
      return;
    }
    if (
      form.expiresAt &&
      projectStartDate &&
      form.expiresAt < projectStartDate
    ) {
      setError(t("projects.modals.inviteMember.errors.dateBeforeProjectStart"));
      return;
    }
    if (form.expiresAt && isEndOfLocalDayPast(form.expiresAt)) {
      setError(t("projects.modals.inviteMember.errors.dateInPast"));
      return;
    }

    const employee = employees.find((item) => item.id === form.employeeId);
    if (employee && isProjectManager(employee)) {
      setError(t("projects.modals.inviteMember.errors.alreadyManager"));
      return;
    }
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
      const selectedIsManager = Boolean(employee && isProjectManager(employee));
      if (selectedIsManager) {
        setError(t("projects.modals.inviteMember.errors.alreadyManager"));
        return;
      }

      setError(
        getThrownApiDisplay(err, t("projects.modals.inviteMember.errors.sendFailed")),
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
          {projectLocked ? (
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.modals.inviteMember.fields.project")}
              </label>
              <input
                value={selectedProject?.name || form.projectId}
                disabled
                className={`${readOnlyClass} text-hr-muted`}
              />
            </div>
          ) : (
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
                placeholder={t(
                  "projects.modals.inviteMember.placeholders.project",
                )}
              />
            </FormField>
          )}

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
              options={mapEmployeeOptions(employees, {
                description: (employee) =>
                  isProjectManager(employee)
                    ? t("projects.modals.inviteMember.fields.employeeStatusManager")
                    : undefined,
              })}
              placeholder={t(
                "projects.modals.inviteMember.placeholders.employee",
              )}
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
              placeholder={t(
                "projects.modals.inviteMember.placeholders.message",
              )}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.modals.inviteMember.fields.expiresAt")}
            </label>
            <ManualDateInput
              value={form.expiresAt}
              min={projectStartDate || undefined}
              onChange={(expiresAt) =>
                setForm((prev) => ({ ...prev, expiresAt }))
              }
            />
            {projectStartDate ? (
              <p className="mt-1 text-xs text-hr-muted">
                {t("projects.modals.inviteMember.fields.expiresAtHint", {
                  date: projectStartDate,
                })}
              </p>
            ) : null}
          </div>

          {error ? <p className={alertErrorClass}>{error}</p> : null}

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
