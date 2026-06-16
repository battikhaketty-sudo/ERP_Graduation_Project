import { useEffect, useMemo, useState } from "react";
import { AddDepartmentModal } from "../components/departments/AddDepartmentModal";
import { DepartmentDetailView } from "../components/departments/DepartmentDetailView";
import { DepartmentGrid } from "../components/departments/DepartmentGrid";
import { DepartmentGridSkeleton } from "../components/departments/DepartmentGridSkeleton";
import { DepartmentPageHeader } from "../components/departments/DepartmentPageHeader";
import {
  addDepartment,
  deleteDepartment,
  getDepartments,
  type Department,
} from "../services/hrApi";
import { getThrownErrorMessage } from "../utils/apiResponse";

const PAGE_SIZE = 9;

export function DepartmentsPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getDepartments({
        page: currentPage,
        limit: PAGE_SIZE,
        name: search.trim() || undefined,
      });
      setDepartments(result.records);
      setTotalPages(result.meta.totalPages || 1);
      setTotalCount(result.meta.totalItems || result.records.length);
    } catch (err) {
      setError(getThrownErrorMessage(err, "فشل تحميل الأقسام"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchDepartments();
    }, search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [currentPage, search]);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter(
      (department) =>
        department.name.toLowerCase().includes(query) ||
        (department.managerName || "").toLowerCase().includes(query) ||
        (department.parentName || "").toLowerCase().includes(query),
    );
  }, [departments, search]);

  const handleAddDepartment = async (payload: {
    name: string;
    managerId: string;
    parentId?: string;
    description?: string;
  }) => {
    try {
      await addDepartment(payload);
      setError(null);
      setIsAddModalOpen(false);
      setCurrentPage(1);
      await fetchDepartments();
    } catch (err) {
      const message = getThrownErrorMessage(err, "فشل إضافة القسم");
      setError(message);
      throw { message };
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await deleteDepartment(id);
      setSelectedDepartment(null);
      await fetchDepartments();
    } catch (err) {
      setError(getThrownErrorMessage(err, "فشل حذف القسم"));
    }
  };

  if (selectedDepartment) {
    return (
      <DepartmentDetailView
        department={selectedDepartment}
        allDepartments={departments}
        onBack={() => setSelectedDepartment(null)}
        onDelete={handleDeleteDepartment}
        onUpdate={(updated) => {
          setDepartments((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item)),
          );
          setSelectedDepartment(updated);
        }}
      />
    );
  }

  return (
    <>
      <main className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <DepartmentPageHeader
          totalCount={totalCount}
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setCurrentPage(1);
          }}
          onAddClick={() => setIsAddModalOpen(true)}
        />

        {loading ? (
          <DepartmentGridSkeleton />
        ) : (
          <DepartmentGrid
            departments={filteredDepartments}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onDepartmentClick={setSelectedDepartment}
          />
        )}
      </main>

      <AddDepartmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddDepartment}
      />
    </>
  );
}
