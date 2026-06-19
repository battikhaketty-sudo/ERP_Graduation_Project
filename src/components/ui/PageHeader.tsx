import type { ReactNode } from "react";
import { Plus, Search } from "lucide-react";

type PageHeaderProps = {
  title: string;
  count: number;
  countLabel: string;
  actionLabel: string;
  onActionClick: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  subtitle?: ReactNode;
};

export function PageHeader({
  title,
  count,
  countLabel,
  actionLabel,
  onActionClick,
  search,
  onSearchChange,
  searchPlaceholder,
  subtitle,
}: PageHeaderProps) {
  return (
    <header className="mb-5 rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-hr-primary sm:text-[22px]">
            {title}{" "}
            <span className="font-medium text-hr-primary/80">({count})</span> {countLabel}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-hr-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onActionClick}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-hr-primary px-5 text-sm font-bold text-white transition hover:bg-hr-primary-hover"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          {actionLabel}
        </button>
      </div>

      <div className="relative max-w-[420px]">
        <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-hr-muted" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-[45px] w-full rounded-full border border-hr-border bg-white pe-4 ps-11 text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
        />
      </div>
    </header>
  );
}
