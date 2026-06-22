import { MoreVertical, Trash2 } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "../../constants/defaults";
import type { Employee } from "../../types/employee";
import { RoleBadge } from "../RoleBadge";
import { Pagination } from "../Pagination";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { TableRowIndex } from "../ui/TableRowIndex";
import { EmptyState } from "../EmptyState";

type EmployeeTableProps = {
  employees: Employee[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEmployeeClick: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
};

export function EmployeeTable({
  employees,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  currentPage,
  totalPages,
  onPageChange,
  onEmployeeClick,
  onDeleteEmployee,
}: EmployeeTableProps) {
  const allSelected =
    employees.length > 0 && employees.every((employee) => selectedIds.has(employee.id));

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-card">
      <div className="overflow-x-auto">
        {employees.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full min-w-[920px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-12" />
              <col className="w-10" />
              <col className="w-20" />
              <col />
              <col className="w-32" />
              <col className="w-44" />
              <col className="w-28" />
              <col className="w-32" />
              <col className="w-16" />
            </colgroup>
            <thead>
              <tr className="bg-[#F5FAFD] text-hr-muted">
                <th className="px-3 py-3 text-center font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleSelectAll(e.target.checked)}
                    className="size-4 accent-hr-primary"
                    aria-label="تحديد الكل"
                  />
                </th>
                <th className="px-3 py-3 text-center font-medium">#</th>
                <th className="px-3 py-3 text-center font-medium">id</th>
                <th className="px-3 py-3 text-center font-medium">صورة الموظف</th>
                <th className="px-3 py-3 text-start font-medium">اسم الموظف</th>
                <th className="px-3 py-3 text-start font-medium">رقم الموبايل</th>
                <th className="px-3 py-3 text-start font-medium">البريد الالكتروني</th>
                <th className="px-3 py-3 text-center font-medium">دور العمل</th>
                <th className="px-3 py-3 text-start font-medium">العنوان</th>
                <th className="px-3 py-3 text-center font-medium">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => (
                <tr
                  key={employee.id}
                  className={`${index % 2 ? "bg-[#FAFCFE]" : "bg-white"} cursor-pointer transition hover:bg-blue-50/60`}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("button, input, a, label")) return;
                    onEmployeeClick(employee);
                  }}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(employee.id)}
                      onChange={() => onToggleSelect(employee.id)}
                      className="size-4 accent-hr-primary"
                      aria-label={`تحديد ${employee.name}`}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-3 py-3 text-center text-hr-muted">
                    <TableRowIndex
                      index={index}
                      page={currentPage}
                      pageSize={DEFAULT_PAGE_SIZE}
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CopyableIdCell value={employee.id} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <img
                      src={employee.avatar}
                      alt=""
                      className="mx-auto size-10 rounded-full object-cover ring-1 ring-hr-border"
                    />
                  </td>
                  <td className="truncate px-3 py-3 font-medium text-hr-text">
                    {employee.name}
                  </td>
                  <td className="truncate px-3 py-3 text-hr-muted" dir="ltr">
                    {employee.phone}
                  </td>
                  <td className="truncate px-3 py-3 text-hr-muted" dir="ltr">
                    {employee.email}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <RoleBadge role={employee.role} />
                  </td>
                  <td className="truncate px-3 py-3 text-hr-text">{employee.address}</td>
                  <td
                    className="px-3 py-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label={`حذف ${employee.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void onDeleteEmployee(employee);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="text-hr-muted transition hover:text-hr-text"
                        aria-label={`تفاصيل ${employee.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEmployeeClick(employee);
                        }}
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {employees.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </section>
  );
}
