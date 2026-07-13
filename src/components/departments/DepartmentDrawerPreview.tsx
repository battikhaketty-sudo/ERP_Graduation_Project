import { ExternalLink, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { getDepartmentById, type Department } from "../../services/hrApi";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { useTranslation } from "../../i18n";
import { alertErrorClass, subtlePanelClass } from "../ui/formStyles";

type DepartmentDrawerPreviewProps = {
  department: Department;
  onOpenFull: () => void;
};

export function DepartmentDrawerPreview({
  department,
  onOpenFull,
}: DepartmentDrawerPreviewProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<Department>(department);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getDepartmentById(department.id)
      .then(setDetail)
      .catch((err) => {
        setDetail(department);
        setError(getThrownErrorMessage(err, t("employees.errors.loadPreview")));
      })
      .finally(() => setLoading(false));
  }, [department, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-hr-muted">
        <Loader className="size-5 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <p className={alertErrorClass}>
          {error}
        </p>
      )}

      <div className={subtlePanelClass}>
        <h3 className="text-lg font-bold text-hr-text">{detail.name}</h3>
        {detail.description && (
          <p className="mt-2 text-sm text-hr-muted">{detail.description}</p>
        )}
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-hr-muted">{t("departments.drawer.manager")}</dt>
          <dd className="font-medium text-hr-text">{detail.managerName || t("common.dash")}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-hr-muted">{t("departments.drawer.parent")}</dt>
          <dd className="font-medium text-hr-text">{detail.parentName || t("common.dash")}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onOpenFull}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover"
      >
        <ExternalLink className="size-4" />
        {t("common.openFullDetails")}
      </button>
    </div>
  );
}
