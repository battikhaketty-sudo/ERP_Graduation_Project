import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import { usePreferences } from "../../context/PreferencesContext";
import { useReferenceOptions } from "../../hooks/useReferenceOptions";
import { useModalAutoFocus } from "../../hooks/useModalAutoFocus";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { useTranslation } from "../../i18n";
import type { DepartmentFormPayload } from "../../types/department";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import {
  afterValidationPaint,
  focusAndScrollToFirstError,
} from "../../utils/formUx";
import { mapNamedOptions } from "../../utils/selectOptions";
import { SearchableSelect } from "../ui/SearchableSelect";
import {
  alertErrorClass,
  alertSuccessClass,
  cancelBtnLgClass,
  modalBodyClass,
  modalFooterClass,
  ModalCloseButton,
} from "../ui/modalStyles";
import { DepartmentField, inputClass } from "./department-ui";

export type { DepartmentFormPayload };

type AddDepartmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DepartmentFormPayload) => Promise<void>;
};

export function AddDepartmentModal({
  isOpen,
  onClose,
  onSubmit,
}: AddDepartmentModalProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);
  useModalDismiss(onClose, isOpen && !isSubmitting);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstFieldRef = useModalAutoFocus<HTMLInputElement>(isOpen);

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
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      nextErrors.name = t("departments.modal.errors.nameRequired");
    }
    if (!formData.managerId) {
      nextErrors.managerId = t("departments.modal.errors.managerRequired");
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      afterValidationPaint(() => focusAndScrollToFirstError());
      return false;
    }
    return true;
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
      setSubmitError(getThrownErrorMessage(error, t("departments.modal.errors.addFailed")));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="hr-modal relative max-w-3xl" dir={dir}>
        <ModalCloseButton onClick={onClose} disabled={isSubmitting} />
        <div className="border-b border-hr-border px-6 py-5 pe-12 text-center">
          <h2 className="text-2xl font-bold text-hr-primary">{t("departments.modal.title")}</h2>
        </div>

        {submitSuccess && (
          <div className={`mx-6 mt-4 flex items-center gap-3 ${alertSuccessClass}`}>
            <CheckCircle className="size-5 shrink-0" />
            <span>{t("departments.toasts.addSuccess")}</span>
          </div>
        )}

        {submitError && (
          <div className={`mx-6 mt-4 flex items-center gap-3 ${alertErrorClass}`}>
            <AlertCircle className="size-5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={modalBodyClass}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DepartmentField
              label={t("departments.modal.fields.name")}
              required
              error={errors.name}
              htmlFor="department-name"
            >
              <input
                id="department-name"
                ref={firstFieldRef}
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={inputClass}
                placeholder={t("departments.modal.placeholders.name")}
              />
            </DepartmentField>

            <DepartmentField
              label={t("departments.modal.fields.parent")}
              hint={t("departments.modal.fields.parentHint")}
            >
              <SearchableSelect
                value={formData.parentId}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, parentId: value }));
                }}
                options={mapNamedOptions(departmentOptions)}
                placeholder={t("departments.modal.placeholders.noParent")}
                loading={optionsLoading}
              />
            </DepartmentField>

            <DepartmentField
              label={t("departments.modal.fields.manager")}
              required
              error={errors.managerId}
              hint={t("departments.modal.fields.managerHint")}
            >
              <SearchableSelect
                value={formData.managerId}
                onChange={(value) => {
                  setFormData((prev) => ({ ...prev, managerId: value }));
                  if (errors.managerId) {
                    setErrors((prev) => ({ ...prev, managerId: "" }));
                  }
                }}
                options={mapNamedOptions(employeeOptions, {
                  description: (employee) => employee.id,
                })}
                placeholder={t("departments.modal.placeholders.selectManager")}
                loading={optionsLoading}
                hasError={Boolean(errors.managerId)}
              />
            </DepartmentField>

            <div className="sm:col-span-2">
              <DepartmentField label={t("departments.modal.fields.description")}>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className={inputClass + " h-auto py-3"}
                  placeholder={t("departments.modal.placeholders.description")}
                />
              </DepartmentField>
            </div>
          </div>
        </form>

        <div className={modalFooterClass}>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
          >
            {isSubmitting && <Loader className="size-4 animate-spin" />}
            {isSubmitting ? t("departments.modal.submitting") : t("departments.modal.submit")}
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
