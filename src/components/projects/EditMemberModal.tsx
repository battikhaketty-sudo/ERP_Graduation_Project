import { useEffect, useState } from "react";
import { PROJECT_MEMBER_ROLES } from "../../services/projects";
import type { ProjectMember } from "../../types/project";
import { inputClass, modalCardClass, modalOverlayClass } from "./project-ui";

type EditMemberModalProps = {
  isOpen: boolean;
  member: ProjectMember | null;
  onClose: () => void;
  onSubmit: (member: ProjectMember, role: string) => Promise<void>;
};

export function EditMemberModal({ isOpen, member, onClose, onSubmit }: EditMemberModalProps) {
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !member) return;
    setRole(member.role);
    setError(null);
  }, [isOpen, member]);

  if (!isOpen || !member) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!role) {
      setError("يرجى اختيار الدور");
      return;
    }

    setSaving(true);
    try {
      await onSubmit(member, role);
      onClose();
    } catch (err) {
      setError(
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : "فشل تحديث العضو",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={modalOverlayClass} dir="rtl">
      <div className={`${modalCardClass} max-w-md`}>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-[#1B91C4]">تعديل دور العضو</h2>
          <p className="mt-1 text-sm text-hr-muted">{member.employeeName}</p>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-hr-text">الدور</label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className={inputClass}
            >
              {PROJECT_MEMBER_ROLES.map((item) => (
                <option key={item.id} value={item.label}>
                  {item.label}
                </option>
              ))}
            </select>
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
              {saving ? "جاري الحفظ…" : "حفظ"}
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
