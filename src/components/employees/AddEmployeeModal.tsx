import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { DEFAULT_EMPLOYEE_PASSWORD } from "../../constants/defaults";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import type { Employee, WorkRole } from "../../types/employee";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import {
  EMPLOYEE_TABS_CLASS,
  EmployeeField,
  StepBadge,
  inputClass,
} from "./employee-ui";

type AddEmployeeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, "id">) => Promise<void>;
};

type TabType = "personal" | "work" | "resume" | "payroll";

const TABS: Array<{ value: TabType; label: string }> = [
  { value: "personal", label: "معلومات شخصية" },
  { value: "work", label: "معلومات العمل" },
  { value: "resume", label: "سيرة ذاتية" },
  { value: "payroll", label: "معلومات كشوف الرواتب" },
];

const WORK_ROLES: Array<{ value: WorkRole; label: string }> = [
  { value: "Front_end", label: "Front_end" },
  { value: "Back_end", label: "Back_end" },
  { value: "UI_UX", label: "UI_UX" },
  { value: "Test", label: "Test" },
];

const emptySkill = { name: "", type: "", level: "" };

export function AddEmployeeModal({
  isOpen,
  onClose,
  onSubmit,
}: AddEmployeeModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    departments: departmentOptions,
    contractTypes: contractTypeOptions,
    loading: optionsLoading,
    error: optionsError,
  } = useReferenceOptions(isOpen, {
    departments: true,
    contractTypes: true,
    employees: false,
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: DEFAULT_EMPLOYEE_PASSWORD,
    birthDate: "",
    gender: "",
    nationality: "",
    personalImage: "",
    departmentId: "",
    role: "Front_end" as WorkRole,
    joiningDate: "",
    contractEndDate: "",
    salary: "",
    contractTypeId: "",
    idNumber: "",
    skills: [emptySkill],
  });

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab("personal");
    setSubmitError(null);
    setSubmitSuccess(false);
    setErrors({});
  }, [isOpen]);

  useEffect(() => {
    if (optionsError) {
      setSubmitError(optionsError);
    }
  }, [optionsError]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({
        ...prev,
        personalImage: (event.target?.result as string) || "",
      }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) nextErrors.fullName = "الاسم الكامل مطلوب";
    if (!formData.email.trim()) nextErrors.email = "البريد الإلكتروني مطلوب";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "بريد إلكتروني غير صحيح";
    }
    if (!formData.phone.trim()) nextErrors.phone = "رقم الهاتف مطلوب";
    if (!formData.departmentId) nextErrors.departmentId = "يرجى اختيار القسم";
    if (!formData.contractTypeId)
      nextErrors.contractTypeId = "يرجى اختيار نوع العقد";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedDepartment = departmentOptions.find(
        (department) => department.id === formData.departmentId,
      );

      await onSubmit({
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
        address: `${formData.nationality || "-"} - ${selectedDepartment?.name || "-"}`,
        avatar: formData.personalImage,
        birthDate: formData.birthDate,
        gender: formData.gender as Employee["gender"],
        nationality: formData.nationality,
        department: selectedDepartment?.name,
        departmentId: formData.departmentId,
        contractTypeId: formData.contractTypeId,
        managerId: selectedDepartment?.managerId,
        managerName: selectedDepartment?.managerName,
        joiningDate: formData.joiningDate,
        contractEndDate: formData.contractEndDate,
        salary: formData.salary ? Number(formData.salary) : undefined,
        wage: formData.salary ? Number(formData.salary) : undefined,
        idNumber: formData.idNumber,
        resumeSkills: formData.skills.filter(
          (skill) =>
            skill.name.trim() || skill.type.trim() || skill.level.trim(),
        ),
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 1200);
    } catch (error) {
      setSubmitError(getThrownErrorMessage(error, "فشل إضافة الموظف"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedDepartment = departmentOptions.find(
    (department) => department.id === formData.departmentId,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-card"
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
          <h2 className="text-2xl font-bold text-[#1B91C4]">إضافة موظف جديد</h2>
        </div>

        {submitSuccess && (
          <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            <CheckCircle className="size-5 shrink-0" />
            <span>تم إضافة الموظف بنجاح</span>
          </div>
        )}

        {submitError && (
          <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <AlertCircle className="size-5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

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

        <form
          id="add-employee-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          {activeTab === "personal" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-hr-text">
                <StepBadge step={1} />
                <h3 className="font-bold">معلومات شخصية</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EmployeeField label="اسم الموظف الكامل" required>
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={inputClass}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.fullName}
                    </p>
                  )}
                </EmployeeField>

                <EmployeeField label="تاريخ الميلاد">
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>

                <EmployeeField label="البريد الإلكتروني" required>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClass}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </EmployeeField>

                <EmployeeField label="رقم الهاتف" required>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputClass}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </EmployeeField>

                <EmployeeField label="الجنس">
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">اختر</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </EmployeeField>

                <EmployeeField label="الجنسية">
                  <input
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>

                <EmployeeField label="كلمة المرور">
                  <input
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>

                <EmployeeField label="رقم الهوية">
                  <input
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>
              </div>

              <EmployeeField label="صورة الموظف">
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
                  className="flex w-full max-w-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-hr-border bg-[#FAFCFE] px-4 py-8 transition hover:border-hr-primary"
                >
                  {formData.personalImage ? (
                    <img
                      src={formData.personalImage}
                      alt="معاينة"
                      className="mb-3 size-24 rounded-xl object-cover"
                    />
                  ) : (
                    <Upload className="mb-2 size-8 text-hr-muted" />
                  )}
                  <span className="text-sm text-hr-muted">
                    انقر لرفع الصورة
                  </span>
                </button>
              </EmployeeField>
            </div>
          )}

          {activeTab === "work" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-hr-text">
                <StepBadge step={2} />
                <h3 className="font-bold">معلومات العمل</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EmployeeField label="اسم القسم الذي يعمل فيه" required>
                  <select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    disabled={optionsLoading}
                    className={inputClass}
                  >
                    <option value="">
                      {optionsLoading ? "جاري التحميل..." : "اختر القسم"}
                    </option>
                    {departmentOptions.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                  {errors.departmentId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.departmentId}
                    </p>
                  )}
                </EmployeeField>

                <EmployeeField label="مدير القسم">
                  <input
                    value={selectedDepartment?.managerName || "-"}
                    readOnly
                    className={`${inputClass} bg-[#FAFCFE]`}
                  />
                </EmployeeField>

                <EmployeeField label="دور العمل">
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    {WORK_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </EmployeeField>
              </div>
            </div>
          )}

          {activeTab === "resume" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-hr-text">
                <StepBadge step={3} />
                <h3 className="font-bold">السيرة الذاتية</h3>
              </div>

              <div className="space-y-3">
                {formData.skills.map((skill, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-hr-border p-4 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <EmployeeField label="اكتب المهارة">
                      <input
                        value={skill.name}
                        onChange={(e) => {
                          const next = [...formData.skills];
                          next[index] = {
                            ...next[index],
                            name: e.target.value,
                          };
                          setFormData((prev) => ({ ...prev, skills: next }));
                        }}
                        className={inputClass}
                      />
                    </EmployeeField>
                    <EmployeeField label="فئة المهارة">
                      <input
                        value={skill.type}
                        onChange={(e) => {
                          const next = [...formData.skills];
                          next[index] = {
                            ...next[index],
                            type: e.target.value,
                          };
                          setFormData((prev) => ({ ...prev, skills: next }));
                        }}
                        className={inputClass}
                      />
                    </EmployeeField>
                    <EmployeeField label="مستوى المهارة">
                      <input
                        value={skill.level}
                        onChange={(e) => {
                          const next = [...formData.skills];
                          next[index] = {
                            ...next[index],
                            level: e.target.value,
                          };
                          setFormData((prev) => ({ ...prev, skills: next }));
                        }}
                        className={inputClass}
                      />
                    </EmployeeField>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            skills: prev.skills.filter((_, i) => i !== index),
                          }))
                        }
                        className="mb-1 text-red-400"
                        aria-label="حذف المهارة"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      skills: [...prev.skills, emptySkill],
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-dashed border-hr-border px-4 py-2 text-sm text-hr-primary"
                >
                  <Plus className="size-4" />
                  إضافة مهارة أخرى
                </button>
              </div>
            </div>
          )}

          {activeTab === "payroll" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-hr-text">
                <StepBadge step={4} />
                <h3 className="font-bold">معلومات كشوف الرواتب</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EmployeeField label="نوع العقد" required>
                  <select
                    name="contractTypeId"
                    value={formData.contractTypeId}
                    onChange={handleChange}
                    disabled={optionsLoading}
                    className={inputClass}
                  >
                    <option value="">
                      {optionsLoading ? "جاري التحميل..." : "اختر نوع العقد"}
                    </option>
                    {contractTypeOptions.map((contractType) => (
                      <option key={contractType.id} value={contractType.id}>
                        {contractType.name}
                      </option>
                    ))}
                  </select>
                  {errors.contractTypeId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.contractTypeId}
                    </p>
                  )}
                </EmployeeField>

                <EmployeeField label="الراتب">
                  <input
                    type="number"
                    name="salary"
                    value={formData.salary}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>

                <EmployeeField label="تاريخ بدء العقد">
                  <input
                    type="date"
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>

                <EmployeeField label="إلى">
                  <input
                    type="date"
                    name="contractEndDate"
                    value={formData.contractEndDate}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>
              </div>
            </div>
          )}
        </form>

        <div className="flex gap-3 border-t border-hr-border bg-[#FAFCFE] px-6 py-4">
          <button
            type="submit"
            form="add-employee-form"
            disabled={isSubmitting}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
          >
            {isSubmitting && <Loader className="size-4 animate-spin" />}
            {isSubmitting ? "جاري الإضافة..." : "إضافة موظف"}
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
