import { useEffect, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { useTranslation } from "../../i18n";
import type { ProjectSection, SectionFormPayload } from "../../types/project";
import { sanitizeIntegerInput } from "../../utils/inputConstraints";
import {
  alertErrorClass,
  cancelBtnClass,
  ModalCloseButton,
  ModalTitleBar,
} from "../ui/modalStyles";
import { inputClass, modalCardClass, modalOverlayClass } from "./project-ui";

type AddSectionModalProps = {
  isOpen: boolean;
  section?: ProjectSection | null;
  sections?: ProjectSection[];
  /** Next order when creating a new section for this project */
  nextDisplayOrder?: number;
  onClose: () => void;
  onSubmit: (payload: SectionFormPayload) => Promise<void>;
};

export function AddSectionModal({
  isOpen,
  section,
  nextDisplayOrder = 1,
  onClose,
  onSubmit,
}: AddSectionModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const [form, setForm] = useState({
    name: "",
    displayOrder: "1",
    isFinalSection: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(section);
  useModalDismiss(onClose, isOpen && !saving);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: section?.name ?? "",
      displayOrder: String(section?.displayOrder ?? nextDisplayOrder),
      isFinalSection: Boolean(section?.isFinalSection),
    });
    setError(null);
  }, [isOpen, nextDisplayOrder, section]);

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
        displayOrder: isEditing
          ? Number(form.displayOrder) || 1
          : nextDisplayOrder,
        isFinalSection: form.isFinalSection,
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

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-bold text-hr-text">
              {t("projects.detail.fields.name")}
            </label>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className={inputClass}
              placeholder={t("projects.modals.addSection.placeholder")}
              autoFocus
            />
            {!isEditing ? (
              <p className="mt-2 text-xs text-hr-muted">
                {t("projects.modals.addSection.perProjectHint")}
              </p>
            ) : null}
          </div>

          {isEditing ? (
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
          ) : null}

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hr-border bg-hr-table-alt/50 px-4 py-3">
            <input
              type="checkbox"
              checked={form.isFinalSection}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  isFinalSection: event.target.checked,
                }))
              }
              className="mt-0.5 size-4 rounded border-hr-border"
            />
            <span>
              <span className="block text-sm font-bold text-hr-text">
                {t("projects.modals.addSection.fields.isFinalSection")}
              </span>
              <span className="mt-1 block text-xs text-hr-muted">
                {t("projects.modals.addSection.fields.isFinalSectionHint")}
              </span>
            </span>
          </label>

          {error && <p className={alertErrorClass}>{error}</p>}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="h-11 min-w-[140px] rounded-xl bg-hr-primary px-6 text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
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
