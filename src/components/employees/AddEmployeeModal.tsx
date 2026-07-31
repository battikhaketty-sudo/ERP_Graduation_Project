import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader,
  Upload,
} from "lucide-react";
import { DEFAULT_EMPLOYEE_PASSWORD } from "../../constants/defaults";
import { usePreferences } from "../../context/PreferencesContext";
import { useModalAutoFocus } from "../../hooks/useModalAutoFocus";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import { useTranslation } from "../../i18n";
import type { Employee, WorkRole } from "../../types/employee";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import {
  isValidDecimal,
  isValidEmail,
  isValidPhone,
  sanitizeEmployeeField,
} from "../../utils/inputConstraints";
import {
  getBirthDateIssue,
  normalizeBirthDateValue,
} from "../../utils/employeeDates";
import {
  afterValidationPaint,
  focusAndScrollToFirstError,
} from "../../utils/formUx";
import { mapNamedOptions } from "../../utils/selectOptions";
import { useSkillCatalog } from "../../hooks/useSkillCatalog";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { SearchableSelect } from "../ui/SearchableSelect";
import { PasswordInput } from "../ui/PasswordInput";
import { ManualDateInput } from "../ui/ManualDateInput";
import { EmployeeResumeSkillsEditor } from "./EmployeeResumeSkillsEditor";
import {
  emptyEmployeeSkillRow,
  isEmployeeSkillRowComplete,
  toResumeSkillPayload,
  type EmployeeSkillRow,
} from "./employeeSkills";
import {
  alertErrorClass,
  alertSuccessClass,
  cancelBtnLgClass,
  dashedZoneClass,
  modalBodyClass,
  modalFooterClass,
  ModalCloseButton,
} from "../ui/modalStyles";
import {
  EMPLOYEE_TABS_CLASS,
  EmployeeField,
  StepBadge,
  inputClass,
  readOnlyClass,
} from "./employee-ui";

type AddEmployeeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, "id">) => Promise<void>;
};

type TabType = "personal" | "work" | "resume" | "payroll";

const WORK_ROLES: WorkRole[] = ["Front_end", "Back_end", "UI_UX", "Test"];

export function AddEmployeeModal({
  isOpen,
  onClose,
  onSubmit,
}: AddEmployeeModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const tabs = useMemo<Array<{ value: TabType; label: string }>>(
    () => [
      { value: "personal", label: t("employees.modal.tabs.personal") },
      { value: "work", label: t("employees.modal.tabs.work") },
      { value: "resume", label: t("employees.modal.tabs.resume") },
      { value: "payroll", label: t("employees.modal.tabs.payroll") },
    ],
    [t],
  );
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useModalDismiss(onClose, isOpen && !isSubmitting);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const firstFieldRef = useModalAutoFocus<HTMLInputElement>(isOpen);

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

  const {
    skillGroups,
    loading: skillsLoading,
    error: skillsError,
  } = useSkillCatalog(isOpen);

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
    wage: "",
    contractTypeId: "",
    idNumber: "",
    skills: [emptyEmployeeSkillRow()] as EmployeeSkillRow[],
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
    if (name === "birthDate") {
      const normalized = normalizeBirthDateValue(value) || value;
      setFormData((prev) => ({ ...prev, birthDate: normalized }));
      const issue = getBirthDateIssue(normalized);
      setErrors((prev) => ({
        ...prev,
        birthDate:
          issue === "invalid"
            ? t("employees.errors.birthDateInvalid")
            : issue === "future"
              ? t("employees.errors.birthDateFuture")
              : issue === "tooYoung"
                ? t("employees.errors.birthDateTooYoung")
                : issue === "tooOld"
                  ? t("employees.errors.birthDateTooOld")
                  : "",
      }));
      return;
    }
    const sanitized = sanitizeEmployeeField(name, value);
    setFormData((prev) => ({ ...prev, [name]: sanitized }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        personalImage: t("employees.errors.photoInvalid"),
      }));
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        personalImage: t("employees.errors.photoTooLarge"),
      }));
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({
        ...prev,
        personalImage: (event.target?.result as string) || "",
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.personalImage;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      nextErrors.fullName = t("employees.errors.fullNameRequired");
    }
    if (!formData.email.trim()) {
      nextErrors.email = t("employees.errors.emailRequired");
    } else if (!isValidEmail(formData.email)) {
      nextErrors.email = t("employees.errors.emailInvalid");
    }
    if (!formData.phone.trim()) {
      nextErrors.phone = t("employees.errors.phoneRequired");
    } else if (!isValidPhone(formData.phone)) {
      nextErrors.phone = t("employees.errors.phoneInvalid");
    }
    if (formData.salary && !isValidDecimal(formData.salary)) {
      nextErrors.salary = t("employees.errors.salaryInvalid");
    }
    if (formData.wage && !isValidDecimal(formData.wage)) {
      nextErrors.wage = t("employees.errors.wageInvalid");
    }
    if (formData.idNumber && !/^\d+$/.test(formData.idNumber)) {
      nextErrors.idNumber = t("employees.errors.idNumberInvalid");
    }
    if (!formData.departmentId) {
      nextErrors.departmentId = t("employees.errors.departmentRequired");
    }
    if (!formData.contractTypeId) {
      nextErrors.contractTypeId = t("employees.errors.contractTypeRequired");
    }

    const birthIssue = getBirthDateIssue(formData.birthDate);
    if (birthIssue === "invalid") {
      nextErrors.birthDate = t("employees.errors.birthDateInvalid");
    } else if (birthIssue === "future") {
      nextErrors.birthDate = t("employees.errors.birthDateFuture");
    } else if (birthIssue === "tooYoung") {
      nextErrors.birthDate = t("employees.errors.birthDateTooYoung");
    } else if (birthIssue === "tooOld") {
      nextErrors.birthDate = t("employees.errors.birthDateTooOld");
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      if (
        nextErrors.fullName ||
        nextErrors.email ||
        nextErrors.phone ||
        nextErrors.birthDate
      ) {
        setActiveTab("personal");
      } else if (nextErrors.departmentId) {
        setActiveTab("work");
      } else if (nextErrors.contractTypeId) {
        setActiveTab("payroll");
      }
      afterValidationPaint(() => focusAndScrollToFirstError());
      return false;
    }

    return true;
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
        wage: formData.wage ? Number(formData.wage) : undefined,
        idNumber: formData.idNumber,
        resumeSkills: formData.skills
          .filter(isEmployeeSkillRowComplete)
          .filter(
            (row, index, rows) =>
              rows.findIndex(
                (entry) =>
                  entry.typeId === row.typeId &&
                  entry.skillId === row.skillId &&
                  entry.levelId === row.levelId,
              ) === index,
          )
          .map(toResumeSkillPayload),
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        onClose();
      }, 1200);
    } catch (error) {
      setSubmitError(getThrownErrorMessage(error, t("employees.errors.add")));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedDepartment = departmentOptions.find(
    (department) => department.id === formData.departmentId,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="hr-modal relative max-w-4xl" dir={dir}>
        <ModalCloseButton onClick={onClose} disabled={isSubmitting} />
        <div className="border-b border-hr-border px-6 py-5 pe-12 text-center">
          <h2 className="text-2xl font-bold text-hr-primary">{t("employees.modal.title")}</h2>
        </div>

        {submitSuccess && (
          <div className={`mx-6 mt-4 flex items-center gap-3 ${alertSuccessClass}`}>
            <CheckCircle className="size-5 shrink-0" />
            <span>{t("employees.toasts.addSuccess")}</span>
          </div>
        )}

        {submitError && (
          <div className={`mx-6 mt-4 flex items-center gap-3 ${alertErrorClass}`}>
            <AlertCircle className="size-5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className={EMPLOYEE_TABS_CLASS.bar}>
          {tabs.map((tab) => (
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
          className={modalBodyClass}
        >
          {activeTab === "personal" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-hr-text">
                <StepBadge step={1} />
                <h3 className="font-bold">{t("employees.modal.tabs.personal")}</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EmployeeField
                  label={t("employees.modal.fields.fullName")}
                  required
                  error={errors.fullName}
                  htmlFor="employee-fullName"
                >
                  <input
                    id="employee-fullName"
                    ref={firstFieldRef}
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={t("employees.modal.placeholders.fullName")}
                    autoComplete="name"
                  />
                </EmployeeField>

                <EmployeeField
                  label={t("employees.modal.fields.birthDate")}
                  error={errors.birthDate}
                >
                  <ManualDateInput
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={(birthDate) => {
                      setFormData((prev) => ({ ...prev, birthDate }));
                      const issue = getBirthDateIssue(birthDate);
                      setErrors((prev) => ({
                        ...prev,
                        birthDate:
                          issue === "invalid"
                            ? t("employees.errors.birthDateInvalid")
                            : issue === "future"
                              ? t("employees.errors.birthDateFuture")
                              : issue === "tooYoung"
                                ? t("employees.errors.birthDateTooYoung")
                                : issue === "tooOld"
                                  ? t("employees.errors.birthDateTooOld")
                                  : "",
                      }));
                    }}
                    aria-invalid={Boolean(errors.birthDate)}
                  />
                </EmployeeField>

                <EmployeeField
                  label={t("employees.modal.fields.email")}
                  required
                  error={errors.email}
                  htmlFor="employee-email"
                >
                  <input
                    id="employee-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                </EmployeeField>

                <EmployeeField
                  label={t("employees.modal.fields.phone")}
                  required
                  error={errors.phone}
                  htmlFor="employee-phone"
                >
                  <input
                    id="employee-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="05xxxxxxxx"
                  />
                </EmployeeField>

                <EmployeeField label={t("employees.modal.fields.gender")}>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">{t("common.select")}</option>
                    <option value="male">{t("common.male")}</option>
                    <option value="female">{t("common.female")}</option>
                  </select>
                </EmployeeField>

                <EmployeeField label={t("employees.modal.fields.nationality")}>
                  <input
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>

                <EmployeeField label={t("employees.modal.fields.password")}>
                  <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>

                <EmployeeField
                  label={t("employees.modal.fields.idNumber")}
                  error={errors.idNumber}
                >
                  <input
                    name="idNumber"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    value={formData.idNumber}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>
              </div>

              <EmployeeField
                label={t("employees.modal.fields.photo")}
                error={errors.personalImage}
              >
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
                  className={`flex w-full max-w-[280px] flex-col items-center justify-center rounded-2xl px-4 py-8 ${dashedZoneClass}`}
                >
                  {formData.personalImage ? (
                    <img
                      src={formData.personalImage}
                      alt={t("common.preview")}
                      className="mb-3 size-24 rounded-xl object-cover"
                    />
                  ) : (
                    <Upload className="mb-2 size-8 text-hr-muted" />
                  )}
                  <span className="text-sm text-hr-muted">
                    {t("employees.modal.uploadPhotoHint")}
                  </span>
                </button>
              </EmployeeField>
            </div>
          )}

          {activeTab === "work" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-hr-text">
                <StepBadge step={2} />
                <h3 className="font-bold">{t("employees.modal.tabs.work")}</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EmployeeField
                  label={t("employees.modal.fields.department")}
                  required
                  error={errors.departmentId}
                  hint={t("employees.modal.fields.departmentHint")}
                >
                  <SearchableSelect
                    value={formData.departmentId}
                    onChange={(value) => {
                      setFormData((prev) => ({ ...prev, departmentId: value }));
                      if (errors.departmentId) {
                        setErrors((prev) => ({ ...prev, departmentId: "" }));
                      }
                    }}
                    options={mapNamedOptions(departmentOptions)}
                    placeholder={t("employees.modal.placeholders.selectDepartment")}
                    loading={optionsLoading}
                    hasError={Boolean(errors.departmentId)}
                  />
                </EmployeeField>

                <EmployeeField label={t("employees.modal.fields.manager")}>
                  <input
                    value={selectedDepartment?.managerName || t("common.dash")}
                    readOnly
                    className={readOnlyClass}
                  />
                </EmployeeField>

                <EmployeeField label={t("employees.modal.fields.workRole")}>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    {WORK_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {t(`badges.workRoles.${role}`)}
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
                <h3 className="font-bold">{t("employees.modal.tabs.resume")}</h3>
              </div>

              <EmployeeResumeSkillsEditor
                skills={formData.skills}
                onChange={(skills) => setFormData((prev) => ({ ...prev, skills }))}
                skillGroups={skillGroups}
                loading={skillsLoading}
                error={skillsError}
              />
            </div>
          )}

          {activeTab === "payroll" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-hr-text">
                <StepBadge step={4} />
                <h3 className="font-bold">{t("employees.modal.tabs.payroll")}</h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <EmployeeField
                  label={t("employees.modal.fields.contractType")}
                  required
                  error={errors.contractTypeId}
                  hint={t("employees.modal.fields.contractTypeHint")}
                >
                  <SearchableSelect
                    value={formData.contractTypeId}
                    onChange={(value) => {
                      setFormData((prev) => ({ ...prev, contractTypeId: value }));
                      if (errors.contractTypeId) {
                        setErrors((prev) => ({ ...prev, contractTypeId: "" }));
                      }
                    }}
                    options={mapNamedOptions(contractTypeOptions)}
                    placeholder={t("employees.modal.placeholders.selectContractType")}
                    loading={optionsLoading}
                    hasError={Boolean(errors.contractTypeId)}
                  />
                </EmployeeField>

                <EmployeeField
                  label={t("employees.modal.fields.salary")}
                  hint={t("employees.modal.fields.salaryHint")}
                  error={errors.salary}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    name="salary"
                    dir="ltr"
                    value={formData.salary}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="5000"
                  />
                </EmployeeField>

                <EmployeeField
                  label={t("employees.detail.fields.wage")}
                  hint={t("employees.detail.fields.wageHint")}
                  error={errors.wage}
                >
                  <input
                    type="text"
                    inputMode="decimal"
                    name="wage"
                    dir="ltr"
                    value={formData.wage}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="500"
                  />
                </EmployeeField>

                <EmployeeField
                  label={t("employees.modal.fields.contractStart")}
                  hint={t("employees.modal.fields.contractStartHint")}
                >
                  <ManualDateInput
                    name="joiningDate"
                    value={formData.joiningDate}
                    onChange={(joiningDate) =>
                      setFormData((prev) => ({ ...prev, joiningDate }))
                    }
                  />
                </EmployeeField>

                <EmployeeField
                  label={t("employees.modal.fields.contractEnd")}
                  hint={t("employees.modal.fields.contractEndHint")}
                >
                  <ManualDateInput
                    name="contractEndDate"
                    value={formData.contractEndDate}
                    onChange={(contractEndDate) =>
                      setFormData((prev) => ({ ...prev, contractEndDate }))
                    }
                  />
                </EmployeeField>
              </div>
            </div>
          )}
        </form>

        <div className={modalFooterClass}>
          <button
            type="submit"
            form="add-employee-form"
            disabled={isSubmitting}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
          >
            {isSubmitting && <Loader className="size-4 animate-spin" />}
            {isSubmitting ? t("employees.modal.submitting") : t("employees.modal.submit")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={cancelBtnLgClass}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
