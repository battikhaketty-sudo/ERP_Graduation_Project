import { Building2, Eye, Pencil } from "lucide-react";
import { useTranslation } from "../../i18n";
import type { Department } from "../../types/department";
import { EmptyState } from "../EmptyState";
import { Pagination } from "../Pagination";
import { TablePanelHeader } from "../ui/TablePanelHeader";

type DepartmentGridProps = {
  departments: Department[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDepartmentClick: (department: Department) => void;
  onDepartmentEdit?: (department: Department) => void;
  onAddClick?: () => void;
};

export function DepartmentGrid({
  departments,
  currentPage,
  totalPages,
  onPageChange,
  onDepartmentClick,
  onDepartmentEdit,
  onAddClick,
}: DepartmentGridProps) {
  const { t } = useTranslation();

  if (!departments.length) {
    return (
      <section className="hr-card">
        {onAddClick ? (
          <TablePanelHeader
            title={t("departments.grid.listTitle")}
            addLabel={t("pages.departments.addDepartment")}
            onAddClick={onAddClick}
          />
        ) : null}
        <EmptyState
          title={t("departments.grid.emptyTitle")}
          message={t("departments.grid.emptyMessage")}
          actionLabel={onAddClick ? t("departments.grid.emptyAction") : undefined}
          onAction={onAddClick}
          icon={Building2}
        />
      </section>
    );
  }

  return (
    <section className="hr-card">
      {onAddClick ? (
        <TablePanelHeader
          title={t("departments.grid.listTitle")}
          addLabel={t("pages.departments.addDepartment")}
          onAddClick={onAddClick}
        />
      ) : null}
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {departments.map((department) => (
          <article
            key={department.id}
            className="rounded-2xl border border-hr-border bg-hr-table-alt p-4 transition hover:border-hr-primary hover:shadow-sm"
          >
            <button
              type="button"
              onClick={() => onDepartmentClick(department)}
              className="w-full text-start"
            >
              <div className="mb-3 flex h-[100px] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl bg-hr-nav-active">
                <Building2 className="size-10 text-hr-primary/70" />
              </div>
              <h3 className="mb-1 text-base font-bold text-hr-text">{department.name}</h3>
              <p className="text-sm text-hr-muted">
                {t("departments.grid.manager")}: {department.managerName || t("common.dash")}
              </p>
              <p className="text-sm text-hr-muted">
                {t("departments.grid.parent")}: {department.parentName || t("departments.grid.noParent")}
              </p>
            </button>

            <div className="mt-3 flex gap-2 border-t border-hr-border pt-3">
              <button
                type="button"
                onClick={() => onDepartmentClick(department)}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-hr-primary transition hover:bg-hr-nav-active"
              >
                <Eye className="size-3.5" />
                {t("common.view")}
              </button>
              {onDepartmentEdit && (
                <button
                  type="button"
                  onClick={() => onDepartmentEdit(department)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-hr-muted transition hover:bg-hr-hover"
                >
                  <Pencil className="size-3.5" />
                  {t("common.edit")}
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </section>
  );
}
