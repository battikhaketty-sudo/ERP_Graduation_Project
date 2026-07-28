import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";
import {
  sanitizeSectionDependsOn,
  wouldCreateSectionCycle,
} from "../../services/projects/sectionDependencies";
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
  sections = [],
  nextDisplayOrder = 1,
  onClose,
  onSubmit,
}: AddSectionModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const [form, setForm] = useState({ name: "", displayOrder: "1" });
  const [dependsOnSectionIds, setDependsOnSectionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(section);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: section?.name ?? "",
      displayOrder: String(section?.displayOrder ?? nextDisplayOrder),
    });
    setDependsOnSectionIds([...(section?.dependsOnSectionIds ?? [])]);
    setError(null);
  }, [isOpen, nextDisplayOrder, section]);

  const dependencyOptions = useMemo(() => {
    const sectionId = section?.id;
    return sections.filter((item) => {
      if (sectionId && item.id === sectionId) return false;
      if (!sectionId) return true;
      return !wouldCreateSectionCycle(sections, sectionId, item.id);
    });
  }, [section?.id, sections]);

  if (!isOpen) return null;

  const toggleDependency = (id: string) => {
    setDependsOnSectionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError(t("projects.modals.addSection.errors.nameRequired"));
      return;
    }

    const sectionId = section?.id ?? "__new__";
    const sectionsForSanitize = section
      ? sections
      : [
          ...sections,
          {
            id: sectionId,
            projectId: sections[0]?.projectId ?? "",
            name: form.name.trim(),
            displayOrder: nextDisplayOrder,
            dependsOnSectionIds: [],
          },
        ];

    const cleanedDeps = sanitizeSectionDependsOn({
      sectionId,
      dependsOnSectionIds,
      sections: sectionsForSanitize,
    });

    setSaving(true);
    try {
      await onSubmit({
        name: form.name,
        displayOrder: isEditing
          ? Number(form.displayOrder) || 1
          : nextDisplayOrder,
        dependsOnSectionIds: cleanedDeps,
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

          <div>
            <label className="mb-2 block text-sm font-bold text-hr-text">
              {t("projects.modals.addSection.fields.dependsOn")}
            </label>
            <p className="mb-2 text-xs text-hr-muted">
              {t("projects.modals.addSection.fields.dependsOnHint")}
            </p>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-hr-border">
              {dependencyOptions.length ? (
                dependencyOptions.map((item) => {
                  const checked = dependsOnSectionIds.includes(item.id);
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
                      <span className="text-sm text-hr-text">{item.name}</span>
                    </label>
                  );
                })
              ) : (
                <p className="px-4 py-6 text-center text-sm text-hr-muted">
                  {t("projects.modals.addSection.dependsOnEmpty")}
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
