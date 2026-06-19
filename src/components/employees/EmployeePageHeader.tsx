import { PageHeader } from "../ui/PageHeader";

type EmployeePageHeaderProps = {
  totalCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onAddClick: () => void;
  showBreadcrumb?: boolean;
};

export function EmployeePageHeader({
  totalCount,
  search,
  onSearchChange,
  onAddClick,
  showBreadcrumb = false,
}: EmployeePageHeaderProps) {
  return (
    <PageHeader
      title="الموظفين"
      count={totalCount}
      countLabel="موظف"
      actionLabel="إضافة موظف جديد"
      onActionClick={onAddClick}
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="ابحث عن موظف محدد"
      subtitle={showBreadcrumb ? "تفاصيل الموظف" : undefined}
    />
  );
}
