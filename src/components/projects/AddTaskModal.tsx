import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { usePreferences } from "../../context/PreferencesContext";
import { useProjectLabels } from "../../hooks/useProjectLabels";
import { useTranslation } from "../../i18n";
import { getAllProjectMembers, getProjectTaskById } from "../../services/projects";
import { getEmployees } from "../../services/employees";
import { REFERENCE_DATA_LIMIT } from "../../constants/defaults";
import {
  assigneesFromMembers,
  isActiveProjectMember,
  memberLookupIds,
  toActiveAssigneeOptions,
} from "../../services/projects/project.mapper";
import type {
  Project,
  ProjectMember,
  ProjectTask,
  TaskFormPayload,
  TaskPriority,
  TaskTransition,
} from "../../types/project";
import { wouldCreateCycle } from "../../services/projects/taskDependencies";
import { getCurrentActorIds } from "../../utils/accessToken";
import { sanitizeDecimalInput } from "../../utils/inputConstraints";
import { mapNamedOptions } from "../../utils/selectOptions";
import {
  alertErrorClass,
  cancelBtnClass,
  ModalCloseButton,
  ModalTitleBar,
} from "../ui/modalStyles";
import { infoBannerClass, readOnlyClass } from "../ui/formStyles";
import { SearchableSelect } from "../ui/SearchableSelect";
import { ManualDateInput } from "../ui/ManualDateInput";
import {
  inputClass,
  modalCardClass,
  modalOverlayClass,
  textareaClass,
} from "./project-ui";
import { TaskTransitionsPanel } from "./TaskTransitionsPanel";

type AssigneeOption = { id: string; name: string };

type AddTaskModalProps = {
  isOpen: boolean;
  project: Project;
  task?: ProjectTask | null;
  defaultSectionId?: string;
  onClose: () => void;
  onSubmit: (payload: TaskFormPayload) => Promise<void>;
};

const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

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

const clampToProjectStart = (date: string, projectStartDate?: string) => {
  const projectStart = toDateInputValue(projectStartDate);
  if (projectStart && date && date < projectStart) return projectStart;
  return date;
};

const defaultDueDate = (startDate: string, projectEndDate?: string) => {
  const end = toDateInputValue(projectEndDate);
  if (end && end >= startDate) return end;
  return startDate;
};

const keepProjectAssignees = (
  candidateIds: string[],
  members: ProjectMember[],
) => {
  const result: AssigneeOption[] = [];
  const seen = new Set<string>();
  for (const id of candidateIds) {
    const member = members.find(
      (item) => isActiveProjectMember(item) && memberLookupIds(item).includes(id),
    );
    if (!member) continue;
    const sendId = member.userId || member.id;
    if (seen.has(sendId)) continue;
    seen.add(sendId);
    result.push({ id: sendId, name: member.employeeName || sendId });
  }
  return result;
};

const withEmployeeUserIds = async (members: ProjectMember[]) => {
  if (!members.length) return members;
  try {
    const { data } = await getEmployees(1, REFERENCE_DATA_LIMIT);
    const byId = new Map<string, { id: string; userId?: string }>();
    for (const employee of data) {
      byId.set(employee.id, employee);
      if (employee.userId) byId.set(employee.userId, employee);
    }
    return members.map((member) => {
      const employee = byId.get(member.employeeId) || byId.get(member.id);
      return {
        ...member,
        userId: member.userId || employee?.userId || undefined,
      };
    });
  } catch {
    return members;
  }
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
  const { priorityLabel } = useProjectLabels();
  const isEditing = Boolean(task);

  const [memberOptions, setMemberOptions] = useState<AssigneeOption[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    sectionId: "",
    expectedHours: "1",
    startDate: "",
    dueDate: "",
    priority: "medium" as TaskPriority,
  });
  const [dependsOnTaskIds, setDependsOnTaskIds] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [assigneePickId, setAssigneePickId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transitions, setTransitions] = useState<TaskTransition[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    setAssigneePickId("");
    setError(null);
    setSaving(false);
    setAssignees([]);

    if (task) {
      const startDate = clampToProjectStart(
        toDateInputValue(task.startDate) || todayInputValue(),
        project.startDate,
      );
      setForm({
        title: task.title || task.name || "",
        description: task.description || "",
        sectionId: task.sectionId || project.sections[0]?.id || "",
        expectedHours: String(task.expectedHours ?? 1),
        startDate,
        dueDate:
          clampToProjectStart(
            toDateInputValue(task.dueDate) ||
              defaultDueDate(startDate, project.endDate),
            project.startDate,
          ),
        priority: task.priority || "medium",
      });
      setDependsOnTaskIds([...(task.dependsOnTaskIds ?? [])]);
    } else {
      const sectionId = defaultSectionId || project.sections[0]?.id || "";
      const startDate = clampToProjectStart(
        todayInputValue(),
        project.startDate,
      );
      setForm({
        title: "",
        description: "",
        sectionId,
        expectedHours: "1",
        startDate,
        dueDate: defaultDueDate(startDate, project.endDate),
        priority: "medium",
      });
      setDependsOnTaskIds([]);
      setTransitions([]);
    }

    const run = async () => {
      setMembersLoading(true);
      try {
        const [rawMembers, detail] = await Promise.all([
          getAllProjectMembers(project.id),
          task ? getProjectTaskById(task.id, project.id).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const members = await withEmployeeUserIds(rawMembers);
        const options = toActiveAssigneeOptions(members);
        setProjectMembers(members);
        setMemberOptions(options);

        if (detail) {
          setTransitions(detail.transitions);
          if (detail.dependsOnTaskIds.length) {
            setDependsOnTaskIds([...detail.dependsOnTaskIds]);
          }
        } else if (!task) {
          setTransitions([]);
        }

        if (detail?.assignments.length) {
          setAssignees(assigneesFromMembers(members, detail.assignments));
        } else {
          setAssignees(keepProjectAssignees(task?.assigneeIds ?? [], members));
        }
      } catch {
        if (!cancelled) {
          setProjectMembers([]);
          setMemberOptions([]);
          setAssignees([]);
        }
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [defaultSectionId, isOpen, project.endDate, project.id, project.sections, task]);

  const selectedAssigneeKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const assignee of assignees) {
      keys.add(assignee.id);
      const member = projectMembers.find((item) =>
        memberLookupIds(item).includes(assignee.id),
      );
      if (member) {
        for (const lookupId of memberLookupIds(member)) keys.add(lookupId);
      }
    }
    return keys;
  }, [assignees, projectMembers]);

  const actorIsProjectMember = useMemo(() => {
    if (!projectMembers.length) return true;
    const actorIds = getCurrentActorIds();
    if (!actorIds.length) return true;
    return projectMembers.some(
      (member) =>
        isActiveProjectMember(member) &&
        memberLookupIds(member).some((id) => actorIds.includes(id)),
    );
  }, [projectMembers]);

  const availableAssigneeOptions = useMemo(
    () =>
      mapNamedOptions(
        memberOptions.filter((member) => !selectedAssigneeKeys.has(member.id)),
      ),
    [memberOptions, selectedAssigneeKeys],
  );

  const dependencyOptions = useMemo(() => {
    const currentId = task?.id;
    return project.tasks.filter((item) => {
      if (item.id === currentId) return false;
      if (!currentId) return true;
      return !wouldCreateCycle(project.tasks, currentId, item.id);
    });
  }, [project.tasks, task?.id]);

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

  const addAssignee = (memberId: string) => {
    if (!memberId || selectedAssigneeKeys.has(memberId)) {
      setAssigneePickId("");
      return;
    }
    const member = memberOptions.find((item) => item.id === memberId);
    if (!member) {
      setAssigneePickId("");
      return;
    }
    setAssignees((prev) => [...prev, member]);
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
    const projectStart = toDateInputValue(project.startDate);
    if (projectStart && form.startDate < projectStart) {
      setError(t("projects.modals.addTask.errors.dateBeforeProjectStart"));
      return;
    }
    setSaving(true);
    try {
      const validAssignees = assignees.filter((assignee) =>
        projectMembers.some(
          (member) =>
            isActiveProjectMember(member) &&
            (member.id === assignee.id || memberLookupIds(member).includes(assignee.id)),
        ),
      );
      await onSubmit({
        title: form.title,
        description: form.description,
        sectionId: form.sectionId,
        expectedHours: Number(form.expectedHours) || 0,
        startDate: form.startDate,
        dueDate: form.dueDate,
        priority: form.priority,
        assigneeIds: validAssignees.map((item) => item.id),
        assigneeNames: validAssignees.map((item) => item.name),
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
          {!membersLoading && !actorIsProjectMember ? (
            <p className={infoBannerClass}>{t("projects.modals.addTask.actorNotMember")}</p>
          ) : null}
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
                min={toDateInputValue(project.startDate) || undefined}
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
                min={
                  form.startDate ||
                  toDateInputValue(project.startDate) ||
                  undefined
                }
                onChange={handleDueDateChange}
                required
              />
              {toDateInputValue(project.startDate) ? (
                <p className="mt-1 text-xs text-hr-muted">
                  {t("projects.modals.addTask.dateMinHint", {
                    date: toDateInputValue(project.startDate),
                  })}
                </p>
              ) : null}
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
              placeholder={
                memberOptions.length
                  ? t("projects.modals.addTask.placeholders.assignee")
                  : t("projects.modals.addTask.assigneesNoMembers")
              }
              emptyMessage={t("projects.modals.addTask.assigneesNoMembers")}
              loading={membersLoading}
              disabled={membersLoading || !memberOptions.length}
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
                  {memberOptions.length
                    ? t("projects.modals.addTask.assigneesEmpty")
                    : t("projects.modals.addTask.assigneesNoMembers")}
                </p>
              )}
            </div>
          </div>

          {isEditing ? <TaskTransitionsPanel transitions={transitions} /> : null}

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
