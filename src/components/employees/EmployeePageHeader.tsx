import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useTranslation } from "../../i18n";
import { PageHeader } from "../ui/PageHeader";

type EmployeePageHeaderProps = {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onExport?: () => void;
  showBreadcrumb?: boolean;
  archiveView: "active" | "archived";
  onArchiveViewChange: (view: "active" | "archived") => void;
};

export function EmployeePageHeader({
  totalCount,
  search,
  onSearchChange,
  onExport,
  showBreadcrumb = false,
  archiveView,
  onArchiveViewChange,
}: EmployeePageHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PageHeader
      title={t("pages.employees.title")}
      count={totalCount}
      countLabel={t("pages.employees.countLabel")}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={t("pages.employees.searchPlaceholder")}
      subtitle={showBreadcrumb ? t("pages.employees.detailSubtitle") : undefined}
      onExport={onExport}
      actions={[
        {
          id: "add-project",
          label: t("pages.projects.addProject"),
          icon: Plus,
          onClick: () => navigate(`${ROUTES.projects}?add=1`),
          primary: true,
        },
      ]}
      toolbarExtra={
        <div className="flex rounded-xl border border-hr-border bg-hr-surface p-0.5 text-sm">
          <button
            type="button"
            onClick={() => onArchiveViewChange("active")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              archiveView === "active"
                ? "bg-hr-primary text-white"
                : "text-hr-muted hover:text-hr-text"
            }`}
          >
            {t("common.active")}
          </button>
          <button
            type="button"
            onClick={() => onArchiveViewChange("archived")}
            className={`rounded-lg px-3 py-1.5 font-medium transition ${
              archiveView === "archived"
                ? "bg-hr-primary text-white"
                : "text-hr-muted hover:text-hr-text"
            }`}
          >
            {t("common.archived")}
          </button>
        </div>
      }
    />
  );
}
