import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { usePreferences } from "../../context/PreferencesContext";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import { useProjectLabels } from "../../hooks/useProjectLabels";
import { useTranslation } from "../../i18n";
import type {
  Project,
  ProjectSection,
  TaskFormPayload,
  TaskPriority,
} from "../../types/project";
import { sanitizeDecimalInput } from "../../utils/inputConstraints";
import { alertErrorClass, cancelBtnClass, ModalCloseButton, ModalTitleBar } from "../ui/modalStyles";
import {
  inputClass,
  modalCardClass,
  modalOverlayClass,
  textareaClass,
} from "./project-ui";

type AddTaskModalProps = {
  isOpen: boolean;
  project: Project;
  defaultSectionId?: string;
  onClose: () => void;
  onSubmit: (payload: TaskFormPayload) => Promise<void>;
};

const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

const priorityButtonClass: Record<TaskPriority, string> = {
  low: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900/50",
  medium: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900/50",
  high: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-900/50",
  urgent: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/50",
};

export function AddTaskModal({
  isOpen,
  project,
  defaultSectionId,
  onClose,
  onSubmit,
}: AddTaskModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const { priorityLabel } = useProjectLabels();
  const { employees, loading } = useReferenceOptions(isOpen, {
    departments: true,
    contractTypes: false,
    employees: true,
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    departmentId: "",
    expectedHours: "",
    dueDate: "",
    priority: "medium" as TaskPriority,
  });
  const [assignees, setAssignees] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      title: "",
      description: "",
      departmentId: defaultSectionId ?? project.sections[0]?.id ?? "",
      expectedHours: "",
      dueDate: "",
      priority: "medium",
    });
    setAssignees([]);
    setError(null);
  }, [defaultSectionId, isOpen, project]);

  if (!isOpen) return null;

  const addAssignee = () => {
    const employee =
      employees[assignees.length % Math.max(employees.length, 1)];
    if (!employee || assignees.some((item) => item.id === employee.id)) return;
    setAssignees((prev) => [...prev, employee]);
  };

  const removeAssignee = (id: string) => {
    setAssignees((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError(t("projects.modals.addTask.errors.titleRequired"));
      return;
    }
    if (!form.departmentId) {
      setError(t("projects.modals.addTask.errors.sectionRequired"));
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: form.title,
        description: form.description,
        sectionId: form.departmentId,
        expectedHours: Number(form.expectedHours) || 0,
        dueDate: form.dueDate,
        priority: form.priority,
        assigneeIds: assignees.map((item) => item.id),
        assigneeNames: assignees.map((item) => item.name),
      });
      onClose();
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : t("projects.modals.addTask.errors.addFailed"),
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
          title={t("projects.modals.addTask.title")}
          onClose={onClose}
          disabled={saving}
          hideCloseButton
        />

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.table.columns.name")}
            </label>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.table.columns.description")}
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
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.stats.sectionsCount")}
              </label>
              <select
                value={form.departmentId}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    departmentId: event.target.value,
                  }))
                }
                className={inputClass}
              >
                {project.sections.map((section: ProjectSection) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.stats.totalTasks")}
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                value={form.expectedHours}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    expectedHours: sanitizeDecimalInput(event.target.value),
                  }))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.detail.fields.endDate")}
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, dueDate: event.target.value }))
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.table.columns.status")}
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {priorities.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, priority }))}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    form.priority === priority
                      ? priorityButtonClass[priority]
                      : "border-hr-border bg-hr-surface text-hr-muted",
                  ].join(" ")}
                >
                  {priorityLabel(priority)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-hr-text">
                {t("projects.members.columns.name")}
              </label>
              <button
                type="button"
                onClick={addAssignee}
                disabled={loading || !employees.length}
                className="inline-flex items-center gap-1 text-sm text-hr-primary"
              >
                <Plus className="size-4" />
                {t("common.add")}
              </button>
            </div>
            <div className="rounded-xl border border-hr-border">
              {assignees.length ? (
                assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex items-center justify-between border-b border-hr-border px-4 py-3 last:border-b-0"
                  >
                    <span className="text-sm">{assignee.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAssignee(assignee.id)}
                      className="text-red-400"
                      aria-label={t("common.remove")}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-sm text-hr-muted">
                  {t("common.noData")}
                </p>
              )}
            </div>
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
                ? t("projects.modals.addTask.saving")
                : t("projects.modals.addTask.submit")}
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
