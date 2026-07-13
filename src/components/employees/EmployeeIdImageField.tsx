import { Upload } from "lucide-react";
import { useTranslation } from "../../i18n";
import { EmployeeField } from "./employee-ui";

type EmployeeIdImageFieldProps = {
  label: string;
  value?: string;
  onChange: (value: string) => void;
};

export function EmployeeIdImageField({
  label,
  value,
  onChange,
}: EmployeeIdImageFieldProps) {
  const { t } = useTranslation();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange((reader.result as string) || "");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <EmployeeField label={label}>
      <div className="flex flex-col items-center gap-3">
        {value ? (
          <img
            src={value}
            alt={label}
            className="h-36 w-full max-w-[240px] rounded-2xl border border-hr-border object-cover"
          />
        ) : (
          <div className="flex h-36 w-full max-w-[240px] items-center justify-center rounded-2xl border border-dashed border-hr-border bg-hr-hover text-sm text-hr-muted">
            {t("employees.detail.idImageEmpty")}
          </div>
        )}
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-hr-border bg-hr-surface px-4 py-2 text-sm font-medium text-hr-text transition hover:border-hr-primary">
          <Upload className="size-4" />
          {value ? t("employees.detail.changeIdImage") : t("employees.detail.uploadIdImage")}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />
        </label>
      </div>
    </EmployeeField>
  );
}
