import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { useTranslation } from "../../i18n";
import {
  sanitizeSectionDependsOn,
  wouldCreateSectionCycle,
} from "../../services/projects/sectionDependencies";
import {
  getSectionEdgeLabel,
  sectionEdgeId,
} from "../../services/projects/sectionEdgeLabelsStorage";
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
  const [edgeLabels, setEdgeLabels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = Boolean(section);
  useModalDismiss(onClose, isOpen && !saving);

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      name: section?.name ?? "",
      displayOrder: String(section?.displayOrder ?? nextDisplayOrder),
    });
    const deps = [...(section?.dependsOnSectionIds ?? [])];
    setDependsOnSectionIds(deps);
    const labels: Record<string, string> = {};
    if (section) {
      for (const depId of deps) {
        labels[depId] = getSectionEdgeLabel(section.projectId, depId, section.id);
      }
    }
    setEdgeLabels(labels);
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
    setDependsOnSectionIds((prev) => {
      if (prev.includes(id)) {
        setEdgeLabels((labels) => {
          const next = { ...labels };
          delete next[id];
          return next;
        });
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
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

    const dependencyEdgeLabels: Record<string, string> = {};
    for (const depId of cleanedDeps) {
      const label = (edgeLabels[depId] ?? "").trim();
      if (label) dependencyEdgeLabels[depId] = label;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: form.name,
        displayOrder: isEditing
          ? Number(form.displayOrder) || 1
          : nextDisplayOrder,
        dependsOnSectionIds: cleanedDeps,
        dependencyEdgeLabels,
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
            <div className="max-h-56 overflow-y-auto rounded-xl border border-hr-border">
              {dependencyOptions.length ? (
                dependencyOptions.map((item) => {
                  const checked = dependsOnSectionIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="border-b border-hr-border px-4 py-2.5 last:border-b-0"
                    >
                      <label className="flex cursor-pointer items-center gap-3 hover:opacity-90">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDependency(item.id)}
                          className="size-4 rounded border-hr-border"
                        />
                        <span className="text-sm text-hr-text">{item.name}</span>
                      </label>
                      {checked ? (
                        <div className="ms-7 mt-2">
                          <label className="mb-1 block text-[11px] font-medium text-hr-muted">
                            {t("projects.modals.addSection.fields.edgeLabel")}
                          </label>
                          <input
                            type="text"
                            value={edgeLabels[item.id] ?? ""}
                            onChange={(event) =>
                              setEdgeLabels((prev) => ({
                                ...prev,
                                [item.id]: event.target.value,
                              }))
                            }
                            maxLength={80}
                            placeholder={t(
                              "projects.modals.addSection.fields.edgeLabelPlaceholder",
                            )}
                            className="h-9 w-full rounded-lg border border-hr-border bg-hr-input-bg px-3 text-sm text-hr-text outline-none focus:border-hr-primary"
                            aria-label={
                              section
                                ? `${t("projects.modals.addSection.fields.edgeLabel")} ${sectionEdgeId(item.id, section.id)}`
                                : t("projects.modals.addSection.fields.edgeLabel")
                            }
                          />
                        </div>
                      ) : null}
                    </div>
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
