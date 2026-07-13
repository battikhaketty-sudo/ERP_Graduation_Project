import type { LucideIcon } from "lucide-react";
import { Users } from "lucide-react";
import { useTranslation } from "../i18n";

type EmptyStateProps = {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
};

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon: Icon = Users,
}: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-hr-hover">
        <Icon className="size-8 text-hr-muted" strokeWidth={1.5} />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-hr-text">{title ?? t("common.noData")}</h3>
      <p className="max-w-sm text-center text-sm text-hr-muted">
        {message ?? t("common.noDataMessage")}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex h-10 items-center rounded-xl bg-hr-primary px-5 text-sm font-bold text-white transition hover:bg-hr-primary-hover"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
