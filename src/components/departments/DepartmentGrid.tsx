import { Building2 } from "lucide-react";
import type { Department } from "../../types/department";
import { Pagination } from "../Pagination";

type DepartmentGridProps = {
  departments: Department[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onDepartmentClick: (department: Department) => void;
};

export function DepartmentGrid({
  departments,
  currentPage,
  totalPages,
  onPageChange,
  onDepartmentClick,
}: DepartmentGridProps) {
  if (!departments.length) {
    return (
      <section className="rounded-2xl bg-white p-10 text-center shadow-card">
        <Building2 className="mx-auto mb-3 size-10 text-hr-muted" />
        <p className="text-hr-muted">لا توجد أقسام مطابقة للبحث</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white shadow-card">
      <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {departments.map((department) => (
          <button
            key={department.id}
            type="button"
            onClick={() => onDepartmentClick(department)}
            className="rounded-2xl border border-hr-border bg-[#FAFCFE] p-4 text-start transition hover:border-hr-primary hover:shadow-sm"
          >
            <div className="mb-3 flex h-[100px] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#DDF1FA] to-[#E8F4FD]">
              <Building2 className="size-10 text-hr-primary/70" />
            </div>
            <h3 className="mb-1 text-base font-bold text-hr-text">{department.name}</h3>
            <p className="text-sm text-hr-muted">
              المدير: {department.managerName || "-"}
            </p>
            <p className="text-sm text-hr-muted">
              القسم الأب: {department.parentName || "بدون"}
            </p>
          </button>
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
