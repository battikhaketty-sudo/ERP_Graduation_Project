import { Loader2, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";
import { modalCardClass, modalOverlayClass } from "./modalStyles";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();

  if (!open) return null;

  return createPortal(
    <div
      className={`${modalOverlayClass} z-[100]`}
      dir={dir}
      onClick={
        loading
          ? undefined
          : (event) => {
              if (event.target === event.currentTarget) onCancel();
            }
      }
    >
      <div
        className={`${modalCardClass} max-w-md`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
            <Trash2 className="size-5 text-red-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-lg font-bold text-hr-text"
            >
              {title ?? t("common.confirmDelete")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-hr-muted">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-11 rounded-xl border border-hr-border px-6 text-sm font-bold text-hr-text transition hover:bg-hr-hover disabled:opacity-60"
          >
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-500 px-6 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel ?? t("common.delete")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
