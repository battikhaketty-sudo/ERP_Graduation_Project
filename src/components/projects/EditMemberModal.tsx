import { useEffect, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useProjectLabels } from "../../hooks/useProjectLabels";
import { useTranslation } from "../../i18n";
import { employeePath } from "../../constants/entityPaths";
import type { ProjectMember } from "../../types/project";
import { alertErrorClass, cancelBtnClass, ModalCloseButton, ModalTitleBar } from "../ui/modalStyles";
import { EntityLink } from "../ui/EntityLink";
import { inputClass, modalCardClass, modalOverlayClass } from "./project-ui";

type EditMemberModalProps = {
  isOpen: boolean;
  member: ProjectMember | null;
  onClose: () => void;
  onSubmit: (member: ProjectMember, role: string) => Promise<void>;
};

export function EditMemberModal({ isOpen, member, onClose, onSubmit }: EditMemberModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const { memberRoleOptions } = useProjectLabels();
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
      setError(t("projects.modals.editMember.errors.roleRequired"));
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
          : t("projects.modals.editMember.errors.updateFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={modalOverlayClass} dir={dir}>
      <div className={`${modalCardClass} relative max-w-md`}>
        <ModalCloseButton onClick={onClose} disabled={saving} />
        <ModalTitleBar
          title={t("projects.modals.editMember.title")}
          subtitle={
            <EntityLink to={employeePath(member.employeeId)}>
              {member.employeeName}
            </EntityLink>
          }
          onClose={onClose}
          disabled={saving}
          hideCloseButton
        />

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-hr-text">
              {t("projects.modals.editMember.role")}
            </label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className={inputClass}
            >
              {memberRoleOptions.map((item) => (
                <option key={item.id} value={item.apiLabel}>
                  {item.label}
                </option>
              ))}
            </select>
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
              {saving ? t("common.saving") : t("common.save")}
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
