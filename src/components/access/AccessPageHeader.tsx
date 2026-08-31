import { Search } from "lucide-react";
import { useTranslation } from "../../i18n";
import { AddProjectButton } from "../ui/AddProjectButton";

type AccessPageHeaderProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
};

export function AccessPageHeader({
  search,
  onSearchChange,
  searchPlaceholder,
}: AccessPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="theme-transition mb-5 rounded-2xl bg-hr-surface p-5 shadow-card">
      <div className="mb-4">
        <h1 className="whitespace-nowrap text-xl font-bold text-hr-primary sm:text-[22px]">
          {t("access.title")}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-xl border border-hr-border bg-hr-input-bg pe-4 ps-11 text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
          />
        </div>
        <AddProjectButton />
      </div>
    </header>
  );
}

export type AccessTab = "users" | "roles" | "permissions";

type AccessViewTabsProps = {
  activeTab: AccessTab;
  onChange: (tab: AccessTab) => void;
};

export function AccessViewTabs({ activeTab, onChange }: AccessViewTabsProps) {
  const { t } = useTranslation();

  const tabs: Array<{ key: AccessTab; label: string }> = [
    { key: "users", label: t("access.tabs.users") },
    { key: "roles", label: t("access.tabs.roles") },
    { key: "permissions", label: t("access.tabs.permissions") },
  ];

  return (
    <div className="mb-5 flex flex-wrap justify-center gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={activeTab === tab.key ? "hr-tab-pill-active" : "hr-tab-pill-inactive"}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
