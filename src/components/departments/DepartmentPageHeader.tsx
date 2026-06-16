import { PageHeader } from "../ui/PageHeader";

type DepartmentPageHeaderProps = {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
  subtitle?: string;
};

export function DepartmentPageHeader({
  totalCount,
  search,
  onSearchChange,
  onAddClick,
  subtitle,
}: DepartmentPageHeaderProps) {
  return (
    <PageHeader
      title="الأقسام"
      count={totalCount}
      countLabel="قسم"
      actionLabel="إضافة قسم جديد"
      onActionClick={onAddClick}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="ابحث عن قسم محدد"
      subtitle={subtitle}
    />
  );
}
