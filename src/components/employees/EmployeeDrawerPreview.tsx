import { ExternalLink, Loader, Mail, Phone, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { Employee } from "../../types/employee";
import { getEmployeeById } from "../../services/employeeApi";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { useTranslation } from "../../i18n";
import { departmentPath } from "../../constants/entityPaths";
import { alertErrorClass, subtlePanelClass } from "../ui/formStyles";
import { EntityLink } from "../ui/EntityLink";
import { EmployeeAvatar } from "./EmployeeAvatar";

type EmployeeDrawerPreviewProps = {
  employee: Employee;
  onOpenFull: () => void;
  onArchive: (employee: Employee) => void;
  onUnarchive: (employee: Employee) => void;
};

export function EmployeeDrawerPreview({
  employee,
  onOpenFull,
  onArchive,
  onUnarchive,
}: EmployeeDrawerPreviewProps) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<Employee>(employee);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getEmployeeById(employee.id)
      .then((result) => setDetail(result))
      .catch((err) => {
        setDetail(employee);
        setError(getThrownErrorMessage(err, t("employees.errors.loadPreview")));
      })
      .finally(() => setLoading(false));
  }, [employee, t]);

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

      <div className="flex flex-col items-center text-center">
        <EmployeeAvatar
          src={detail.avatar}
          name={detail.name}
          alt=""
          className="mb-3 size-24 rounded-2xl object-cover ring-2 ring-hr-border text-2xl"
        />
        <h3 className="text-lg font-bold text-hr-text">{detail.name}</h3>
      </div>

      <dl className={`space-y-3 ${subtlePanelClass} text-sm`}>
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-hr-muted" />
          <dt className="text-hr-muted">{t("employees.drawer.email")}</dt>
          <dd className="ms-auto font-medium text-hr-text" dir="ltr">
            {detail.email}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="size-4 text-hr-muted" />
          <dt className="text-hr-muted">{t("employees.drawer.phone")}</dt>
          <dd className="ms-auto font-medium text-hr-text" dir="ltr">
            {detail.workPhone || detail.phone}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-hr-muted" />
          <dt className="text-hr-muted">{t("employees.drawer.department")}</dt>
          <dd className="ms-auto font-medium text-hr-text">
            <EntityLink to={departmentPath(detail.departmentId)}>
              {detail.department || t("common.dash")}
            </EntityLink>
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onOpenFull}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-hr-primary text-sm font-bold text-white transition hover:bg-hr-primary-hover"
        >
          <ExternalLink className="size-4" />
          {t("common.openFullDetails")}
        </button>
        {detail.isArchived ? (
          <button
            type="button"
            onClick={() => onUnarchive(detail)}
            className="h-11 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            {t("employees.archive.unarchiveLabel")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onArchive(detail)}
            className="h-11 rounded-xl bg-amber-600 text-sm font-bold text-white transition hover:bg-amber-700"
          >
            {t("employees.archive.archiveLabel")}
          </button>
        )}
      </div>
    </div>
  );
}
