import { useEffect, useState } from "react";
import type { SectionFormPayload } from "../../types/project";
import { inputClass, modalCardClass, modalOverlayClass } from "./project-ui";

type AddSectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SectionFormPayload) => Promise<void>;
};

export function AddSectionModal({ isOpen, onClose, onSubmit }: AddSectionModalProps) {
  const [form, setForm] = useState({ name: "", displayOrder: "1" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ name: "", displayOrder: "1" });
    setError(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("اسم القسم مطلوب");
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: form.name,
        displayOrder: Number(form.displayOrder) || 1,
      });
      onClose();
    } catch (err) {
      setError(err && typeof err === "object" && "message" in err ? String(err.message) : "فشل إضافة القسم");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={modalOverlayClass} dir="rtl">
      <div className={`${modalCardClass} max-w-lg`}>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-[#1B91C4]">إضافة قسم جديد</h2>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-hr-text">اسم القسم</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className={inputClass}
              placeholder="أدخل اسم القسم"
            />
            <p className="mt-1 text-xs text-hr-muted">مثال: جديد، قيد التنفيذ، مكتمل</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-hr-text">رقم ترتيب العرض</label>
            <input
              type="number"
              min={1}
              value={form.displayOrder}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, displayOrder: event.target.value }))
              }
              className={inputClass}
              placeholder="1"
            />
            <p className="mt-1 text-xs text-hr-muted">يحدد ترتيب ظهور القسم في لوحة العمل</p>
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
              {saving ? "جاري الإضافة…" : "إضافة القسم"}
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
