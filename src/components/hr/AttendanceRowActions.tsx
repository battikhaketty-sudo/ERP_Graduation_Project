import { CheckCircle, FileX, Pencil, Trash2 } from "lucide-react";
import type { AttendanceRecord } from "../../types/attendance";
import { useTranslation } from "../../i18n";
import { iconBtnClass } from "../ui/formStyles";

type AttendanceRowActionsProps = {
  record: AttendanceRecord;
  onApprove: (id: string) => void;
  onRefuse: (id: string) => void;
  onEdit: (record: AttendanceRecord) => void;
  onDelete: (id: string) => void;
};

export function AttendanceRowActions({
  record,
  onApprove,
  onRefuse,
  onEdit,
  onDelete,
}: AttendanceRowActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        title={t("hr.attendance.actions.approve")}
        aria-label={t("hr.attendance.actions.approve")}
        onClick={() => onApprove(record.id)}
        className={`${iconBtnClass} text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40`}
      >
        <CheckCircle className="size-4" />
      </button>
      <button
        type="button"
        title={t("hr.attendance.actions.refuse")}
        aria-label={t("hr.attendance.actions.refuse")}
        onClick={() => onRefuse(record.id)}
        className={`${iconBtnClass} text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40`}
      >
        <FileX className="size-4" />
      </button>
      <button
        type="button"
        title={t("hr.attendance.actions.edit")}
        aria-label={t("hr.attendance.actions.edit")}
        onClick={() => onEdit(record)}
        className={`${iconBtnClass} text-hr-muted hover:text-hr-text`}
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        title={t("hr.attendance.actions.delete")}
        aria-label={t("hr.attendance.actions.delete")}
        onClick={() => onDelete(record.id)}
        className={`${iconBtnClass} text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40`}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
