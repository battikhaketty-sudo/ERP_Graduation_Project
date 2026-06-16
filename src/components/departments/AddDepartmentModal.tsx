import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle, Loader, Upload, X } from "lucide-react";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import type { DepartmentFormPayload } from "../../types/department";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { DepartmentField, inputClass } from "./department-ui";

export type { DepartmentFormPayload };

type AddDepartmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DepartmentFormPayload) => Promise<void>;
};

export function AddDepartmentModal({ isOpen, onClose, onSubmit }: AddDepartmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    departments: departmentOptions,
    employees: employeeOptions,
    loading: optionsLoading,
    error: optionsError,
  } = useReferenceOptions(isOpen, {
    departments: true,
    contractTypes: false,
    employees: true,
  });

  const [formData, setFormData] = useState({
    name: "",
    parentId: "",
    managerId: "",
    description: "",
    imagePreview: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    setSubmitError(null);
    setSubmitSuccess(false);
    setErrors({});
    setFormData({
      name: "",
      parentId: "",
      managerId: "",
      description: "",
      imagePreview: "",
    });
  }, [isOpen]);

  useEffect(() => {
    if (optionsError) {
      setSubmitError(optionsError);
    }
  }, [optionsError]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({
        ...prev,
        imagePreview: (event.target?.result as string) || "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) nextErrors.name = "اسم القسم مطلوب";
    if (!formData.managerId) nextErrors.managerId = "يرجى اختيار مدير القسم";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        name: formData.name.trim(),
        managerId: formData.managerId,
        parentId: formData.parentId || undefined,
        description: formData.description.trim() || undefined,
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 1200);
    } catch (error) {
      setSubmitError(getThrownErrorMessage(error, "فشل إضافة القسم"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-card"
        dir="rtl"
      >
        <div className="relative border-b border-hr-border px-6 py-5 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute start-4 top-4 rounded-full p-1 text-hr-muted transition hover:bg-gray-100"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
          <h2 className="text-2xl font-bold text-[#1B91C4]">إضافة قسم جديد</h2>
        </div>

        {submitSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            <CheckCircle className="size-5 shrink-0" />
            <span>تم إضافة القسم بنجاح</span>
          </div>
        )}

        {submitError && (
          <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="size-5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DepartmentField label="اسم القسم" required>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={inputClass}
                placeholder="Front_End"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </DepartmentField>

            <DepartmentField label="القسم الأب">
              <select
                name="parentId"
                value={formData.parentId}
                onChange={handleChange}
                disabled={optionsLoading}
                className={inputClass}
              >
                <option value="">بدون قسم أب</option>
                {departmentOptions.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </DepartmentField>

            <DepartmentField label="مدير القسم" required>
              <select
                name="managerId"
                value={formData.managerId}
                onChange={handleChange}
                disabled={optionsLoading}
                className={inputClass}
              >
                <option value="">
                  {optionsLoading ? "جاري التحميل..." : "اختر المدير"}
                </option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              {errors.managerId && (
                <p className="mt-1 text-sm text-red-600">{errors.managerId}</p>
              )}
            </DepartmentField>

            <DepartmentField label="صورة أساسية">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-[100px] w-full max-w-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#B8E4F2] bg-[#FAFCFE] transition hover:border-hr-primary"
              >
                {formData.imagePreview ? (
                  <img
                    src={formData.imagePreview}
                    alt="معاينة"
                    className="h-full w-full rounded-2xl object-cover"
                  />
                ) : (
                  <>
                    <Upload className="mb-1 size-6 text-hr-primary" />
                    <span className="text-xs text-hr-muted">رفع صورة</span>
                  </>
                )}
              </button>
            </DepartmentField>

            <div className="sm:col-span-2">
              <DepartmentField label="وصف القسم">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={inputClass + " h-auto py-3"}
                  placeholder="وصف مختصر عن القسم..."
                />
              </DepartmentField>
            </div>
          </div>
        </form>

        <div className="flex gap-3 border-t border-hr-border bg-[#FAFCFE] px-6 py-4">
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
          >
            {isSubmitting && <Loader className="size-4 animate-spin" />}
            {isSubmitting ? "جاري الإضافة..." : "إضافة القسم"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-11 flex-1 rounded-xl bg-gray-400 text-sm font-bold text-white transition hover:bg-gray-500 disabled:opacity-60"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
