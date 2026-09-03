import { useEffect, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import { useProjectLabels } from "../../hooks/useProjectLabels";
import { useModalAutoFocus } from "../../hooks/useModalAutoFocus";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { useTranslation } from "../../i18n";
import {
  canAdvanceProjectStatus,
  getAllProjectMembers,
  PROJECT_STATUS_ORDER,
  projectStatusRank,
} from "../../services/projects";
import type {
  Project,
  ProjectFormPayload,
  ProjectStatus,
} from "../../types/project";
import { mapEmployeeOptions } from "../../utils/selectOptions";
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

type AddProjectModalProps = {
  isOpen: boolean;
  project?: Project | null;
  onClose: () => void;
  onSubmit: (payload: ProjectFormPayload) => Promise<void>;
};

export function AddProjectModal({
  isOpen,
  project,
  onClose,
  onSubmit,
}: AddProjectModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const { projectStatusLabel } = useProjectLabels();
  const isEditing = Boolean(project);
  const { employees, loading } = useReferenceOptions(isOpen, {
    departments: false,
    contractTypes: false,
    employees: true,
  });

  const [form, setForm] = useState({
    name: "",
    managerId: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "not_started" as ProjectStatus,
  });
  const [membersCount, setMembersCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useModalAutoFocus<HTMLInputElement>(isOpen);
  useModalDismiss(onClose, isOpen && !saving);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm({
      name: project?.name ?? "",
      managerId: project?.managerId ?? "",
      description: project?.description ?? "",
      startDate: project?.startDate ?? "",
      endDate: project?.endDate ?? "",
      status: project?.status ?? "not_started",
    });
    setMembersCount(project?.membersCount ?? 0);
  }, [isOpen, project]);

  useEffect(() => {
    if (!isOpen || !project?.id) return;
    let cancelled = false;
    void getAllProjectMembers(project.id)
      .then((members) => {
        if (!cancelled) setMembersCount(members.length);
      })
      .catch(() => {
        if (!cancelled) setMembersCount(project.membersCount ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, project]);

  if (!isOpen) return null;

  const baselineStatus = project?.status ?? "not_started";

  const isStatusSelectable = (status: ProjectStatus) => {
    if (!isEditing) return status === "not_started";
    return canAdvanceProjectStatus(baselineStatus, status);
  };

  const handleStatusSelect = (status: ProjectStatus) => {
    if (!isEditing) {
      if (status !== "not_started") {
        setError(t("projects.modals.addProject.errors.statusLockedOnCreate"));
        return;
      }
      setForm((prev) => ({ ...prev, status }));
      setError(null);
      return;
    }

    if (!canAdvanceProjectStatus(baselineStatus, status)) {
      setError(t("projects.modals.addProject.errors.statusNoRegression"));
      return;
    }

    if (
      projectStatusRank(status) > projectStatusRank("not_started") &&
      membersCount <= 0
    ) {
      setError(t("projects.modals.addProject.errors.statusNeedsMembers"));
      return;
    }

    setForm((prev) => ({ ...prev, status }));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t("projects.modals.addProject.errors.nameRequired"));
      return;
    }
    if (!form.managerId) {
      setError(t("projects.modals.addProject.errors.managerRequired"));
      return;
    }
    if (isEditing && !canAdvanceProjectStatus(baselineStatus, form.status)) {
      setError(t("projects.modals.addProject.errors.statusNoRegression"));
      return;
    }
    if (
      isEditing &&
      projectStatusRank(form.status) > projectStatusRank("not_started") &&
      membersCount <= 0
    ) {
      setError(t("projects.modals.addProject.errors.statusNeedsMembers"));
      return;
    }

    const manager = employees.find((item) => item.id === form.managerId);

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name,
        managerId: form.managerId,
        managerName: manager?.name ?? "",
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      });
      onClose();
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : t("projects.modals.addProject.errors.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={modalOverlayClass} dir={dir}>
      <div className={`${modalCardClass} relative max-w-2xl`}>
        <ModalCloseButton onClick={onClose} disabled={saving} />
        <ModalTitleBar
          title={
            isEditing
              ? t("projects.modals.addProject.editTitle")
              : t("projects.modals.addProject.title")
          }
          onClose={onClose}
          disabled={saving}
          hideCloseButton
        />

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-6"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.modals.addProject.fields.number")}
              </label>
              <input
                value={project?.id ?? t("projects.modals.addProject.autoNumber")}
                disabled
                className={`${readOnlyClass} text-hr-muted`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  {t("projects.modals.addProject.fields.name")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  ref={firstFieldRef}
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className={inputClass}
                  placeholder={t("projects.modals.addProject.placeholders.name")}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  {t("projects.modals.addProject.fields.manager")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  value={form.managerId}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      managerId: value,
                    }))
                  }
                  options={mapEmployeeOptions(employees)}
                  placeholder={t("projects.modals.addProject.placeholders.manager")}
                  searchPlaceholder={t(
                    "projects.modals.addProject.placeholders.managerSearch",
                  )}
                  loading={loading}
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.modals.addProject.fields.description")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                className={textareaClass}
                placeholder={t(
                  "projects.modals.addProject.placeholders.description",
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.modals.addProject.fields.startDate")}
              </label>
              <ManualDateInput
                value={form.startDate}
                max={form.endDate || undefined}
                onChange={(startDate) =>
                  setForm((prev) => ({
                    ...prev,
                    startDate,
                    endDate:
                      prev.endDate && startDate && prev.endDate < startDate
                        ? startDate
                        : prev.endDate,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.modals.addProject.fields.endDate")}
              </label>
              <ManualDateInput
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(endDate) =>
                  setForm((prev) => ({
                    ...prev,
                    endDate,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-hr-text">
              {t("projects.modals.addProject.fields.status")}
            </label>
            <p className="mb-3 text-xs text-hr-muted">
              {isEditing
                ? t("projects.modals.addProject.statusForwardHint")
                : t("projects.modals.addProject.statusCreateHint")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PROJECT_STATUS_ORDER.map((status) => {
                const selectable = isStatusSelectable(status);
                const selected = form.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    aria-disabled={!selectable}
                    onClick={() => handleStatusSelect(status)}
                    className={[
                      "rounded-xl border px-3 py-3 text-sm font-medium transition",
                      selected
                        ? "border-hr-primary bg-hr-nav-active text-hr-primary"
                        : selectable
                          ? "border-hr-border bg-hr-surface text-hr-muted hover:border-hr-primary/40"
                          : "cursor-not-allowed border-hr-border/60 bg-hr-hover/40 text-hr-muted/50",
                    ].join(" ")}
                  >
                    {projectStatusLabel(status)}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className={alertErrorClass}>{error}</p>}

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-hr-primary px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving
                ? t("projects.modals.addProject.saving")
                : isEditing
                  ? t("projects.modals.addProject.editSubmit")
                  : t("projects.modals.addProject.submit")}
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
