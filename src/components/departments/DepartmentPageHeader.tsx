import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useTranslation } from "../../i18n";
import { PageHeader } from "../ui/PageHeader";

type DepartmentPageHeaderProps = {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onExport?: () => void;
  subtitle?: string;
};

export function DepartmentPageHeader({
  totalCount,
  search,
  onSearchChange,
  onExport,
  subtitle,
}: DepartmentPageHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <PageHeader
      title={t("pages.departments.title")}
      count={totalCount}
      countLabel={t("pages.departments.countLabel")}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder={t("pages.departments.searchPlaceholder")}
      subtitle={subtitle}
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
    />
  );
}
