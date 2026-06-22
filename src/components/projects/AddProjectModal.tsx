import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import type {
  Project,
  ProjectFormPayload,
  ProjectStatus,
} from "../../types/project";
import {
  inputClass,
  modalCardClass,
  modalOverlayClass,
  PROJECT_STATUS_LABELS,
  textareaClass,
} from "./project-ui";

type AddProjectModalProps = {
  isOpen: boolean;
  project?: Project | null;
  onClose: () => void;
  onSubmit: (payload: ProjectFormPayload) => Promise<void>;
};

const statusOptions: ProjectStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];

export function AddProjectModal({
  isOpen,
  project,
  onClose,
  onSubmit,
}: AddProjectModalProps) {
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
    status: "in_progress" as ProjectStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm({
      name: project?.name ?? "",
      managerId: project?.managerId ?? "",
      description: project?.description ?? "",
      startDate: project?.startDate ?? "",
      endDate: project?.endDate ?? "",
      status: project?.status ?? "in_progress",
    });
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("اسم المشروع مطلوب");
      return;
    }
    if (!form.managerId) {
      setError("يرجى اختيار مدير المشروع");
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
        assignedEmployeeId: project?.assignedEmployeeId ?? "",
        assignedEmployeeName: project?.assignedEmployeeName ?? "",
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        budget: project?.budget ?? 0,
      });
      onClose();
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "فشل حفظ المشروع",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={modalOverlayClass} dir="rtl">
      <div className={`${modalCardClass} max-w-2xl`}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1B91C4]">
            {isEditing ? "تعديل المشروع" : "إضافة مشروع جديد"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-hr-muted hover:text-hr-text"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-6"
        >
          <section>
            <h3 className="mb-4 border-b border-hr-border pb-2 text-sm font-bold text-hr-text">
              المعلومات الأساسية
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  الرقم (غير قابل للتعديل)
                </label>
                <input
                  value={project?.number ?? "يتم إنشاء الرقم تلقائياً"}
                  disabled
                  className={`${inputClass} bg-[#FAFCFE] text-hr-muted`}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-hr-text">
                    اسم المشروع <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className={inputClass}
                    placeholder="أدخل اسم المشروع"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-hr-text">
                    مدير المشروع <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.managerId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        managerId: event.target.value,
                      }))
                    }
                    disabled={loading}
                    className={inputClass}
                  >
                    <option value="">اختر المدير</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  الوصف <span className="text-red-500">*</span>
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
                  placeholder="أدخل وصفاً مفصلاً للمشروع"
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 border-b border-hr-border pb-2 text-sm font-bold text-hr-text">
              التواريخ
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  تاريخ البداية
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      startDate: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  تاريخ النهاية
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      endDate: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-4 border-b border-hr-border pb-2 text-sm font-bold text-hr-text">
              حالة المشروع
            </h3>
            <div className="mb-4 rounded-xl border-s-4 border-hr-primary bg-[#E9F6FC] px-4 py-3 text-sm text-[#3A6E86]">
              اختر الحالة الحالية للمشروع، يمكن تغيير الحالة في أي وقت
            </div>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, status }))}
                  className={[
                    "rounded-xl border px-3 py-3 text-sm font-medium transition",
                    form.status === status
                      ? "border-hr-primary bg-[#E9F6FC] text-hr-primary"
                      : "border-hr-border bg-white text-hr-muted hover:border-hr-primary/40",
                  ].join(" ")}
                >
                  {PROJECT_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </section>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-hr-primary px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {saving
                ? "جاري الحفظ…"
                : isEditing
                  ? "حفظ التعديلات"
                  : "إضافة المشروع"}
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
