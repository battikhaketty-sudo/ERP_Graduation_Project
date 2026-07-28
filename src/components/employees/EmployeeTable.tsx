import { Archive, ArchiveRestore, Eye, Pencil } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "../../constants/defaults";
import { usePreferences } from "../../context/PreferencesContext";
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
  const { dir } = usePreferences();
  const nameAlignClass = dir === "rtl" ? "text-right" : "text-left";
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
      <div className="min-w-0 overflow-x-auto">
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
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="hr-table-head">
                <th className="w-12 px-3 py-3 text-center font-medium">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleSelectAll(e.target.checked)}
                    className="size-4 accent-hr-primary"
                    aria-label={t("common.selectAll")}
                  />
                </th>
                <th className="w-12 px-3 py-3 text-center font-medium">
                  {t("table.columns.index")}
                </th>
                <th className="w-36 px-3 py-3 text-center font-medium">
                  {t("employees.table.columns.userId")}
                </th>
                <th className={`min-w-[180px] px-3 py-3 font-medium ${nameAlignClass}`}>
                  {t("employees.table.columns.name")}
                </th>
                <th className="min-w-[160px] px-3 py-3 text-center font-medium">
                  {t("employees.table.columns.email")}
                </th>
                <th className="min-w-[120px] px-3 py-3 text-center font-medium">
                  {t("employees.table.columns.phone")}
                </th>
                <th className="min-w-[100px] px-3 py-3 text-center font-medium">
                  {t("employees.table.columns.department")}
                </th>
                <th className="w-28 px-3 py-3 text-center font-medium">
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
                  <td className="px-3 py-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(employee.id)}
                      onChange={() => onToggleSelect(employee.id)}
                      className="size-4 accent-hr-primary"
                      aria-label={t("common.selectItem", { name: employee.name })}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-3 py-3 text-center align-middle text-hr-muted">
                    <TableRowIndex
                      index={index}
                      page={currentPage}
                      pageSize={DEFAULT_PAGE_SIZE}
                    />
                  </td>
                  <td className="px-3 py-3 text-center align-middle">
                    <CopyableIdCell value={employee.userId || employee.employeeId || "-"} />
                  </td>
                  <td className={`px-3 py-3 align-middle ${nameAlignClass}`}>
                    <div className="inline-flex max-w-full items-center gap-2">
                      <img
                        src={employee.avatar}
                        alt=""
                        className="size-9 shrink-0 rounded-full object-cover ring-1 ring-hr-border"
                      />
                      <span
                        className="max-w-[140px] truncate font-medium text-hr-text"
                        title={employee.name}
                      >
                        {employee.name}
                      </span>
                    </div>
                  </td>
                  <td
                    className="px-3 py-3 text-center align-middle text-hr-muted"
                    title={employee.email}
                  >
                    <span dir="ltr" className="inline-block max-w-[180px] truncate align-middle">
                      {employee.email}
                    </span>
                  </td>
                  <td
                    className="px-3 py-3 text-center align-middle text-hr-muted"
                    title={employee.phone}
                  >
                    <span dir="ltr" className="inline-block max-w-[120px] truncate align-middle">
                      {employee.phone}
                    </span>
                  </td>
                  <td
                    className="px-3 py-3 text-center align-middle text-hr-text"
                    title={employee.department || undefined}
                  >
                    <span className="inline-block max-w-[110px] truncate align-middle">
                      {employee.department || t("common.dash")}
                    </span>
                  </td>
                  <td
                    className="px-3 py-3 text-center align-middle"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="inline-flex items-center justify-center gap-0.5">
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
