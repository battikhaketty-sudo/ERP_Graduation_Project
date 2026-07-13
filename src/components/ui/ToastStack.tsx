import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";

const variantStyles = {
  success:
    "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/50 dark:text-green-300",
  error:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300",
  info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300",
} as const;

const variantIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
} as const;

export function ToastStack() {
  const { toasts, dismissToast } = useToast();
  const { dir } = usePreferences();
  const { t } = useTranslation();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 start-4 z-[100] flex max-w-sm flex-col gap-2"
      dir={dir}
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = variantIcons[toast.variant];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${variantStyles[toast.variant]}`}
            role="status"
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <p className="flex-1 font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-70 transition hover:opacity-100"
              aria-label={t("common.close")}
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
