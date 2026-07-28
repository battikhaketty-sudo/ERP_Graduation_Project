import { Loader, Upload, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";
import { DetailBackButton } from "../ui/DetailBackButton";
import type { Employee } from "../../types/employee";
import { getEmployeeById, updateEmployee } from "../../services/employeeApi";
import { getAllRoles } from "../../services/roles";
import { getUserById, updateUserRoles } from "../../services/users";
import { getContractTypes, getDepartments } from "../../services/hrApi";
import type { AppRole } from "../../types/role";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import {
  isValidDecimal,
  isValidEmail,
  isValidPhone,
  sanitizeDecimalInput,
  sanitizeEmployeeField,
} from "../../utils/inputConstraints";
import { mapNamedOptions } from "../../utils/selectOptions";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { SearchableSelect } from "../ui/SearchableSelect";
import { EmployeeIdImageField } from "./EmployeeIdImageField";
import {
  alertErrorClass,
  cardSurfaceClass,
  detailFooterClass,
} from "../ui/formStyles";
import {
  EMPLOYEE_TABS_CLASS,
  EmployeeField,
  inputClass,
  readOnlyClass,
} from "./employee-ui";

type EmployeeDetailViewProps = {
  employee: Employee;
  onBack: () => void;
  onToggleArchive: (employee: Employee) => void;
  onUpdate: (employee: Employee) => void;
};

type TabType = "work" | "citizenship" | "personal" | "resume";

export function EmployeeDetailView({
  employee,
  onBack,
  onToggleArchive,
  onUpdate,
}: EmployeeDetailViewProps) {
  const { t } = useTranslation();
  const { dir } = usePreferences();
  const tabs = useMemo<Array<{ value: TabType; label: string }>>(
    () => [
      { value: "personal", label: t("employees.detail.tabs.personal") },
      { value: "work", label: t("employees.detail.tabs.work") },
      { value: "citizenship", label: t("employees.detail.tabs.citizenship") },
      { value: "resume", label: t("employees.detail.tabs.resume") },
    ],
    [t],
  );
  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<Employee>(employee);
  const [departmentOptions, setDepartmentOptions] = useState<
    Array<{ id: string; name: string; managerId: string; managerName?: string }>
  >([]);
  const [contractTypeOptions, setContractTypeOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [availableRoles, setAvailableRoles] = useState<AppRole[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [fixedRoleIds, setFixedRoleIds] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);

    const userId = employee.userId || employee.id;

    Promise.all([
      getEmployeeById(employee.id),
      getDepartments({ page: 1, limit: 100 }),
      getContractTypes(1, 100),
      getAllRoles().catch(() => [] as AppRole[]),
      getUserById(userId).catch(() => null),
    ])
      .then(([detail, departmentsResult, contractTypes, roles, userAccount]) => {
        setEditData({
          ...detail,
          isArchived: employee.isArchived ?? detail.isArchived,
          userAccount: userAccount ?? undefined,
        });
        setAvailableRoles(roles);
        setSelectedRoleIds(userAccount?.roles.map((role) => role.roleId) ?? []);
        setFixedRoleIds(
          new Set(
            userAccount?.roles.filter((role) => role.isFixed).map((role) => role.roleId) ??
              [],
          ),
        );
        setDepartmentOptions(
          departmentsResult.records.map((department) => ({
            id: department.id,
            name: department.name,
            managerId: department.managerId,
            managerName: department.managerName,
          })),
        );
        setContractTypeOptions(
          contractTypes.map((contractType) => ({
            id: contractType.id,
            name: contractType.name,
          })),
        );
      })
      .catch((err) => {
        setEditData(employee);
        setError(getThrownErrorMessage(err, t("employees.errors.loadDetail")));
      })
      .finally(() => setLoading(false));
  }, [employee.id, employee, t]);

  const handleChange = (field: keyof Employee, value: string) => {
    const sanitized = sanitizeEmployeeField(String(field), value);
    setEditData((prev) => ({ ...prev, [field]: sanitized }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSalaryChange = (value: string) => {
    const sanitized = sanitizeDecimalInput(value);
    setEditData((prev) => ({
      ...prev,
      salary: sanitized ? Number(sanitized) : undefined,
    }));
    if (fieldErrors.salary) {
      setFieldErrors((prev) => ({ ...prev, salary: "" }));
    }
  };

  const handleWageChange = (value: string) => {
    const sanitized = sanitizeDecimalInput(value);
    setEditData((prev) => ({
      ...prev,
      wage: sanitized ? Number(sanitized) : undefined,
    }));
    if (fieldErrors.wage) {
      setFieldErrors((prev) => ({ ...prev, wage: "" }));
    }
  };

  const validateBeforeSave = () => {
    const nextErrors: Record<string, string> = {};

    if (editData.phone?.trim() && !isValidPhone(editData.phone)) {
      nextErrors.phone = t("employees.errors.phoneInvalid");
    }
    if (!isValidDecimal(editData.salary)) {
      nextErrors.salary = t("employees.errors.salaryInvalid");
    }
    if (!isValidDecimal(editData.wage)) {
      nextErrors.wage = t("employees.errors.wageInvalid");
    }
    if (editData.idNumber && !/^\d+$/.test(editData.idNumber)) {
      nextErrors.idNumber = t("employees.errors.idNumberInvalid");
    }
    if (editData.email?.trim() && !isValidEmail(editData.email)) {
      nextErrors.email = t("employees.errors.emailInvalid");
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await updateEmployee(editData.id, editData);
      const userId = updated.userId || updated.id;
      const nextRoleIds = [...new Set([...selectedRoleIds, ...fixedRoleIds])];
      const previousRoleIds = [
        ...new Set([
          ...(editData.userAccount?.roles.map((role) => role.roleId) ?? []),
          ...fixedRoleIds,
        ]),
      ].sort();
      const rolesChanged =
        [...nextRoleIds].sort().join("|") !== previousRoleIds.join("|");

      let userAccount = editData.userAccount;
      let roleWarning: string | null = null;

      if (rolesChanged) {
        try {
          await updateUserRoles(userId, nextRoleIds);
          userAccount = await getUserById(userId);
        } catch (roleErr) {
          roleWarning = getThrownErrorMessage(
            roleErr,
            t("employees.errors.saveRoles"),
          );
        }
      } else {
        try {
          userAccount = (await getUserById(userId)) ?? userAccount;
        } catch {
          // Keep previously loaded account info if refresh is forbidden.
        }
      }

      const merged = { ...updated, userAccount };
      setEditData(merged);
      if (userAccount) {
        setSelectedRoleIds(userAccount.roles.map((role) => role.roleId));
        setFixedRoleIds(
          new Set(
            userAccount.roles.filter((role) => role.isFixed).map((role) => role.roleId),
          ),
        );
      }
      onUpdate(merged);
      if (roleWarning) {
        setError(roleWarning);
      }
    } catch (err) {
      setError(getThrownErrorMessage(err, t("employees.errors.save")));
    } finally {
      setSaving(false);
    }
  };

  const toggleUserRole = (roleId: string) => {
    if (fixedRoleIds.has(roleId)) return;
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  };

  const roleLabel = (roleId: string) =>
    availableRoles.find((role) => role.id === roleId)?.name ?? roleId;

  const selectedDepartment = departmentOptions.find(
    (department) => department.id === editData.departmentId,
  );

  return (
    <main
      className="min-w-0 flex-1 overflow-y-auto bg-hr-bg px-4 py-4 sm:px-6 sm:py-6"
      dir={dir}
    >
      <DetailBackButton
        label={t("employees.detail.backLabel")}
        onClick={onBack}
      />

      <div className="mb-5">
        <h1 className="text-xl font-bold text-hr-primary sm:text-[22px]">
          {t("employees.detail.breadcrumb")}
        </h1>
      </div>

      <section className={cardSurfaceClass}>
        <div className="flex items-center gap-2 border-b border-hr-border px-5 py-4">
          <UserRound className="size-5 text-hr-primary" />
          <h2 className="text-lg font-bold text-hr-text">{t("employees.detail.title")}</h2>
        </div>

        {error && (
          <div className={`mx-5 mt-4 ${alertErrorClass}`}>
            {error}
          </div>
        )}

        <div className="px-5 pt-4">
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
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-16 text-hr-muted">
            <Loader className="size-5 animate-spin" />
            {t("common.loading")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              {activeTab === "personal" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <EmployeeField
                    label={t("employees.detail.fields.userId")}
                    hint={t("employees.detail.fields.userIdHint")}
                  >
                    <div className="flex h-11 items-center rounded-xl border border-hr-border bg-hr-hover px-4">
                      <CopyableIdCell value={editData.userId || editData.employeeId || "-"} />
                    </div>
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.fullName")}>
                    <input
                      value={editData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.birthDate")}>
                    <input
                      type="date"
                      value={editData.birthDate || ""}
                      onChange={(e) =>
                        handleChange("birthDate", e.target.value)
                      }
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.gender")}>
                    <select
                      value={editData.gender || ""}
                      onChange={(e) => handleChange("gender", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">{t("employees.detail.placeholders.select")}</option>
                      <option value="male">{t("common.male")}</option>
                      <option value="female">{t("common.female")}</option>
                    </select>
                  </EmployeeField>
                  {editData.genderName ? (
                    <EmployeeField label={t("employees.table.columns.gender")}>
                      <input
                        value={editData.genderName}
                        readOnly
                        className={readOnlyClass}
                      />
                    </EmployeeField>
                  ) : null}
                  <EmployeeField label={t("employees.detail.fields.email")} error={fieldErrors.email}>
                    <input
                      type="email"
                      inputMode="email"
                      value={editData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.phone")} error={fieldErrors.phone}>
                    <input
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      value={editData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                </div>
              )}

              {activeTab === "work" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <EmployeeField
                    label={t("employees.detail.fields.userId")}
                    hint={t("employees.detail.fields.userIdHint")}
                  >
                    <div className="flex h-11 items-center rounded-xl border border-hr-border bg-hr-hover px-4">
                      <CopyableIdCell value={editData.userId || editData.employeeId || "-"} />
                    </div>
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.department")} hint={t("employees.detail.fields.departmentHint")}>
                    <SearchableSelect
                      value={editData.departmentId || ""}
                      onChange={(value) => {
                        const department = departmentOptions.find(
                          (item) => item.id === value,
                        );
                        setEditData((prev) => ({
                          ...prev,
                          departmentId: value,
                          department: department?.name,
                          managerId: department?.managerId,
                          managerName: department?.managerName,
                        }));
                      }}
                      options={mapNamedOptions(departmentOptions)}
                      placeholder={t("employees.detail.placeholders.selectDepartment")}
                    />
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.manager")}>
                    <input
                      value={
                        selectedDepartment?.managerName ||
                        editData.managerName ||
                        t("common.dash")
                      }
                      readOnly
                      className={readOnlyClass}
                    />
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.contractType")} hint={t("employees.detail.fields.contractTypeHint")}>
                    <SearchableSelect
                      value={editData.contractTypeId || ""}
                      onChange={(value) => {
                        const contractType = contractTypeOptions.find(
                          (item) => item.id === value,
                        );
                        setEditData((prev) => ({
                          ...prev,
                          contractTypeId: value,
                          contractTypeName: contractType?.name,
                        }));
                      }}
                      options={mapNamedOptions(contractTypeOptions)}
                      placeholder={t("employees.detail.placeholders.selectContractType")}
                    />
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.workPhone")} error={fieldErrors.phone}>
                    <input
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      value={editData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.salary")} error={fieldErrors.salary}>
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={editData.salary ?? ""}
                      onChange={(e) => handleSalaryChange(e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField
                    label={t("employees.detail.fields.wage")}
                    hint={t("employees.detail.fields.wageHint")}
                    error={fieldErrors.wage}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={editData.wage ?? ""}
                      onChange={(e) => handleWageChange(e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.contractDuration")}>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={editData.joiningDate || ""}
                        onChange={(e) =>
                          handleChange("joiningDate", e.target.value)
                        }
                        className={inputClass}
                      />
                      <input
                        type="date"
                        value={editData.contractEndDate || ""}
                        onChange={(e) =>
                          handleChange("contractEndDate", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                  </EmployeeField>

                  <div className="sm:col-span-2">
                    <EmployeeField
                      label={t("employees.detail.fields.systemRoles")}
                      hint={t("employees.detail.fields.systemRolesHint")}
                    >
                      {!availableRoles.length ? (
                        <p className="text-sm text-hr-muted">{t("common.noData")}</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {availableRoles.map((role) => {
                            const isFixed = fixedRoleIds.has(role.id);
                            const isSelected =
                              isFixed || selectedRoleIds.includes(role.id);
                            return (
                              <button
                                key={role.id}
                                type="button"
                                disabled={isFixed}
                                onClick={() => toggleUserRole(role.id)}
                                className={[
                                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                                  isSelected
                                    ? "bg-hr-primary text-white"
                                    : "border border-hr-border bg-hr-surface text-hr-text",
                                  isFixed ? "cursor-not-allowed opacity-80" : "hover:border-hr-primary",
                                ].join(" ")}
                              >
                                {role.name}
                                {isFixed ? ` (${t("employees.detail.fixedRole")})` : ""}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </EmployeeField>
                  </div>

                  {editData.userAccount && (
                    <>
                      <EmployeeField label={t("employees.detail.fields.accountStatus")}>
                        <input
                          value={
                            editData.userAccount.isActive
                              ? t("employees.detail.accountActive")
                              : t("employees.detail.accountInactive")
                          }
                          readOnly
                          className={readOnlyClass}
                        />
                      </EmployeeField>
                      <EmployeeField label={t("employees.detail.fields.emailConfirmed")}>
                        <input
                          value={
                            editData.userAccount.emailConfirmed
                              ? t("common.yes")
                              : t("common.no")
                          }
                          readOnly
                          className={readOnlyClass}
                        />
                      </EmployeeField>
                      <EmployeeField label={t("employees.detail.fields.userCreatedAt")}>
                        <input
                          value={editData.userAccount.createdAtUtc || t("common.dash")}
                          readOnly
                          className={readOnlyClass}
                        />
                      </EmployeeField>
                      <EmployeeField label={t("employees.detail.fields.assignedRoles")}>
                        <input
                          value={
                            editData.userAccount.roles.length
                              ? editData.userAccount.roles
                                  .map((role) => roleLabel(role.roleId))
                                  .join("، ")
                              : t("common.dash")
                          }
                          readOnly
                          className={readOnlyClass}
                        />
                      </EmployeeField>
                    </>
                  )}
                </div>
              )}

              {activeTab === "citizenship" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <EmployeeField label={t("employees.detail.fields.nationality")}>
                    <input
                      value={editData.nationality || ""}
                      onChange={(e) =>
                        handleChange("nationality", e.target.value)
                      }
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.idNumber")} error={fieldErrors.idNumber}>
                    <input
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      value={editData.idNumber || ""}
                      onChange={(e) => handleChange("idNumber", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeIdImageField
                    label={t("employees.detail.fields.idFrontImage")}
                    value={editData.idCardFrontImage}
                    onChange={(value) =>
                      setEditData((prev) => ({ ...prev, idCardFrontImage: value }))
                    }
                  />
                  <EmployeeIdImageField
                    label={t("employees.detail.fields.idBackImage")}
                    value={editData.idCardBackImage}
                    onChange={(value) =>
                      setEditData((prev) => ({ ...prev, idCardBackImage: value }))
                    }
                  />
                </div>
              )}

              {activeTab === "resume" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-base font-bold text-hr-text">
                      {t("employees.detail.resumeLinesTitle")}
                    </h3>
                    {editData.resumeLines?.length ? (
                      <div className="space-y-3">
                        {editData.resumeLines.map((line) => (
                          <article
                            key={line.id}
                            className="rounded-xl border border-hr-border bg-hr-table-alt p-4"
                          >
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-hr-text">{line.title}</h4>
                              {line.typeName ? (
                                <span className="rounded-full bg-hr-primary/10 px-2.5 py-0.5 text-xs font-medium text-hr-primary">
                                  {line.typeName}
                                </span>
                              ) : null}
                            </div>
                            {line.description ? (
                              <p className="text-sm text-hr-muted">{line.description}</p>
                            ) : null}
                            {(line.fromDate || line.toDate) && (
                              <p className="mt-2 text-xs text-hr-muted" dir="ltr">
                                {line.fromDate || "—"} → {line.toDate || "—"}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-hr-muted">
                        {t("employees.detail.resumeLinesEmpty")}
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-3 text-base font-bold text-hr-text">
                      {t("employees.detail.resumeSkillsTitle")}
                    </h3>
                    {editData.resumeSkills?.length ? (
                      <div className="overflow-x-auto rounded-xl border border-hr-border">
                        <table className="min-w-[480px] w-full text-sm">
                          <thead className="bg-hr-table-head text-hr-muted">
                            <tr>
                              <th className="px-3 py-3 text-start font-medium">
                                {t("employees.modal.fields.skillName")}
                              </th>
                              <th className="px-3 py-3 text-start font-medium">
                                {t("employees.modal.fields.skillCategory")}
                              </th>
                              <th className="px-3 py-3 text-start font-medium">
                                {t("employees.modal.fields.skillLevel")}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {editData.resumeSkills.map((skill, index) => (
                              <tr
                                key={`${skill.name}-${index}`}
                                className={
                                  index % 2
                                    ? "border-t border-hr-border bg-hr-table-head"
                                    : "border-t border-hr-border bg-hr-surface"
                                }
                              >
                                <td className="px-3 py-3 text-hr-text">{skill.name}</td>
                                <td className="px-3 py-3 text-hr-muted">{skill.type || t("common.dash")}</td>
                                <td className="px-3 py-3 text-hr-muted">{skill.level || t("common.dash")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-hr-muted">
                        {t("employees.detail.resumeSkillsEmpty")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="self-start text-sm font-medium text-hr-text">
                {t("employees.detail.fields.photo")}
              </p>
              <img
                src={editData.avatar}
                alt={editData.name}
                className="h-[180px] w-[170px] rounded-2xl border border-hr-border object-cover"
              />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-hr-border bg-hr-surface px-4 py-2 text-sm font-medium text-hr-text transition hover:border-hr-primary">
                <Upload className="size-4" />
                {t("employees.detail.changeIdImage")}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      setError(t("employees.errors.photoInvalid"));
                      event.target.value = "";
                      return;
                    }
                    setError(null);
                    const reader = new FileReader();
                    reader.onload = () => {
                      setEditData((prev) => ({
                        ...prev,
                        avatar: (reader.result as string) || prev.avatar,
                      }));
                    };
                    reader.readAsDataURL(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        )}

        <div className={detailFooterClass}>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex h-11 min-w-[150px] items-center justify-center gap-2 rounded-xl bg-hr-primary px-6 text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
          >
            {saving && <Loader className="size-4 animate-spin" />}
            {t("employees.detail.saveChanges")}
          </button>
          <button
            type="button"
            onClick={() => onToggleArchive(editData)}
            className={`h-11 min-w-[120px] rounded-xl px-6 text-sm font-bold text-white transition ${
              editData.isArchived
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {editData.isArchived
              ? t("employees.archive.unarchiveLabel")
              : t("employees.archive.archiveLabel")}
          </button>
        </div>
      </section>
    </main>
  );
}
