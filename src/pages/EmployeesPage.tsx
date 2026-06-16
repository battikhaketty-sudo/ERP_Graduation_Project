import { useEffect, useMemo, useState } from "react";
import { AddEmployeeModal } from "../components/employees/AddEmployeeModal";
import { EmployeeDetailView } from "../components/employees/EmployeeDetailView";
import { EmployeePageHeader } from "../components/employees/EmployeePageHeader";
import { EmployeeTable } from "../components/employees/EmployeeTable";
import { EmployeeTableSkeleton } from "../components/employees/EmployeeTableSkeleton";
import { StatusBanner } from "../components/ui/StatusBanner";
import { DEFAULT_PAGE_SIZE } from "../constants/defaults";
import { addEmployee, deleteEmployee, getEmployees } from "../services/employees";
import type { Employee } from "../types/employee";
import { getThrownErrorMessage } from "../utils/apiResponse";

export function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchEmployees = async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }

      const result = await getEmployees(currentPage, DEFAULT_PAGE_SIZE);

      setEmployees(result.data || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.totalCount || result.data?.length || 0);

      return result.data || [];
    } catch (err) {
      if (!options?.silent) {
        setError(getThrownErrorMessage(err, "فشل تحميل الموظفين"));
      }
      return null;
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [currentPage]);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.phone.includes(query) ||
        employee.address.toLowerCase().includes(query),
    );
  }, [employees, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(filteredEmployees.map((employee) => employee.id)) : new Set());
  };

  const handleAddEmployee = async (newEmployee: Omit<Employee, "id">) => {
    try {
      await addEmployee(newEmployee);
      setError(null);
      setIsAddModalOpen(false);
      setCurrentPage(1);
      await fetchEmployees();
    } catch (err) {
      const message = getThrownErrorMessage(err, "فشل إضافة الموظف");
      setError(message);
      throw { message };
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${employee.name}؟`)) return;

    try {
      await deleteEmployee(employee.id);
      setError(null);
      setSelectedEmployee(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(employee.id);
        return next;
      });

      const refreshed = await fetchEmployees({ silent: true });

      if (refreshed && refreshed.length === 0 && currentPage > 1) {
        setCurrentPage((page) => page - 1);
      }
    } catch (err) {
      setError(getThrownErrorMessage(err, "فشل حذف الموظف"));
      await fetchEmployees({ silent: true });
    }
  };

  if (selectedEmployee) {
    return (
      <EmployeeDetailView
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
        onDelete={handleDeleteEmployee}
        onUpdate={(updatedEmployee) => {
          setEmployees((prev) =>
            prev.map((employee) =>
              employee.id === updatedEmployee.id ? updatedEmployee : employee,
            ),
          );
          setSelectedEmployee(updatedEmployee);
        }}
      />
    );
  }

  return (
    <>
      <main className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
        {error && <StatusBanner variant="error" message={error} className="mb-4" />}

        <EmployeePageHeader
          totalCount={totalCount}
          search={search}
          onSearchChange={setSearch}
          onAddClick={() => setIsAddModalOpen(true)}
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
            onEmployeeClick={setSelectedEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}
      </main>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddEmployee}
      />
    </>
  );
}
