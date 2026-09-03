import { Archive, ArchiveRestore, Eye, Pencil, X } from "lucide-react";
import { DEFAULT_PAGE_SIZE } from "../../constants/defaults";
import { departmentPath, employeePath } from "../../constants/entityPaths";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";
import type { Employee } from "../../types/employee";
import { Pagination } from "../Pagination";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { EntityLink } from "../ui/EntityLink";
import { TableRowIndex } from "../ui/TableRowIndex";
import { EmptyState } from "../EmptyState";
import { TablePanelHeader } from "../ui/TablePanelHeader";
import { EmployeeAvatar } from "./EmployeeAvatar";

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
  onBulkArchive?: () => void;
  onBulkEdit?: () => void;
  onClearSelection?: () => void;
  archiveView?: "active" | "archived";
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
  onBulkArchive,
  onBulkEdit,
  onClearSelection,
  archiveView = "active",
  onAddClick,
}: EmployeeTableProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const nameAlignClass = dir === "rtl" ? "text-right" : "text-left";
  const allSelected =
    employees.length > 0 && employees.every((employee) => selectedIds.has(employee.id));
  const selectedCount = selectedIds.size;
  const isArchivedView = archiveView === "archived";

  return (
    <section className="hr-card">
      {onAddClick ? (
        <TablePanelHeader
          title={t("employees.table.listTitle")}
          addLabel={t("pages.employees.addEmployee")}
          onAddClick={onAddClick}
        />
      ) : null}

      {selectedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-hr-border bg-hr-hover/40 px-4 py-3 sm:px-5">
          <span className="me-auto text-sm font-medium text-hr-text">
            {t("employees.bulk.selectedCount", { count: String(selectedCount) })}
          </span>
          {selectedCount === 1 && onBulkEdit ? (
            <button
              type="button"
              onClick={onBulkEdit}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hr-border bg-hr-surface px-3 text-sm font-medium text-hr-text transition hover:border-hr-primary hover:text-hr-primary"
            >
              <Pencil className="size-4" />
              {t("common.edit")}
            </button>
          ) : null}
          {onBulkArchive ? (
            <button
              type="button"
              onClick={onBulkArchive}
              className={[
                "inline-flex h-9 items-center gap-1.5 rounded-lg border bg-hr-surface px-3 text-sm font-medium transition",
                isArchivedView
                  ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-950/30"
                  : "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900/50 dark:hover:bg-amber-950/30",
              ].join(" ")}
            >
              {isArchivedView ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
              {isArchivedView
                ? t("employees.bulk.unarchive")
                : t("employees.bulk.archive")}
            </button>
          ) : null}
          {onClearSelection ? (
            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm text-hr-muted transition hover:text-hr-text"
            >
              <X className="size-4" />
              {t("employees.bulk.clearSelection")}
            </button>
          ) : null}
        </div>
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
                    <CopyableIdCell
                      value={employee.userId || employee.employeeId || employee.id}
                      to={employeePath(employee.id)}
                    />
                  </td>
                  <td className={`px-3 py-3 align-middle ${nameAlignClass}`}>
                    <div className="inline-flex max-w-full items-center gap-2">
                      <EmployeeAvatar
                        src={employee.avatar}
                        name={employee.name}
                        className="size-9 shrink-0 rounded-full object-cover ring-1 ring-hr-border text-xs"
                      />
                      <span
                        className="max-w-[140px] truncate font-medium text-hr-text"
                        title={employee.name}
                      >
                        <EntityLink to={employeePath(employee.id)}>
                          {employee.name}
                        </EntityLink>
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
                    title={employee.workPhone || employee.phone}
                  >
                    <span dir="ltr" className="inline-block max-w-[120px] truncate align-middle">
                      {employee.workPhone || employee.phone}
                    </span>
                  </td>
                  <td
                    className="px-3 py-3 text-center align-middle text-hr-text"
                    title={employee.department || undefined}
                  >
                    <span className="inline-block max-w-[110px] truncate align-middle">
                      <EntityLink to={departmentPath(employee.departmentId)}>
                        {employee.department || t("common.dash")}
                      </EntityLink>
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
