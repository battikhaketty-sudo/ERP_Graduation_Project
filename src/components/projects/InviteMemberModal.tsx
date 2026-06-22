import { useEffect, useState } from "react";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import { getAllProjects, PROJECT_MEMBER_ROLES } from "../../services/projects";
import type { InvitationFormPayload, Project } from "../../types/project";
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
  const { employees, loading } = useReferenceOptions(isOpen, {
    departments: false,
    contractTypes: false,
    employees: true,
  });

  const [form, setForm] = useState({
    projectId: "",
    employeeId: "",
    role: PROJECT_MEMBER_ROLES[0]?.label ?? "",
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
      role: PROJECT_MEMBER_ROLES[0]?.label ?? "",
      message: "",
      expiresAt: "",
    });
  }, [defaultProjectId, isOpen, projectOptions]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.projectId || !form.employeeId || !form.role) {
      setError("يرجى تعبئة جميع الحقول المطلوبة");
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
          : "فشل إرسال الدعوة",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={modalOverlayClass} dir="rtl">
      <div className={`${modalCardClass} max-w-xl`}>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-[#1B91C4]">دعوة عضو جديد</h2>
        </div>

        <div className="mb-6 rounded-xl border border-dashed border-[#9FD4EF] bg-[#E9F6FC] px-4 py-3 text-sm text-[#3A6E86]">
          أدخل بيانات الموظف الذي تريد دعوته للانضمام إلى المشروع. سيتم إرسال
          رابط الدعوة إليه عبر البريد الإلكتروني.
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm text-hr-text">المشروع</label>
            <select
              value={form.projectId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, projectId: event.target.value }))
              }
              className={inputClass}
            >
              <option value="">اختر المشروع</option>
              {projectOptions.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              رقم الموظف المراد دعوته
            </label>
            <select
              value={form.employeeId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, employeeId: event.target.value }))
              }
              disabled={loading}
              className={inputClass}
            >
              <option value="">ادخل رقم الموظف</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-hr-muted">
              يجب أن يكون الموظف موجوداً في النظام
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              دور الموظف المراد دعوته
            </label>
            <select
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, role: event.target.value }))
              }
              className={inputClass}
            >
              <option value="">اختر دور الموظف</option>
              {PROJECT_MEMBER_ROLES.map((role) => (
                <option key={role.id} value={role.label}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              الرسالة (اختياري)
            </label>
            <textarea
              value={form.message}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, message: event.target.value }))
              }
              className={textareaClass}
              placeholder="أضف رسالة شخصية للموظف"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-hr-text">
              تاريخ انتهاء صلاحية الدعوة
            </label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, expiresAt: event.target.value }))
              }
              className={inputClass}
            />
            <p className="mt-1 text-xs text-hr-muted">
              بعد هذا التاريخ لن تكون الدعوة صالحة
            </p>
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
              {saving ? "جاري الإرسال…" : "إرسال الدعوة"}
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
