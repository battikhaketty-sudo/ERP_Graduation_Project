import { Loader, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { DetailBackButton } from "../ui/DetailBackButton";
import type { Employee } from "../../types/employee";
import { getEmployeeById, updateEmployee } from "../../services/employeeApi";
import { getContractTypes, getDepartments } from "../../services/hrApi";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import {
  EMPLOYEE_TABS_CLASS,
  EmployeeField,
  inputClass,
  readOnlyClass,
} from "./employee-ui";

type EmployeeDetailViewProps = {
  employee: Employee;
  onBack: () => void;
  onDelete: (employee: Employee) => void;
  onUpdate: (employee: Employee) => void;
};

type TabType = "work" | "citizenship" | "personal";

const TABS: Array<{ value: TabType; label: string }> = [
  { value: "work", label: "معلومات العمل" },
  { value: "citizenship", label: "معلومات المواطنة" },
  { value: "personal", label: "معلومات شخصية" },
];

export function EmployeeDetailView({
  employee,
  onBack,
  onDelete,
  onUpdate,
}: EmployeeDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<Employee>(employee);
  const [departmentOptions, setDepartmentOptions] = useState<
    Array<{ id: string; name: string; managerId: string; managerName?: string }>
  >([]);
  const [contractTypeOptions, setContractTypeOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([
      getEmployeeById(employee.id),
      getDepartments({ page: 1, limit: 100 }),
      getContractTypes(1, 100),
    ])
      .then(([detail, departmentsResult, contractTypes]) => {
        setEditData(detail);
        setDepartmentOptions(
          departmentsResult.records.map((department) => ({
            id: department.id,
            name: department.name,
            managerId: department.managerId,
            managerName: department.managerName,
          })),
        );
        setContractTypeOptions(
          contractTypes.map((contractType) => ({
            id: contractType.id,
            name: contractType.name,
          })),
        );
      })
      .catch((err) => {
        setEditData(employee);
        setError(getThrownErrorMessage(err, "تعذر تحميل تفاصيل الموظف"));
      })
      .finally(() => setLoading(false));
  }, [employee.id]);

  const handleChange = (field: keyof Employee, value: string) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const updated = await updateEmployee(editData.id, editData);
      setEditData(updated);
      onUpdate(updated);
    } catch (err) {
      setError(getThrownErrorMessage(err, "فشل حفظ التعديلات"));
    } finally {
      setSaving(false);
    }
  };

  const selectedDepartment = departmentOptions.find(
    (department) => department.id === editData.departmentId,
  );

  return (
    <main
      className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6"
      dir="rtl"
    >
      <DetailBackButton
        label="العودة إلى قائمة الموظفين"
        onClick={onBack}
      />

      <div className="mb-5">
        <h1 className="text-xl font-bold text-hr-primary sm:text-[22px]">
          الموظفين <span className="text-hr-muted">›</span> تفاصيل الموظف
        </h1>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="flex items-center gap-2 border-b border-hr-border px-5 py-4">
          <UserRound className="size-5 text-hr-primary" />
          <h2 className="text-lg font-bold text-hr-text">معلومات الموظف</h2>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="px-5 pt-4">
          <div className={EMPLOYEE_TABS_CLASS.bar}>
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={EMPLOYEE_TABS_CLASS.tab(activeTab === tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-hr-muted">
            <Loader className="size-5 animate-spin" />
            جاري تحميل البيانات...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              {activeTab === "personal" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <EmployeeField label="اسم الموظف الكامل">
                    <input
                      value={editData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label="تاريخ الميلاد">
                    <input
                      type="date"
                      value={editData.birthDate || ""}
                      onChange={(e) =>
                        handleChange("birthDate", e.target.value)
                      }
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label="الجنس">
                    <select
                      value={editData.gender || ""}
                      onChange={(e) => handleChange("gender", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">اختر</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </EmployeeField>
                  <EmployeeField label="البريد الإلكتروني">
                    <input
                      value={editData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label="كلمة المرور">
                    <input
                      value={editData.password || "********"}
                      readOnly
                      className={readOnlyClass}
                    />
                  </EmployeeField>
                  <EmployeeField label="رقم الهاتف">
                    <input
                      value={editData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                </div>
              )}

              {activeTab === "work" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <EmployeeField label="القسم">
                    <select
                      value={editData.departmentId || ""}
                      onChange={(e) => {
                        const department = departmentOptions.find(
                          (item) => item.id === e.target.value,
                        );
                        setEditData((prev) => ({
                          ...prev,
                          departmentId: e.target.value,
                          department: department?.name,
                          managerId: department?.managerId,
                          managerName: department?.managerName,
                        }));
                      }}
                      className={inputClass}
                    >
                      <option value="">اختر القسم</option>
                      {departmentOptions.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </EmployeeField>
                  <EmployeeField label="المدير">
                    <input
                      value={
                        selectedDepartment?.managerName ||
                        editData.managerName ||
                        "-"
                      }
                      readOnly
                      className={readOnlyClass}
                    />
                  </EmployeeField>
                  <EmployeeField label="نوع العقد">
                    <select
                      value={editData.contractTypeId || ""}
                      onChange={(e) => {
                        const contractType = contractTypeOptions.find(
                          (item) => item.id === e.target.value,
                        );
                        setEditData((prev) => ({
                          ...prev,
                          contractTypeId: e.target.value,
                          contractTypeName: contractType?.name,
                        }));
                      }}
                      className={inputClass}
                    >
                      <option value="">اختر نوع العقد</option>
                      {contractTypeOptions.map((contractType) => (
                        <option key={contractType.id} value={contractType.id}>
                          {contractType.name}
                        </option>
                      ))}
                    </select>
                  </EmployeeField>
                  <EmployeeField label="رقم موبايل العمل">
                    <input
                      value={editData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label="الراتب">
                    <input
                      type="number"
                      value={editData.salary ?? ""}
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          salary: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        }))
                      }
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label="مدة العقد">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={editData.joiningDate || ""}
                        onChange={(e) =>
                          handleChange("joiningDate", e.target.value)
                        }
                        className={inputClass}
                      />
                      <input
                        type="date"
                        value={editData.contractEndDate || ""}
                        onChange={(e) =>
                          handleChange("contractEndDate", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </EmployeeField>
                </div>
              )}

              {activeTab === "citizenship" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <EmployeeField label="الجنسية">
                    <input
                      value={editData.nationality || ""}
                      onChange={(e) =>
                        handleChange("nationality", e.target.value)
                      }
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label="رقم الهوية">
                    <input
                      value={editData.idNumber || ""}
                      onChange={(e) => handleChange("idNumber", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center">
              <p className="mb-3 self-start text-sm font-medium text-hr-text">
                صورة الموظف
              </p>
              <img
                src={editData.avatar}
                alt={editData.name}
                className="h-[180px] w-[170px] rounded-2xl border border-hr-border object-cover"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-hr-border bg-[#FAFCFE] px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-hr-primary px-6 text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
          >
            {saving && <Loader className="size-4 animate-spin" />}
            حفظ التعديلات
          </button>
          <button
            type="button"
            onClick={() => onDelete(editData)}
            className="h-11 min-w-[120px] rounded-xl bg-red-500 px-6 text-sm font-bold text-white transition hover:bg-red-600"
          >
            حذف
          </button>
        </div>
      </section>
    </main>
  );
}
