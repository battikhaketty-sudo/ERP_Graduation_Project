import { useEffect, useMemo, useState } from "react";
import { useUrlQueryNavigation } from "../hooks/useUrlQueryNavigation";
import { AddDepartmentModal } from "../components/departments/AddDepartmentModal";
import { DepartmentDetailView } from "../components/departments/DepartmentDetailView";
import { DepartmentDrawerPreview } from "../components/departments/DepartmentDrawerPreview";
import { DepartmentGrid } from "../components/departments/DepartmentGrid";
import { DepartmentGridSkeleton } from "../components/departments/DepartmentGridSkeleton";
import { DepartmentPageHeader } from "../components/departments/DepartmentPageHeader";
import { DetailDrawer } from "../components/ui/DetailDrawer";
import { alertErrorClass } from "../components/ui/formStyles";
import { useRegisterCommandActions } from "../context/CommandBarContext";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "../i18n";
import {
  addDepartment,
  deleteDepartment,
  getDepartmentById,
  getDepartments,
  type Department,
} from "../services/hrApi";
import { getThrownErrorMessage } from "../utils/apiResponse";
import { exportToCsv } from "../utils/exportCsv";

const PAGE_SIZE = 9;

export function DepartmentsPage() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const {
    value: departmentId,
    pushValue: openDepartmentInUrl,
    removeValue: clearDepartmentFromUrl,
    goBack: goBackToDepartmentList,
  } = useUrlQueryNavigation({ param: "id" });

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [drawerDepartment, setDrawerDepartment] = useState<Department | null>(null);
  const [fullPageDepartment, setFullPageDepartment] = useState<Department | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const commandActions = useMemo(
    () => [
      {
        id: "departments-add",
        label: t("pages.departments.addDepartment"),
        keywords: ["قسم", "department", "add"],
        group: "actions" as const,
        onSelect: () => setIsAddModalOpen(true),
      },
    ],
    [t],
  );
  useRegisterCommandActions(commandActions);

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
      setError(getThrownErrorMessage(err, t("departments.errors.loadList")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        fetchDepartments();
      },
      search ? 300 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [currentPage, search]);

  useEffect(() => {
    if (!departmentId) {
      setFullPageDepartment(null);
      return;
    }

    const fromList = departments.find((department) => department.id === departmentId);
    if (fromList) {
      setFullPageDepartment(fromList);
      return;
    }

    let cancelled = false;

    const loadDepartment = async () => {
      try {
        const department = await getDepartmentById(departmentId);
        if (!cancelled) {
          setFullPageDepartment(department);
        }
      } catch {
        if (!cancelled) {
          setFullPageDepartment(null);
        }
      }
    };

    void loadDepartment();

    return () => {
      cancelled = true;
    };
  }, [departmentId, departments]);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return departments;
    return departments.filter((department) =>
      department.name.toLowerCase().includes(query),
    );
  }, [departments, search]);

  const handleExport = () => {
    exportToCsv(
      `departments-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        t("departments.export.headers.name"),
        t("departments.export.headers.manager"),
        t("departments.export.headers.parent"),
      ],
      filteredDepartments.map((department) => [
        department.name,
        department.managerName ?? "",
        department.parentName ?? "",
      ]),
    );
    showToast(t("departments.toasts.exportSuccess"), "success");
  };

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
      showToast(t("departments.toasts.addSuccess"), "success");
    } catch (err) {
      const message = getThrownErrorMessage(err, t("departments.errors.add"));
      setError(message);
      showToast(message, "error");
      throw { message };
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    try {
      await deleteDepartment(id);
      setFullPageDepartment(null);
      clearDepartmentFromUrl();
      setDrawerDepartment(null);
      await fetchDepartments();
      showToast(t("departments.toasts.deleteSuccess"), "success");
    } catch (err) {
      const message = getThrownErrorMessage(err, t("departments.errors.delete"));
      showToast(message, "error");
      throw err;
    }
  };

  if (fullPageDepartment) {
    return (
      <DepartmentDetailView
        department={fullPageDepartment}
        allDepartments={departments}
        onBack={goBackToDepartmentList}
        onDelete={handleDeleteDepartment}
        onUpdate={(updated) => {
          setDepartments((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item)),
          );
          setFullPageDepartment(updated);
          showToast(t("departments.toasts.saveSuccess"), "success");
        }}
      />
    );
  }

  return (
    <>
      <main className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6">
        {error && (
          <div className={`mb-4 ${alertErrorClass}`}>
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
          onExport={handleExport}
        />

        {loading ? (
          <DepartmentGridSkeleton />
        ) : (
          <DepartmentGrid
            departments={filteredDepartments}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onDepartmentClick={setDrawerDepartment}
            onDepartmentEdit={(department) => openDepartmentInUrl(department.id)}
            onAddClick={() => setIsAddModalOpen(true)}
          />
        )}
      </main>

      <DetailDrawer
        open={Boolean(drawerDepartment)}
        title={drawerDepartment?.name ?? t("departments.drawer.defaultTitle")}
        subtitle={t("departments.drawer.subtitle")}
        onClose={() => setDrawerDepartment(null)}
      >
        {drawerDepartment && (
          <DepartmentDrawerPreview
            department={drawerDepartment}
            onOpenFull={() => {
              openDepartmentInUrl(drawerDepartment.id);
              setDrawerDepartment(null);
            }}
          />
        )}
      </DetailDrawer>

      <AddDepartmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddDepartment}
      />
    </>
  );
}
