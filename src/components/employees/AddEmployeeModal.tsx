import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Loader,
} from "lucide-react";
import { DEFAULT_EMPLOYEE_PASSWORD } from "../../constants/defaults";
import { usePreferences } from "../../context/PreferencesContext";
import { useModalAutoFocus } from "../../hooks/useModalAutoFocus";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import { useTranslation } from "../../i18n";
import type { Employee } from "../../types/employee";
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
import { mapEmployeeOptions, mapNamedOptions } from "../../utils/selectOptions";
import { readImageFile, revokeImagePreview } from "../../utils/readImageFile";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { SearchableSelect } from "../ui/SearchableSelect";
import { PasswordInput } from "../ui/PasswordInput";
import { ManualDateInput } from "../ui/ManualDateInput";
import { ImageFileButton } from "../ui/ImageFileButton";
import {
  alertErrorClass,
  alertSuccessClass,
  cancelBtnClass,
  modalBodyClass,
  modalFooterClass,
  ModalCloseButton,
} from "../ui/modalStyles";
import {
  EMPLOYEE_TABS_CLASS,
  EmployeeField,
  StepBadge,
  inputClass,
} from "./employee-ui";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { EmployeeIdImageField } from "./EmployeeIdImageField";

const emptyAddEmployeeForm = () => ({
  fullName: "",
  email: "",
  phone: "",
  workPhone: "",
  password: DEFAULT_EMPLOYEE_PASSWORD,
  birthDate: "",
  gender: "",
  nationality: "",
  departmentId: "",
  managerId: "",
  workingScheduleId: "",
  joiningDate: "",
  contractEndDate: "",
  salary: "",
  wage: "",
  contractTypeId: "",
  idNumber: "",
  avatar: "",
  idCardFrontImage: "",
  idCardBackImage: "",
});

type AddEmployeeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employee: Omit<Employee, "id">) => Promise<void>;
};

type TabType = "personal" | "work" | "payroll";

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
  const firstFieldRef = useModalAutoFocus<HTMLInputElement>(isOpen);

  const {
    departments: departmentOptions,
    contractTypes: contractTypeOptions,
    employees: employeeOptions,
    workingSchedules: scheduleOptions,
    loading: optionsLoading,
    error: optionsError,
  } = useReferenceOptions(isOpen, {
    departments: true,
    contractTypes: true,
    employees: true,
    workingSchedules: true,
  });

  const [formData, setFormData] = useState(emptyAddEmployeeForm);

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab("personal");
    setSubmitError(null);
    setSubmitSuccess(false);
    setErrors({});
    setFormData((previous) => {
      revokeImagePreview(previous.avatar);
      revokeImagePreview(previous.idCardFrontImage);
      revokeImagePreview(previous.idCardBackImage);
      return emptyAddEmployeeForm();
    });
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
    if (formData.workPhone.trim() && !isValidPhone(formData.workPhone)) {
      nextErrors.workPhone = t("employees.errors.phoneInvalid");
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
      } else if (nextErrors.departmentId || nextErrors.workPhone) {
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

      const selectedManager = employeeOptions.find(
        (item) => item.id === formData.managerId,
      );

      await onSubmit({
        name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        workPhone: formData.workPhone.trim() || formData.phone.trim(),
        password: formData.password,
        address: `${formData.nationality || "-"} - ${selectedDepartment?.name || "-"}`,
        avatar: formData.avatar,
        birthDate: formData.birthDate,
        gender: formData.gender as Employee["gender"],
        nationality: formData.nationality,
        department: selectedDepartment?.name,
        departmentId: formData.departmentId,
        contractTypeId: formData.contractTypeId,
        managerId: formData.managerId,
        managerName: selectedManager?.name,
        workingScheduleId: formData.workingScheduleId,
        workingScheduleName: scheduleOptions.find(
          (schedule) => schedule.id === formData.workingScheduleId,
        )?.name,
        joiningDate: formData.joiningDate,
        contractEndDate: formData.contractEndDate,
        salary: formData.salary ? Number(formData.salary) : undefined,
        wage: formData.wage ? Number(formData.wage) : undefined,
        idNumber: formData.idNumber,
        idCardFrontImage: formData.idCardFrontImage || undefined,
        idCardBackImage: formData.idCardBackImage || undefined,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60">
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
        <div className="hr-modal relative my-4 max-w-4xl" dir={dir}>
        <ModalCloseButton onClick={onClose} disabled={isSubmitting} />
        <div className="shrink-0 border-b border-hr-border px-6 py-5 pe-12 text-center">
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

        <div className={`${EMPLOYEE_TABS_CLASS.bar} shrink-0`}>
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
          className={`${modalBodyClass} min-h-[20rem]`}
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
                  hint={t("employees.detail.fields.emailHint")}
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

                <EmployeeField label={t("employees.modal.fields.password")}>
                  <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </EmployeeField>

                <EmployeeIdImageField
                  label={t("employees.detail.fields.idFrontImage")}
                  value={formData.idCardFrontImage}
                  onChange={(idCardFrontImage) => {
                    setFormData((prev) => {
                      revokeImagePreview(prev.idCardFrontImage);
                      return { ...prev, idCardFrontImage };
                    });
                  }}
                />
                <EmployeeIdImageField
                  label={t("employees.detail.fields.idBackImage")}
                  value={formData.idCardBackImage}
                  onChange={(idCardBackImage) => {
                    setFormData((prev) => {
                      revokeImagePreview(prev.idCardBackImage);
                      return { ...prev, idCardBackImage };
                    });
                  }}
                />
              </div>

              <div className="flex flex-col items-center gap-3 sm:items-start">
                <p className="self-start text-sm font-medium text-hr-text">
                  {t("employees.modal.fields.photo")}
                </p>
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt=""
                    className="h-[180px] w-[170px] rounded-2xl border border-hr-border object-cover"
                  />
                ) : (
                  <EmployeeAvatar
                    src=""
                    name={formData.fullName}
                    alt=""
                    className="h-[180px] w-[170px] rounded-2xl border border-hr-border object-cover text-4xl"
                  />
                )}
                <ImageFileButton
                  label={
                    formData.avatar
                      ? t("employees.detail.changePhoto")
                      : t("employees.modal.uploadPhotoHint")
                  }
                  onFile={(file) => {
                    void (async () => {
                      const result = await readImageFile(file);
                      if (!result.ok) {
                        setErrors((prev) => ({
                          ...prev,
                          photo:
                            result.error === "tooLarge"
                              ? t("employees.errors.photoTooLarge")
                              : t("employees.errors.photoInvalid"),
                        }));
                        return;
                      }
                      setFormData((prev) => {
                        revokeImagePreview(prev.avatar);
                        return { ...prev, avatar: result.dataUrl };
                      });
                      setErrors((prev) => ({ ...prev, photo: "" }));
                    })();
                  }}
                />
                {errors.photo ? (
                  <p className="text-sm text-red-500">{errors.photo}</p>
                ) : null}
              </div>
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

                <EmployeeField
                  label={t("employees.modal.fields.manager")}
                  hint={t("employees.modal.fields.managerHint")}
                >
                  <SearchableSelect
                    value={formData.managerId}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, managerId: value }))
                    }
                    options={mapEmployeeOptions(employeeOptions)}
                    placeholder={t("employees.modal.placeholders.selectManager")}
                    loading={optionsLoading}
                  />
                </EmployeeField>

                <EmployeeField
                  label={t("employees.modal.fields.workSchedule")}
                  hint={t("employees.modal.fields.workScheduleHint")}
                >
                  <SearchableSelect
                    value={formData.workingScheduleId}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        workingScheduleId: value,
                      }))
                    }
                    options={mapNamedOptions(scheduleOptions)}
                    placeholder={t("employees.modal.placeholders.selectWorkSchedule")}
                    loading={optionsLoading}
                  />
                </EmployeeField>

                <EmployeeField
                  label={t("employees.modal.fields.workPhone")}
                  error={errors.workPhone}
                  hint={t("employees.modal.fields.workPhoneHint")}
                  htmlFor="employee-workPhone"
                >
                  <input
                    id="employee-workPhone"
                    name="workPhone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    dir="ltr"
                    value={formData.workPhone}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="05xxxxxxxx"
                  />
                </EmployeeField>
              </div>
            </div>
          )}

          {activeTab === "payroll" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-hr-text">
                <StepBadge step={3} />
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
            className="inline-flex h-11 min-w-[10rem] items-center justify-center gap-2 rounded-xl bg-hr-primary px-6 text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
          >
            {isSubmitting && <Loader className="size-4 animate-spin" />}
            {isSubmitting ? t("employees.modal.submitting") : t("employees.modal.submit")}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`${cancelBtnClass} inline-flex h-11 min-w-[10rem] items-center justify-center`}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
