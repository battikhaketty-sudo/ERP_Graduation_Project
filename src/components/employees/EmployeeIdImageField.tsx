import { useState } from "react";
import { useTranslation } from "../../i18n";
import { readImageFile, revokeImagePreview } from "../../utils/readImageFile";
import { ImageFileButton } from "../ui/ImageFileButton";
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const result = await readImageFile(file);
      if (!result.ok) {
        setError(
          result.error === "tooLarge"
            ? t("employees.errors.photoTooLarge")
            : t("employees.errors.photoInvalid"),
        );
        return;
      }

      revokeImagePreview(value);
      onChange(result.dataUrl);
    } finally {
      setLoading(false);
    }
  };

  return (
    <EmployeeField label={label} error={error ?? undefined}>
      <div className="flex flex-col items-center gap-3">
        {value ? (
          <img
            src={value}
            alt={label}
            className="h-36 w-full max-w-[240px] rounded-2xl border border-hr-border object-cover"
          />
        ) : (
          <div className="flex h-36 w-full max-w-[240px] items-center justify-center rounded-2xl border border-dashed border-hr-border bg-hr-hover text-sm text-hr-muted">
            {loading ? t("common.loading") : t("employees.detail.idImageEmpty")}
          </div>
        )}
        <ImageFileButton
          label={
            loading
              ? t("common.loading")
              : value
                ? t("employees.detail.changeIdImage")
                : t("employees.detail.uploadIdImage")
          }
          disabled={loading}
          onFile={(file) => {
            void handleFile(file);
          }}
        />
      </div>
    </EmployeeField>
  );
}
