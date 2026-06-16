import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import type { Project, ProjectSection, TaskFormPayload, TaskPriority } from "../../types/project";
import { inputClass, modalCardClass, modalOverlayClass, PRIORITY_LABELS, textareaClass } from "./project-ui";

type AddTaskModalProps = {
  isOpen: boolean;
  project: Project;
  onClose: () => void;
  onSubmit: (payload: TaskFormPayload) => Promise<void>;
};

const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

const priorityButtonClass: Record<TaskPriority, string> = {
  low: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-sky-100 text-sky-700 border-sky-200",
  high: "bg-green-100 text-green-700 border-green-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

export function AddTaskModal({ isOpen, project, onClose, onSubmit }: AddTaskModalProps) {
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
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      title: "",
      description: "",
      departmentId: project.sections[0]?.id ?? "",
      expectedHours: "",
      dueDate: "",
      priority: "medium",
    });
    setAssignees([]);
    setError(null);
  }, [isOpen, project]);

  if (!isOpen) return null;

  const addAssignee = () => {
    const employee = employees[assignees.length % Math.max(employees.length, 1)];
    if (!employee || assignees.some((item) => item.id === employee.id)) return;
    setAssignees((prev) => [...prev, employee]);
  };

  const removeAssignee = (id: string) => {
    setAssignees((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setError("عنوان المهمة مطلوب");
      return;
    }
    if (!form.departmentId) {
      setError("يرجى اختيار القسم");
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
      setError(err && typeof err === "object" && "message" in err ? String(err.message) : "فشل إضافة المهمة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={modalOverlayClass} dir="rtl">
      <div className={`${modalCardClass} max-w-2xl`}>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-[#1B91C4]">إضافة مهمة جديدة</h2>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <h3 className="text-sm font-bold text-hr-text">المعلومات الأساسية</h3>

          <div>
            <label className="mb-2 block text-sm text-hr-text">عنوان المهمة</label>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">الوصف</label>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              className={textareaClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-hr-text">القسم (المشروع)</label>
              <select
                value={form.departmentId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, departmentId: event.target.value }))
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
              <label className="mb-2 block text-sm text-hr-text">عدد الساعات المتوقعة</label>
              <input
                type="number"
                min={0}
                value={form.expectedHours}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, expectedHours: event.target.value }))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">تاريخ الاستحقاق</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">الأولوية</label>
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
                      : "border-hr-border bg-white text-hr-muted",
                  ].join(" ")}
                >
                  {PRIORITY_LABELS[priority]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm text-hr-text">الأعضاء المسئولون للمهمة</label>
              <button
                type="button"
                onClick={addAssignee}
                disabled={loading || !employees.length}
                className="inline-flex items-center gap-1 text-sm text-hr-primary"
              >
                <Plus className="size-4" />
                إضافة عضو
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
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-sm text-hr-muted">لم يتم تعيين أعضاء بعد</p>
              )}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-hr-primary px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving ? "جاري الإضافة…" : "إضافة المهمة"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-400 px-8 py-2.5 text-sm font-bold text-white"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
