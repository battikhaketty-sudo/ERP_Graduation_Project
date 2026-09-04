import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useUrlQueryNavigation } from "../hooks/useUrlQueryNavigation";
import { AddEmployeeModal } from "../components/employees/AddEmployeeModal";
import { EmployeeDetailView } from "../components/employees/EmployeeDetailView";
import { EmployeeDrawerPreview } from "../components/employees/EmployeeDrawerPreview";
import { EmployeePageHeader } from "../components/employees/EmployeePageHeader";
import { EmployeeTable } from "../components/employees/EmployeeTable";
import { EmployeeTableSkeleton } from "../components/employees/EmployeeTableSkeleton";
import { DetailDrawer } from "../components/ui/DetailDrawer";
import { StatusBanner } from "../components/ui/StatusBanner";
import { DEFAULT_PAGE_SIZE } from "../constants/defaults";
import { useRegisterCommandActions } from "../context/CommandBarContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import {
  addEmployee,
  archiveEmployee,
  getEmployeeById,
  getEmployees,
  unarchiveEmployee,
} from "../services/employees";
import type { Employee } from "../types/employee";
import { getThrownErrorMessage } from "../utils/apiResponse";
import { exportToCsv } from "../utils/exportCsv";
import { useTranslation } from "../i18n";

export function EmployeesPage() {
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    value: employeeId,
    pushValue: openEmployeeInUrl,
    removeValue: clearEmployeeFromUrl,
    goBack: goBackToEmployeeList,
  } = useUrlQueryNavigation({ param: "id" });

  const [search, setSearch] = useState("");
  const [archiveView, setArchiveView] = useState<"active" | "archived">("active");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [drawerEmployee, setDrawerEmployee] = useState<Employee | null>(null);
  const [fullPageEmployee, setFullPageEmployee] = useState<Employee | null>(
    null,
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (searchParams.get("add") !== "1") return;

    setIsAddModalOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete("add");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const commandActions = useMemo(
    () => [
      {
        id: "employees-add",
        label: t("pages.employees.addEmployee"),
        keywords: ["موظف", "add", "employee"],
        group: "actions" as const,
        onSelect: () => setIsAddModalOpen(true),
      },
    ],
    [t],
  );
  useRegisterCommandActions(commandActions);

  const fetchEmployees = useCallback(
    async (options?: { silent?: boolean; page?: number }) => {
      const page = options?.page ?? currentPage;
      try {
        if (!options?.silent) {
          setLoading(true);
          setError(null);
        }

        const result = await getEmployees(page, DEFAULT_PAGE_SIZE, {
          legalName: search.trim() || undefined,
          archived: archiveView === "archived",
        });

        const data = result.data || [];
        setEmployees(data);
        setTotalPages(result.totalPages || 1);
        setTotalCount(result.totalCount || data.length);

        return data;
      } catch (err) {
        if (!options?.silent) {
          setError(getThrownErrorMessage(err, t("employees.errors.loadList")));
        }
        return null;
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [archiveView, currentPage, search, t],
  );

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void fetchEmployees();
      },
      search ? 300 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [fetchEmployees, search]);

  useEffect(() => {
    if (!employeeId) {
      setFullPageEmployee(null);
      return;
    }

    let cancelled = false;

    setFullPageEmployee((current) => {
      if (current?.id === employeeId) return current;
      return employees.find((employee) => employee.id === employeeId) ?? null;
    });

    const loadEmployee = async () => {
      try {
        const employee = await getEmployeeById(employeeId);
        if (!cancelled) {
          setFullPageEmployee(employee);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getThrownErrorMessage(err, t("employees.errors.loadDetail")));
          setFullPageEmployee((current) =>
            current?.id === employeeId ? current : null,
          );
        }
      }
    };

    void loadEmployee();

    return () => {
      cancelled = true;
    };
  }, [employeeId, employees, t]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((employee) =>
      employee.name.toLowerCase().includes(query),
    );
  }, [employees, search]);

  const handleExport = () => {
    exportToCsv(
      `employees-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        t("employees.export.headers.name"),
        t("employees.export.headers.email"),
        t("employees.export.headers.phone"),
        t("employees.export.headers.department"),
        t("employees.export.headers.manager"),
      ],
      filteredEmployees.map((employee) => [
        employee.name,
        employee.email,
        employee.workPhone || employee.phone,
        employee.department ?? employee.address,
        employee.managerName ?? "",
      ]),
    );
    showToast(t("employees.toasts.exportSuccess"), "success");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(
      checked
        ? new Set(filteredEmployees.map((employee) => employee.id))
        : new Set(),
    );
  };

  const handleAddEmployee = async (newEmployee: Omit<Employee, "id">) => {
    try {
      await addEmployee(newEmployee);
      setError(null);
      setIsAddModalOpen(false);
      await fetchEmployees();
      showToast(t("employees.toasts.addSuccess"), "success");
    } catch (err) {
      const message = getThrownErrorMessage(err, t("employees.errors.add"));
      setError(message);
      showToast(message, "error");
      throw { message };
    }
  };

  const handleArchiveAction = async (
    employee: Employee,
    action: "archive" | "unarchive",
  ) => {
    const isUnarchive = action === "unarchive";
    const confirmed = await confirm({
      title: isUnarchive
        ? t("employees.archive.unarchiveTitle")
        : t("employees.archive.confirmTitle"),
      message: isUnarchive
        ? t("employees.archive.unarchiveMessage", { name: employee.name })
        : t("employees.archive.confirmMessage", { name: employee.name }),
      confirmLabel: isUnarchive
        ? t("employees.archive.unarchiveLabel")
        : t("employees.archive.archiveLabel"),
    });
    if (!confirmed) return;

    try {
      if (isUnarchive) {
        await unarchiveEmployee(employee.id);
        showToast(
          t("employees.toasts.unarchiveSuccess", { name: employee.name }),
          "success",
        );
      } else {
        await archiveEmployee(employee.id);
        showToast(
          t("employees.toasts.archiveSuccess", { name: employee.name }),
          "success",
        );
      }

      setError(null);
      setDrawerEmployee(null);
      clearEmployeeFromUrl();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(employee.id);
        return next;
      });
      await fetchEmployees({ silent: true });
    } catch (err) {
      const message = getThrownErrorMessage(
        err,
        isUnarchive
          ? t("employees.errors.unarchive")
          : t("employees.errors.archive"),
      );
      setError(message);
      showToast(message, "error");
    }
  };

  const handleArchiveViewChange = (view: "active" | "archived") => {
    setArchiveView(view);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkEdit = () => {
    const id = [...selectedIds][0];
    if (!id) return;
    const employee = filteredEmployees.find((item) => item.id === id);
    if (employee) {
      openEmployeeInUrl(employee.id);
      clearSelection();
    }
  };

  const handleBulkArchiveAction = async (action: "archive" | "unarchive") => {
    const targets = filteredEmployees.filter((employee) =>
      selectedIds.has(employee.id),
    );
    if (!targets.length) return;

    const isUnarchive = action === "unarchive";
    const confirmed = await confirm({
      title: isUnarchive
        ? t("employees.bulk.unarchiveTitle")
        : t("employees.bulk.archiveTitle"),
      message: isUnarchive
        ? t("employees.bulk.unarchiveMessage", {
            count: String(targets.length),
          })
        : t("employees.bulk.archiveMessage", { count: String(targets.length) }),
      confirmLabel: isUnarchive
        ? t("employees.bulk.unarchive")
        : t("employees.bulk.archive"),
    });
    if (!confirmed) return;

    try {
      for (const employee of targets) {
        if (isUnarchive) {
          await unarchiveEmployee(employee.id);
        } else {
          await archiveEmployee(employee.id);
        }
      }
      showToast(
        isUnarchive
          ? t("employees.toasts.bulkUnarchiveSuccess", {
              count: String(targets.length),
            })
          : t("employees.toasts.bulkArchiveSuccess", {
              count: String(targets.length),
            }),
        "success",
      );
      setError(null);
      clearSelection();
      setDrawerEmployee(null);
      await fetchEmployees();
    } catch (err) {
      const message = getThrownErrorMessage(
        err,
        isUnarchive
          ? t("employees.errors.unarchive")
          : t("employees.errors.archive"),
      );
      setError(message);
      showToast(message, "error");
    }
  };

  if (fullPageEmployee) {
    return (
      <EmployeeDetailView
        employee={fullPageEmployee}
        onBack={goBackToEmployeeList}
        onArchive={(employee) => void handleArchiveAction(employee, "archive")}
        onUnarchive={(employee) => void handleArchiveAction(employee, "unarchive")}
        onUpdate={(updatedEmployee) => {
          setEmployees((prev) =>
            prev.map((employee) =>
              employee.id === updatedEmployee.id ? updatedEmployee : employee,
            ),
          );
          setFullPageEmployee(updatedEmployee);
          showToast(t("employees.toasts.saveSuccess"), "success");
        }}
      />
    );
  }

  return (
    <>
      <main className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
        {error && (
          <StatusBanner variant="error" message={error} className="mb-4" />
        )}

        <EmployeePageHeader
          totalCount={totalCount}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setCurrentPage(1);
          }}
          onExport={handleExport}
          archiveView={archiveView}
          onArchiveViewChange={handleArchiveViewChange}
        />

        {loading ? (
          <EmployeeTableSkeleton />
        ) : (
          <EmployeeTable
            employees={filteredEmployees}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onEmployeeClick={setDrawerEmployee}
            onEmployeeEdit={(employee) => openEmployeeInUrl(employee.id)}
            onArchive={(employee) => void handleArchiveAction(employee, "archive")}
            onUnarchive={(employee) => void handleArchiveAction(employee, "unarchive")}
            onBulkArchive={() => void handleBulkArchiveAction("archive")}
            onBulkUnarchive={() => void handleBulkArchiveAction("unarchive")}
            onBulkEdit={handleBulkEdit}
            onClearSelection={clearSelection}
            archiveView={archiveView}
            onAddClick={() => setIsAddModalOpen(true)}
          />
        )}
      </main>

      <DetailDrawer
        open={Boolean(drawerEmployee)}
        title={drawerEmployee?.name ?? t("employees.drawer.defaultTitle")}
        subtitle={t("employees.drawer.subtitle")}
        onClose={() => setDrawerEmployee(null)}
      >
        {drawerEmployee && (
          <EmployeeDrawerPreview
            employee={drawerEmployee}
            onOpenFull={() => {
              openEmployeeInUrl(drawerEmployee.id);
              setDrawerEmployee(null);
            }}
            onArchive={(employee) => void handleArchiveAction(employee, "archive")}
            onUnarchive={(employee) => void handleArchiveAction(employee, "unarchive")}
          />
        )}
      </DetailDrawer>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddEmployee}
      />
    </>
  );
}
