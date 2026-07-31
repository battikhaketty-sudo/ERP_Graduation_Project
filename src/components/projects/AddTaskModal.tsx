import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { usePreferences } from "../../context/PreferencesContext";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import { useProjectLabels } from "../../hooks/useProjectLabels";
import { useTranslation } from "../../i18n";
import { wouldCreateCycle } from "../../services/projects/taskDependencies";
import type {
  Project,
  ProjectTask,
  TaskFormPayload,
  TaskPriority,
  TaskStatus,
} from "../../types/project";
import { pointsForPriority } from "../../services/projects/performancePoints";
import { sanitizeDecimalInput } from "../../utils/inputConstraints";
import { mapNamedOptions } from "../../utils/selectOptions";
import {
  alertErrorClass,
  cancelBtnClass,
  ModalCloseButton,
  ModalTitleBar,
} from "../ui/modalStyles";
import { readOnlyClass } from "../ui/formStyles";
import { SearchableSelect } from "../ui/SearchableSelect";
import { ManualDateInput } from "../ui/ManualDateInput";
import {
  inputClass,
  modalCardClass,
  modalOverlayClass,
  textareaClass,
} from "./project-ui";

type AddTaskModalProps = {
  isOpen: boolean;
  project: Project;
  task?: ProjectTask | null;
  defaultSectionId?: string;
  onClose: () => void;
  onSubmit: (payload: TaskFormPayload) => Promise<void>;
};

const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];
const completionStatuses: TaskStatus[] = ["todo", "in_progress", "completed"];

const priorityButtonClass: Record<TaskPriority, string> = {
  low: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-900/50",
  medium:
    "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900/50",
  high: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-900/50",
  urgent:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/50",
};

const toDateInputValue = (value?: string) => {
  if (!value?.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const defaultDueDate = (startDate: string, projectEndDate?: string) => {
  const end = toDateInputValue(projectEndDate);
  if (end && end >= startDate) return end;
  return startDate;
};

export function AddTaskModal({
  isOpen,
  project,
  task = null,
  defaultSectionId,
  onClose,
  onSubmit,
}: AddTaskModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const { priorityLabel, taskStatusLabel } = useProjectLabels();
  const isEditing = Boolean(task);
  const { employees, loading } = useReferenceOptions(isOpen, {
    departments: true,
    contractTypes: false,
    employees: true,
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    sectionId: "",
    expectedHours: "1",
    startDate: "",
    dueDate: "",
    priority: "medium" as TaskPriority,
    status: "todo" as TaskStatus,
  });
  const [dependsOnTaskIds, setDependsOnTaskIds] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [assigneePickId, setAssigneePickId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableAssigneeOptions = useMemo(
    () =>
      mapNamedOptions(
        employees.filter(
          (employee) => !assignees.some((assignee) => assignee.id === employee.id),
        ),
      ),
    [assignees, employees],
  );

  const dependencyOptions = useMemo(() => {
    const currentId = task?.id;
    return project.tasks.filter((item) => {
      if (item.id === currentId) return false;
      if (!currentId) return true;
      return !wouldCreateCycle(project.tasks, currentId, item.id);
    });
  }, [project.tasks, task?.id]);

  useEffect(() => {
    if (!isOpen) return;

    if (task) {
      setForm({
        title: task.title || task.name || "",
        description: task.description || "",
        sectionId: task.sectionId || project.sections[0]?.id || "",
        expectedHours: String(task.expectedHours ?? 1),
        startDate: toDateInputValue(task.startDate) || todayInputValue(),
        dueDate:
          toDateInputValue(task.dueDate) ||
          defaultDueDate(
            toDateInputValue(task.startDate) || todayInputValue(),
            project.endDate,
          ),
        priority: task.priority || "medium",
        status: task.status || "todo",
      });
      setDependsOnTaskIds([...(task.dependsOnTaskIds ?? [])]);
      setAssignees(
        task.assigneeIds.map((id, index) => ({
          id,
          name: task.assigneeNames[index] || id,
        })),
      );
    } else {
      const sectionId = defaultSectionId || project.sections[0]?.id || "";
      const startDate = todayInputValue();
      setForm({
        title: "",
        description: "",
        sectionId,
        expectedHours: "1",
        startDate,
        dueDate: defaultDueDate(startDate, project.endDate),
        priority: "medium",
        status: "todo",
      });
      setDependsOnTaskIds([]);
      setAssignees([]);
    }

    setAssigneePickId("");
    setError(null);
    setSaving(false);
  }, [defaultSectionId, isOpen, project.endDate, project.id, project.sections, project.tasks, task]);

  const handleClose = () => {
    if (saving) return;
    setError(null);
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  const selectedSection =
    project.sections.find((section) => section.id === form.sectionId) ??
    project.sections[0];

  const addAssignee = (employeeId: string) => {
    if (!employeeId) return;
    const employee = employees.find((item) => item.id === employeeId);
    if (!employee || assignees.some((item) => item.id === employee.id)) {
      setAssigneePickId("");
      return;
    }
    setAssignees((prev) => [...prev, employee]);
    setAssigneePickId("");
  };

  const removeAssignee = (id: string) => {
    setAssignees((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleDependency = (taskId: string) => {
    setDependsOnTaskIds((prev) =>
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId],
    );
  };

  const handleStartDateChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, startDate: value };
      if (prev.dueDate && value && prev.dueDate < value) {
        next.dueDate = value;
      }
      return next;
    });
    setError(null);
  };

  const handleDueDateChange = (value: string) => {
    setForm((prev) => ({ ...prev, dueDate: value }));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError(t("projects.modals.addTask.errors.titleRequired"));
      return;
    }
    if (!form.sectionId) {
      setError(t("projects.modals.addTask.errors.sectionRequired"));
      return;
    }
    if (!form.startDate) {
      setError(t("projects.modals.addTask.errors.startRequired"));
      return;
    }
    if (!form.dueDate) {
      setError(t("projects.modals.addTask.errors.dueRequired"));
      return;
    }
    if (form.startDate > form.dueDate) {
      setError(t("projects.modals.addTask.errors.invalidDateRange"));
      return;
    }
    if (!assignees.length) {
      setError(t("projects.modals.addTask.errors.assigneeRequired"));
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: form.title,
        description: form.description,
        sectionId: form.sectionId,
        expectedHours: Number(form.expectedHours) || 0,
        startDate: form.startDate,
        dueDate: form.dueDate,
        priority: form.priority,
        status: form.status,
        assigneeIds: assignees.map((item) => item.id),
        assigneeNames: assignees.map((item) => item.name),
        dependsOnTaskIds,
      });
      onClose();
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : isEditing
            ? t("projects.modals.addTask.errors.saveFailed")
            : t("projects.modals.addTask.errors.addFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={modalOverlayClass}
      dir={dir}
      role="presentation"
      onClick={handleClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") handleClose();
      }}
    >
      <div
        className={`${modalCardClass} relative max-w-2xl`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <ModalCloseButton onClick={handleClose} disabled={saving} />
        <ModalTitleBar
          title={
            isEditing
              ? t("projects.modals.addTask.editTitle")
              : t("projects.modals.addTask.title")
          }
          onClose={handleClose}
          disabled={saving}
          hideCloseButton
        />

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.modals.addTask.fields.project")}
              </label>
              <input
                value={project.name}
                readOnly
                className={readOnlyClass}
                title={t("projects.modals.addTask.fields.projectHint")}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.modals.addTask.fields.section")}
              </label>
              {project.sections.length > 1 && !(defaultSectionId && !isEditing) ? (
                <select
                  value={form.sectionId}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sectionId: event.target.value,
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
              ) : (
                <input
                  value={selectedSection?.name || t("common.dash")}
                  readOnly
                  className={readOnlyClass}
                />
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.modals.addTask.fields.title")}
            </label>
            <input
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder={t("projects.modals.addTask.placeholders.title")}
              className={inputClass}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.modals.addTask.fields.description")}
            </label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
              placeholder={t("projects.modals.addTask.placeholders.description")}
              className={textareaClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.modals.addTask.fields.expectedHours")}
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
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.modals.addTask.fields.startDate")}
              </label>
              <ManualDateInput
                value={form.startDate}
                max={form.dueDate || undefined}
                onChange={handleStartDateChange}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-hr-text">
                {t("projects.modals.addTask.fields.dueDate")}
              </label>
              <ManualDateInput
                value={form.dueDate}
                min={form.startDate || undefined}
                onChange={handleDueDateChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.modals.addTask.fields.priority")}
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
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.modals.addTask.fields.status")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {completionStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, status }))}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm font-medium transition",
                    form.status === status
                      ? status === "completed"
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : status === "in_progress"
                          ? "border-sky-300 bg-sky-100 text-sky-800 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                          : "border-hr-primary bg-hr-primary/10 text-hr-primary"
                      : "border-hr-border bg-hr-surface text-hr-muted",
                  ].join(" ")}
                >
                  {taskStatusLabel(status)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-hr-muted">
              {t("projects.modals.addTask.fields.completionHint", {
                points: pointsForPriority(form.priority),
              })}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.modals.addTask.fields.dependsOn")}
            </label>
            <p className="mb-2 text-xs text-hr-muted">
              {t("projects.modals.addTask.fields.dependsOnHint")}
            </p>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-hr-border">
              {dependencyOptions.length ? (
                dependencyOptions.map((item) => {
                  const checked = dependsOnTaskIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-hr-border px-4 py-2.5 last:border-b-0 hover:bg-hr-hover"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDependency(item.id)}
                        className="size-4 rounded border-hr-border"
                      />
                      <span className="text-sm text-hr-text">
                        {item.title || item.name}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="px-4 py-6 text-center text-sm text-hr-muted">
                  {t("projects.modals.addTask.dependsOnEmpty")}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.modals.addTask.fields.assignees")}
            </label>
            <SearchableSelect
              value={assigneePickId}
              onChange={addAssignee}
              options={availableAssigneeOptions}
              placeholder={t("projects.modals.addTask.placeholders.assignee")}
              loading={loading}
            />
            <div className="mt-3 rounded-xl border border-hr-border">
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
                  {t("projects.modals.addTask.assigneesEmpty")}
                </p>
              )}
            </div>
          </div>

          {error && <p className={alertErrorClass}>{error}</p>}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-hr-primary px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving
                ? t("projects.modals.addTask.saving")
                : isEditing
                  ? t("projects.modals.addTask.editSubmit")
                  : t("projects.modals.addTask.submit")}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
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
