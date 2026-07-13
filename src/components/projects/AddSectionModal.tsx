import { useEffect, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";
import type { SectionFormPayload } from "../../types/project";
import { sanitizeIntegerInput } from "../../utils/inputConstraints";
import { alertErrorClass, cancelBtnClass, ModalCloseButton, ModalTitleBar } from "../ui/modalStyles";
import { inputClass, modalCardClass, modalOverlayClass } from "./project-ui";

type AddSectionModalProps = {
  isOpen: boolean;
  section?: { id: string; name: string; displayOrder: number } | null;
  onClose: () => void;
  onSubmit: (payload: SectionFormPayload) => Promise<void>;
};

export function AddSectionModal({ isOpen, section, onClose, onSubmit }: AddSectionModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const [form, setForm] = useState({ name: "", displayOrder: "1" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(section);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: section?.name ?? "",
      displayOrder: String(section?.displayOrder ?? 1),
    });
    setError(null);
  }, [isOpen, section]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t("projects.modals.addSection.errors.nameRequired"));
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
      setError(
        err && typeof err === "object" && "message" in err
          ? String(err.message)
          : t("projects.modals.addSection.errors.addFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={modalOverlayClass} dir={dir}>
      <div className={`${modalCardClass} relative max-w-lg`}>
        <ModalCloseButton onClick={onClose} disabled={saving} />
        <ModalTitleBar
          title={
            isEditing
              ? t("projects.modals.addSection.editTitle")
              : t("projects.modals.addSection.title")
          }
          onClose={onClose}
          disabled={saving}
          hideCloseButton
        />

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-hr-text">
              {t("projects.detail.fields.name")}
            </label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className={inputClass}
              placeholder={t("projects.modals.addSection.placeholder")}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-hr-text">
              {t("projects.detail.fields.number")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={form.displayOrder}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  displayOrder: sanitizeIntegerInput(event.target.value),
                }))
              }
              className={inputClass}
              placeholder="1"
            />
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
                ? t("projects.modals.addSection.saving")
                : isEditing
                  ? t("projects.modals.addSection.editSubmit")
                  : t("projects.modals.addSection.submit")}
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
