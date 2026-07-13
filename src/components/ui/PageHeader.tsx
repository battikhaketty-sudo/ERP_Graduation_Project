import type { ReactNode } from "react";
import type { QuickAction } from "./QuickActionBar";
import { QuickActionBar } from "./QuickActionBar";

type PageHeaderProps = {
  title: string;
  count: number;
  countLabel: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  subtitle?: ReactNode;
  actions: QuickAction[];
  onExport?: () => void;
  toolbarExtra?: ReactNode;
};

export function PageHeader({
  title,
  count,
  countLabel,
  search,
  onSearchChange,
  searchPlaceholder,
  subtitle,
  actions,
  onExport,
  toolbarExtra,
}: PageHeaderProps) {
  return (
    <header className="theme-transition mb-4 rounded-2xl bg-hr-surface p-5 shadow-card">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-hr-primary sm:text-[22px]">
          {title}{" "}
          <span className="font-medium text-hr-primary/80">({count})</span> {countLabel}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-hr-muted">{subtitle}</p>}
      </div>

      <QuickActionBar
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        actions={actions}
        onExport={onExport}
        extra={toolbarExtra}
      />
    </header>
  );
}
