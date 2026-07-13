import { Archive, ArchiveRestore, Eye, Pencil } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "../../constants/defaults";
import { useTranslation } from "../../i18n";
import type { Employee } from "../../types/employee";
import { Pagination } from "../Pagination";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { TableRowIndex } from "../ui/TableRowIndex";
import { EmptyState } from "../EmptyState";
import { TablePanelHeader } from "../ui/TablePanelHeader";

type EmployeeTableProps = {
  employees: Employee[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onEmployeeClick: (employee: Employee) => void;
  onEmployeeEdit?: (employee: Employee) => void;
  onToggleArchive: (employee: Employee) => void;
  onAddClick?: () => void;
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
  onEmployeeEdit,
  onToggleArchive,
  onAddClick,
}: EmployeeTableProps) {
  const { t } = useTranslation();
  const allSelected =
    employees.length > 0 && employees.every((employee) => selectedIds.has(employee.id));

  return (
    <section className="hr-card">
      {onAddClick ? (
        <TablePanelHeader
          title={t("employees.table.listTitle")}
          addLabel={t("pages.employees.addEmployee")}
          onAddClick={onAddClick}
        />
      ) : null}
      <div className="overflow-x-auto">
        {employees.length === 0 ? (
          <EmptyState
            title={t("employees.table.emptyTitle")}
            message={
              onAddClick
                ? t("employees.table.emptyAddMessage")
                : t("employees.table.emptySearchMessage")
            }
            actionLabel={onAddClick ? t("employees.table.emptyAction") : undefined}
            onAction={onAddClick}
          />
        ) : (
          <table className="w-full min-w-[1280px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-12" />
              <col className="w-10" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-16" />
              <col />
              <col className="w-44" />
              <col className="w-24" />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-32" />
              <col className="w-28" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr className="hr-table-head">
                <th className="px-3 py-3 text-center font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleSelectAll(e.target.checked)}
                    className="size-4 accent-hr-primary"
                    aria-label={t("common.selectAll")}
                  />
                </th>
                <th className="px-3 py-3 text-center font-medium">{t("table.columns.index")}</th>
                <th className="px-3 py-3 text-center font-medium">{t("table.columns.id")}</th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("employees.table.columns.userId")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("employees.table.columns.avatar")}
                </th>
                <th className="px-3 py-3 text-start font-medium">
                  {t("employees.table.columns.name")}
                </th>
                <th className="px-3 py-3 text-start font-medium">
                  {t("employees.table.columns.email")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("employees.table.columns.gender")}
                </th>
                <th className="px-3 py-3 text-start font-medium">
                  {t("employees.table.columns.phone")}
                </th>
                <th className="px-3 py-3 text-start font-medium">
                  {t("employees.table.columns.department")}
                </th>
                <th className="px-3 py-3 text-start font-medium">
                  {t("employees.table.columns.manager")}
                </th>
                <th className="px-3 py-3 text-start font-medium">
                  {t("employees.table.columns.nationality")}
                </th>
                <th className="px-3 py-3 text-center font-medium">
                  {t("employees.table.columns.details")}
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => (
                <tr
                  key={employee.id}
                  className={`${index % 2 ? "hr-table-row-alt" : "hr-table-row"} cursor-pointer`}
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
                      aria-label={t("common.selectItem", { name: employee.name })}
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
                    <CopyableIdCell value={employee.userId || employee.employeeId || "-"} />
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
                    {employee.email}
                  </td>
                  <td className="truncate px-3 py-3 text-center text-hr-muted">
                    {employee.genderName || t("common.dash")}
                  </td>
                  <td className="truncate px-3 py-3 text-hr-muted" dir="ltr">
                    {employee.phone}
                  </td>
                  <td className="truncate px-3 py-3 text-hr-text">
                    {employee.department || t("common.dash")}
                  </td>
                  <td className="truncate px-3 py-3 text-hr-text">
                    {employee.managerName || t("common.dash")}
                  </td>
                  <td className="truncate px-3 py-3 text-hr-text">
                    {employee.nationality || t("common.dash")}
                  </td>
                  <td
                    className="px-3 py-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        className="hr-icon-btn text-hr-primary"
                        aria-label={t("common.viewItem", { name: employee.name })}
                        title={t("common.view")}
                        onClick={(event) => {
                          event.stopPropagation();
                          onEmployeeClick(employee);
                        }}
                      >
                        <Eye className="size-4" />
                      </button>
                      {onEmployeeEdit && (
                        <button
                          type="button"
                          className="hr-icon-btn text-hr-muted hover:text-hr-text"
                          aria-label={t("common.editItem", { name: employee.name })}
                          title={t("common.edit")}
                          onClick={(event) => {
                            event.stopPropagation();
                            onEmployeeEdit(employee);
                          }}
                        >
                          <Pencil className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        className="hr-icon-btn text-hr-muted hover:text-amber-600"
                        aria-label={
                          employee.isArchived
                            ? t("common.unarchiveItem", { name: employee.name })
                            : t("common.archiveItem", { name: employee.name })
                        }
                        title={
                          employee.isArchived
                            ? t("employees.archive.unarchiveLabel")
                            : t("employees.archive.archiveLabel")
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleArchive(employee);
                        }}
                      >
                        {employee.isArchived ? (
                          <ArchiveRestore className="size-4" />
                        ) : (
                          <Archive className="size-4" />
                        )}
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
