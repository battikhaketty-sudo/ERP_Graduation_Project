import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { useTranslation } from "../../i18n";
import { getEmployees } from "../../services/employeeApi";
import {
  getDepartmentById,
  updateDepartment,
  type Department,
} from "../../services/hrApi";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import { alertErrorClass, cardSurfaceClass, detailFooterClass, readOnlyClass } from "../ui/formStyles";
import { DetailBackButton } from "../ui/DetailBackButton";
import { EntityLink } from "../ui/EntityLink";
import { employeePath } from "../../constants/entityPaths";
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
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const { confirm } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<Department>(department);
  const [employeeOptions, setEmployeeOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEditData(department);

    const load = async () => {
      const [detailResult, employeesResult] = await Promise.allSettled([
        getDepartmentById(department.id),
        getEmployees(1, 100),
      ]);

      if (cancelled) return;

      if (detailResult.status === "fulfilled") {
        setEditData(detailResult.value);
      }

      const options: Array<{ id: string; name: string }> = [];
      if (employeesResult.status === "fulfilled") {
        options.push(
          ...employeesResult.value.data.map((employee) => ({
            id: employee.id,
            name: employee.name,
          })),
        );
      }

      const currentManagerId = department.managerId?.trim();
      if (
        currentManagerId &&
        !options.some((employee) => employee.id === currentManagerId)
      ) {
        options.unshift({
          id: currentManagerId,
          name: department.managerName?.trim() || currentManagerId,
        });
      }

      setEmployeeOptions(options);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [department]);

  const parentOptions = allDepartments.filter(
    (item) => item.id !== editData.id,
  );

  const handleSave = async () => {
    if (!editData.name.trim()) {
      setError(t("departments.detail.nameRequired"));
      return;
    }
    if (!editData.managerId) {
      setError(t("departments.detail.managerRequired"));
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
      setError(getThrownErrorMessage(err, t("departments.detail.saveError")));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      message: t("departments.detail.deleteConfirm"),
    });
    if (!confirmed) return;

    try {
      await onDelete(editData.id);
    } catch (err) {
      setError(getThrownErrorMessage(err, t("departments.detail.deleteError")));
    }
  };

  return (
    <main
      className="min-w-0 flex-1 bg-hr-bg px-4 py-4 sm:px-6 sm:py-6"
      dir={dir}
    >
      <DetailBackButton label={t("departments.detail.backLabel")} onClick={onBack} />

      <div className="mb-5">
        <h1 className="text-xl font-bold text-hr-primary sm:text-[22px]">
          {t("departments.detail.breadcrumb")}
        </h1>
      </div>

      <section className={`${cardSurfaceClass} p-5 sm:p-6`}>
        {error && (
          <div className={`mb-4 ${alertErrorClass}`}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-hr-muted">
            <Loader className="size-5 animate-spin" />
            {t("common.loading")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DepartmentField label={t("departments.detail.fields.departmentId")}>
                <input
                  value={editData.id}
                  readOnly
                  className={readOnlyClass}
                />
              </DepartmentField>

              <DepartmentField label={t("departments.detail.fields.name")}>
                <input
                  value={editData.name}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={inputClass}
                />
              </DepartmentField>

              <DepartmentField label={t("departments.detail.fields.parent")}>
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
                  <option value="">{t("departments.detail.placeholders.noParent")}</option>
                  {parentOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </DepartmentField>

              <DepartmentField label={t("departments.detail.fields.manager")}>
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
                  <option value="">{t("departments.detail.placeholders.selectManager")}</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
                {editData.managerId ? (
                  <EntityLink
                    to={employeePath(editData.managerId)}
                    className="mt-1 inline-block text-xs"
                  >
                    {t("common.view")}
                  </EntityLink>
                ) : null}
              </DepartmentField>

              <div className="sm:col-span-2">
                <DepartmentField label={t("departments.detail.fields.description")}>
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
        )}
      </section>

      <div className={`${detailFooterClass} mt-5`}>
        <button
          type="button"
          onClick={handleDelete}
          className="h-10 rounded-xl bg-red-500 px-5 text-sm font-bold text-white transition hover:bg-red-600"
        >
          {t("departments.detail.delete")}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="h-10 rounded-xl border border-hr-primary bg-hr-surface px-5 text-sm font-bold text-hr-primary transition hover:bg-hr-hover"
        >
          {t("departments.detail.undo")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-hr-primary px-5 text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
        >
          {saving && <Loader className="size-4 animate-spin" />}
          {t("departments.detail.save")}
        </button>
      </div>
    </main>
  );
}
