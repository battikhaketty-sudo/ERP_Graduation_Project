import { Plus, Search } from "lucide-react";
import { useTranslation } from "../../i18n";

type ProjectsPageHeaderProps = {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
  addLabel: string;
  searchPlaceholder: string;
  showAddButton?: boolean;
};

export function ProjectsPageHeader({
  totalCount,
  search,
  onSearchChange,
  onAddClick,
  addLabel,
  searchPlaceholder,
  showAddButton = true,
}: ProjectsPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="theme-transition mb-5 rounded-2xl bg-hr-surface p-5 shadow-card">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-hr-primary sm:text-[22px]">
          {t("pages.projects.title")}{" "}
          <span className="font-medium text-hr-primary/80">({totalCount})</span>{" "}
          {t("pages.projects.countLabel")}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-[420px]">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-hr-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-[45px] w-full rounded-full border border-hr-border bg-hr-input-bg pe-4 ps-11 text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
          />
        </div>
        {showAddButton ? (
          <button
            type="button"
            onClick={onAddClick}
            className="ms-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-hr-primary px-4 text-sm font-bold text-white transition hover:bg-hr-primary-hover"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            {addLabel}
          </button>
        ) : null}
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
  const { t } = useTranslation();

  const tabs: Array<{ key: ViewTab; label: string }> = [
    { key: "projects", label: t("projects.header.projectsTab") },
    { key: "invitations", label: t("projects.header.invitationsTab") },
  ];

  return (
    <div className="mb-5 flex flex-wrap justify-center gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={[
            activeTab === tab.key ? "hr-tab-pill-active" : "hr-tab-pill-inactive",
          ].join(" ")}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
