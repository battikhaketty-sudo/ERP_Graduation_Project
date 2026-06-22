import { ImagePlus, Loader, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DetailBackButton } from "../ui/DetailBackButton";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { getEmployees } from "../../services/employeeApi";
import {
  deleteDepartment,
  getDepartmentById,
  updateDepartment,
  type Department,
} from "../../services/hrApi";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { DepartmentField, inputClass } from "./department-ui";

type DepartmentDetailViewProps = {
  department: Department;
  allDepartments: Department[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdate: (department: Department) => void;
};

export function DepartmentDetailView({
  department,
  allDepartments,
  onBack,
  onDelete,
  onUpdate,
}: DepartmentDetailViewProps) {
  const { confirm } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<Department>(department);
  const [employeeOptions, setEmployeeOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.all([getDepartmentById(department.id), getEmployees(1, 100)])
      .then(([detail, employeesResult]) => {
        setEditData(detail);
        setEmployeeOptions(
          employeesResult.data.map((employee) => ({
            id: employee.id,
            name: employee.name,
          })),
        );
      })
      .catch((err) => {
        setEditData(department);
        setError(getThrownErrorMessage(err, "تعذر تحميل تفاصيل القسم"));
      })
      .finally(() => setLoading(false));
  }, [department.id]);

  const parentOptions = allDepartments.filter(
    (item) => item.id !== editData.id,
  );

  const handleSave = async () => {
    if (!editData.name.trim()) {
      setError("يرجى إدخال اسم القسم.");
      return;
    }
    if (!editData.managerId) {
      setError("يرجى اختيار مدير القسم.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateDepartment(editData.id, {
        name: editData.name.trim(),
        managerId: editData.managerId,
        parentId: editData.parentId || undefined,
        description: editData.description?.trim() || undefined,
      });
      if (updated) {
        setEditData(updated);
        onUpdate(updated);
      }
    } catch (err) {
      setError(getThrownErrorMessage(err, "فشل تعديل القسم"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      message: "هل أنت متأكد من حذف هذا القسم؟",
    });
    if (!confirmed) return;

    try {
      await deleteDepartment(editData.id);
      onDelete(editData.id);
    } catch (err) {
      setError(getThrownErrorMessage(err, "فشل حذف القسم"));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview((event.target?.result as string) || "");
    };
    reader.readAsDataURL(file);
  };

  return (
    <main
      className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6"
      dir="rtl"
    >
      <DetailBackButton label="العودة إلى قائمة الأقسام" onClick={onBack} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-hr-primary sm:text-[22px]">
            الأقسام <span className="text-hr-muted">›</span> تفاصيل القسم
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDelete}
            className="h-10 rounded-xl bg-red-500 px-5 text-sm font-bold text-white transition hover:bg-red-600"
          >
            حذف
          </button>
          <button
            type="button"
            onClick={onBack}
            className="h-10 rounded-xl border border-hr-primary bg-white px-5 text-sm font-bold text-hr-primary transition hover:bg-blue-50"
          >
            تراجع
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-hr-primary px-5 text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
          >
            {saving && <Loader className="size-4 animate-spin" />}
            تعديل الفرع
          </button>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-card sm:p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-hr-muted">
            <Loader className="size-5 animate-spin" />
            جاري تحميل البيانات...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DepartmentField label="رقم القسم">
                <input
                  value={editData.id}
                  readOnly
                  className={inputClass + " bg-[#FAFCFE]"}
                />
              </DepartmentField>

              <DepartmentField label="اسم القسم">
                <input
                  value={editData.name}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={inputClass}
                />
              </DepartmentField>

              <DepartmentField label="رمز القسم">
                <input
                  value={editData.name}
                  readOnly
                  className={inputClass + " bg-[#FAFCFE]"}
                />
              </DepartmentField>

              <DepartmentField label="القسم الأب">
                <select
                  value={editData.parentId || ""}
                  onChange={(e) => {
                    const parent = parentOptions.find(
                      (item) => item.id === e.target.value,
                    );
                    setEditData((prev) => ({
                      ...prev,
                      parentId: e.target.value,
                      parentName: parent?.name,
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">بدون قسم أب</option>
                  {parentOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </DepartmentField>

              <DepartmentField label="مدير القسم">
                <select
                  value={editData.managerId || ""}
                  onChange={(e) => {
                    const manager = employeeOptions.find(
                      (item) => item.id === e.target.value,
                    );
                    setEditData((prev) => ({
                      ...prev,
                      managerId: e.target.value,
                      managerName: manager?.name,
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">اختر المدير</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </DepartmentField>

              <div className="sm:col-span-2">
                <DepartmentField label="وصف القسم">
                  <textarea
                    value={editData.description || ""}
                    onChange={(e) =>
                      setEditData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    className={inputClass + " h-auto py-3"}
                  />
                </DepartmentField>
              </div>
            </div>

            <div>
              <DepartmentField label="صورة أساسية">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="overflow-hidden rounded-2xl border border-hr-border">
                  <div className="flex h-[100px] w-full max-w-[280px] items-center justify-center bg-[#FAFCFE]">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="صورة القسم"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="size-8 text-hr-muted" />
                    )}
                  </div>
                  <div className="flex border-t border-hr-border">
                    <button
                      type="button"
                      onClick={() => setImagePreview("")}
                      className="flex flex-1 items-center justify-center gap-1 py-2 text-xs text-red-500"
                    >
                      <Trash2 className="size-3.5" />
                      حذف الصورة
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-1 items-center justify-center gap-1 border-s border-hr-border py-2 text-xs text-hr-primary"
                    >
                      <ImagePlus className="size-3.5" />
                      تعديل صورة
                    </button>
                  </div>
                </div>
              </DepartmentField>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
