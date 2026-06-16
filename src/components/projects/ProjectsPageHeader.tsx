import { Plus, Search } from "lucide-react";

type ProjectsPageHeaderProps = {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
  addLabel: string;
  searchPlaceholder: string;
};

export function ProjectsPageHeader({
  totalCount,
  search,
  onSearchChange,
  onAddClick,
  addLabel,
  searchPlaceholder,
}: ProjectsPageHeaderProps) {
  return (
    <header className="mb-5 rounded-2xl bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-hr-primary sm:text-[22px]">
            إدارة المشاريع{" "}
            <span className="font-medium text-hr-primary/80">({totalCount})</span> مشروع
          </h1>
        </div>
        <button
          type="button"
          onClick={onAddClick}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-hr-primary px-5 text-sm font-bold text-white transition hover:bg-hr-primary-hover"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          {addLabel}
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

type ViewTab = "projects" | "invitations";

type ProjectsViewTabsProps = {
  activeTab: ViewTab;
  onChange: (tab: ViewTab) => void;
};

export function ProjectsViewTabs({ activeTab, onChange }: ProjectsViewTabsProps) {
  const tabs: Array<{ key: ViewTab; label: string }> = [
    { key: "projects", label: "إدارة المشاريع" },
    { key: "invitations", label: "إدارة الدعوات" },
  ];

  return (
    <div className="mb-5 flex flex-wrap justify-center gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={[
            "inline-flex h-11 min-w-[160px] items-center justify-center rounded-xl px-6 text-sm font-bold transition",
            activeTab === tab.key
              ? "bg-hr-primary text-white shadow-sm"
              : "bg-[#E9F6FC] text-[#3A6E86] hover:bg-[#D8EEF9]",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
