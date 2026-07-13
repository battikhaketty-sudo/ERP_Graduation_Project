import type { LucideIcon } from "lucide-react";
import { Download, Plus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "../../i18n";

export type QuickAction = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  primary?: boolean;
  hidden?: boolean;
};

type QuickActionBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  actions: QuickAction[];
  onExport?: () => void;
  exportLabel?: string;
  extra?: ReactNode;
};

export function QuickActionBar({
  search,
  onSearchChange,
  searchPlaceholder,
  actions,
  onExport,
  exportLabel,
  extra,
}: QuickActionBarProps) {
  const { t } = useTranslation();
  const visibleActions = actions.filter((action) => !action.hidden);
  const primaryActions = visibleActions.filter((action) => action.primary);
  const secondaryActions = visibleActions.filter((action) => !action.primary);

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder ?? t("common.searchPlaceholder")}
          className="h-10 w-full rounded-xl border border-hr-border bg-hr-input-bg pe-3 ps-9 text-sm outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
        />
      </div>

      {extra}

      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-hr-border bg-hr-surface px-4 text-sm font-medium text-hr-text transition hover:bg-hr-hover"
        >
          <Download className="size-4" />
          {exportLabel ?? t("common.export")}
        </button>
      )}

      {secondaryActions.map((action) => {
        const Icon = action.icon ?? Plus;
        return (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-hr-border bg-hr-surface px-4 text-sm font-medium text-hr-text transition hover:bg-hr-hover"
          >
            <Icon className="size-4" />
            {action.label}
          </button>
        );
      })}

      {primaryActions.length > 0 ? (
        <div className="ms-auto flex flex-wrap items-center gap-2">
          {primaryActions.map((action) => {
            const Icon = action.icon ?? Plus;
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-hr-primary px-4 text-sm font-bold text-white transition hover:bg-hr-primary-hover"
              >
                <Icon className="size-4" />
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
