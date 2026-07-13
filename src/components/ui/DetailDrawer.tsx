import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";

type DetailDrawerProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  widthClassName?: string;
};

export function DetailDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  widthClassName = "max-w-md",
}: DetailDrawerProps) {
  const { dir } = usePreferences();
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex" dir={dir}>
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={t("common.close")}
        onClick={onClose}
      />

      <aside
        className={`relative ms-auto flex h-full w-full flex-col bg-hr-surface shadow-2xl ${widthClassName}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex items-start justify-between border-b border-hr-border px-5 py-4">
          <div>
            <h2 id="drawer-title" className="text-lg font-bold text-hr-text">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-hr-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hr-icon-btn text-hr-muted hover:text-hr-text"
            aria-label={t("common.close")}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="border-t border-hr-border bg-hr-hover px-5 py-4">{footer}</div>
        )}
      </aside>
    </div>
  );
}
