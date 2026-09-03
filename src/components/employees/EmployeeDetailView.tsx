import { Loader, Upload, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";
import { DetailBackButton } from "../ui/DetailBackButton";
import type { Employee, EmployeeResumeLine, EmployeeResumeSkill } from "../../types/employee";
import { getEmployeeById, updateEmployee } from "../../services/employeeApi";
import { getAllRoles } from "../../services/roles";
import { getUserById, updateUserRoles } from "../../services/users";
import { getContractTypes, getDepartments } from "../../services/hrApi";
import {
  getResumeLineTypes,
  syncEmployeeResume,
  type ResumeLineTypeOption,
} from "../../services/resumes/resume.service";
import type { AppRole } from "../../types/role";
import { getThrownErrorMessage } from "../../utils/apiResponse";
import {
  isValidDecimal,
  isValidPhone,
  sanitizeDecimalInput,
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
import { departmentPath, employeePath } from "../../constants/entityPaths";
import { useSkillCatalog } from "../../hooks/useSkillCatalog";
import { CopyableIdCell } from "../ui/CopyableIdCell";
import { EntityLink } from "../ui/EntityLink";
import { SearchableSelect } from "../ui/SearchableSelect";
import { ManualDateInput } from "../ui/ManualDateInput";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { EmployeeIdImageField } from "./EmployeeIdImageField";
import { EmployeeResumeLinesEditor } from "./EmployeeResumeLinesEditor";
import { EmployeeResumeSkillsEditor } from "./EmployeeResumeSkillsEditor";
import {
  emptyEmployeeSkillRow,
  isEmployeeSkillRowComplete,
  resumeSkillsToRows,
  toResumeSkillPayload,
  type EmployeeSkillRow,
} from "./employeeSkills";
import { EditUserRolesModal } from "../access/EditUserRolesModal";
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

const uniqueIds = (ids: Iterable<string>) => [
  ...new Set([...ids].map((id) => String(id).trim()).filter(Boolean)),
];

const idsKey = (ids: Iterable<string>) => uniqueIds(ids).sort().join("|");

const accountUserId = (employee: Pick<Employee, "id" | "userId">) =>
  String(employee.userId || employee.id || "").trim();

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
  const [initialRoleIds, setInitialRoleIds] = useState<string[]>([]);
  const [fixedRoleIds, setFixedRoleIds] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [editingUserRoles, setEditingUserRoles] = useState(false);
  const [lineTypes, setLineTypes] = useState<ResumeLineTypeOption[]>([]);
  const [lineTypesLoading, setLineTypesLoading] = useState(false);
  const [skillRows, setSkillRows] = useState<EmployeeSkillRow[]>([
    emptyEmployeeSkillRow(),
  ]);
  const [resumeHydrationKey, setResumeHydrationKey] = useState(0);
  const resumeBaselineRef = useRef<{
    lines: EmployeeResumeLine[];
    skills: EmployeeResumeSkill[];
  }>({ lines: [], skills: [] });
  const {
    skillGroups,
    loading: skillsLoading,
    error: skillsError,
  } = useSkillCatalog(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const userId = accountUserId(employee);

    Promise.all([
      getEmployeeById(employee.id),
      getDepartments({ page: 1, limit: 100 }),
      getContractTypes(1, 100),
      getAllRoles().catch(() => [] as AppRole[]),
      getUserById(userId).catch(() => null),
    ])
      .then(([detail, departmentsResult, contractTypes, roles, userAccount]) => {
        if (cancelled) return;
        setEditData((prev) => {
          // Keep an unsaved local photo preview if the reload has no server image yet.
          const pendingLocalPhoto =
            prev.id === detail.id && prev.avatar?.startsWith("data:")
              ? prev.avatar
              : "";
          return {
            ...detail,
            isArchived: employee.isArchived ?? detail.isArchived,
            userAccount: userAccount ?? undefined,
            avatar: detail.avatar || pendingLocalPhoto || "",
          };
        });
        resumeBaselineRef.current = {
          lines: detail.resumeLines ?? [],
          skills: detail.resumeSkills ?? [],
        };
        setResumeHydrationKey((key) => key + 1);
        setAvailableRoles(roles);
        const assignedIds = uniqueIds(
          userAccount?.roles.map((role) => role.roleId) ?? [],
        );
        const fixedIds = uniqueIds(
          userAccount?.roles
            .filter((role) => role.isFixed)
            .map((role) => role.roleId) ?? [],
        );
        setSelectedRoleIds(assignedIds);
        setInitialRoleIds(assignedIds);
        setFixedRoleIds(new Set(fixedIds));
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
        if (cancelled) return;
        setEditData(employee);
        setError(getThrownErrorMessage(err, t("employees.errors.loadDetail")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // Only reload when switching employees — not on every parent object identity change.
  }, [employee.id, employee.isArchived, employee.userId, t]);

  useEffect(() => {
    let cancelled = false;
    setLineTypesLoading(true);
    getResumeLineTypes()
      .then((types) => {
        if (!cancelled) setLineTypes(types);
      })
      .catch(() => {
        if (!cancelled) setLineTypes([]);
      })
      .finally(() => {
        if (!cancelled) setLineTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSkillRows(
      resumeSkillsToRows(editData.resumeSkills ?? [], skillGroups),
    );
    // Hydration key captures server reloads; skillGroups fills type/level ids when catalog arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid resetting while the user edits skill rows
  }, [resumeHydrationKey, skillGroups]);

  const draftResumeSkills = useMemo(
    () =>
      skillRows
        .filter(isEmployeeSkillRowComplete)
        .filter(
          (row, index, rows) =>
            rows.findIndex(
              (entry) =>
                entry.skillId === row.skillId && entry.levelId === row.levelId,
            ) === index,
        )
        .map(toResumeSkillPayload),
    [skillRows],
  );

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

  const birthDateErrorMessage = (issue: ReturnType<typeof getBirthDateIssue>) => {
    if (issue === "invalid") return t("employees.errors.birthDateInvalid");
    if (issue === "future") return t("employees.errors.birthDateFuture");
    if (issue === "tooYoung") return t("employees.errors.birthDateTooYoung");
    if (issue === "tooOld") return t("employees.errors.birthDateTooOld");
    return null;
  };

  useEffect(() => {
    const normalized = normalizeBirthDateValue(editData.birthDate);
    if (normalized && normalized !== editData.birthDate) {
      setEditData((prev) => ({ ...prev, birthDate: normalized }));
      return;
    }
    const message = birthDateErrorMessage(getBirthDateIssue(editData.birthDate));
    setFieldErrors((prev) => {
      const current = prev.birthDate || "";
      const next = message || "";
      if (current === next) return prev;
      return { ...prev, birthDate: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only recheck when birthDate changes
  }, [editData.birthDate, t]);

  const handleBirthDateChange = (raw: string) => {
    const value = normalizeBirthDateValue(raw) || raw;
    setEditData((prev) => ({ ...prev, birthDate: value }));
    const message = birthDateErrorMessage(getBirthDateIssue(value));
    setFieldErrors((prev) => ({ ...prev, birthDate: message || "" }));
  };

  const validateBeforeSave = () => {
    const nextErrors: Record<string, string> = {};

    if (editData.phone?.trim() && !isValidPhone(editData.phone)) {
      nextErrors.phone = t("employees.errors.phoneInvalid");
    }
    if (editData.workPhone?.trim() && !isValidPhone(editData.workPhone)) {
      nextErrors.workPhone = t("employees.errors.phoneInvalid");
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
    const birthMessage = birthDateErrorMessage(
      getBirthDateIssue(editData.birthDate),
    );
    if (birthMessage) {
      nextErrors.birthDate = birthMessage;
      setActiveTab("personal");
    }

    const incompleteSkill = skillRows.some(
      (row) =>
        (row.typeId || row.skillId || row.levelId) &&
        !isEmployeeSkillRowComplete(row),
    );
    if (incompleteSkill) {
      nextErrors.resumeSkills = t("employees.modal.skills.selectCategoryFirst");
      setActiveTab("resume");
    }

    const hasDuplicateSkill = skillRows.some((row, index) => {
      if (!isEmployeeSkillRowComplete(row)) return false;
      return skillRows.some(
        (entry, entryIndex) =>
          entryIndex !== index &&
          entry.skillId === row.skillId &&
          entry.levelId === row.levelId,
      );
    });
    if (hasDuplicateSkill) {
      nextErrors.resumeSkills = t("employees.modal.skills.duplicateSkill");
      setActiveTab("resume");
    }

    for (const [index, line] of (editData.resumeLines ?? []).entries()) {
      if (!line.title.trim() && !line.fromDate && !line.type) continue;
      if (!line.title.trim()) {
        nextErrors[`resumeLineTitle-${index}`] = t(
          "employees.detail.resumeLineErrors.titleRequired",
        );
      }
      if (!line.type) {
        nextErrors[`resumeLineType-${index}`] = t(
          "employees.detail.resumeLineErrors.typeRequired",
        );
      }
      if (!line.fromDate) {
        nextErrors[`resumeLineFrom-${index}`] = t(
          "employees.detail.resumeLineErrors.fromDateRequired",
        );
      }
      if (line.fromDate && line.toDate && line.toDate < line.fromDate) {
        nextErrors[`resumeLineTo-${index}`] = t(
          "employees.detail.resumeLineErrors.dateOrder",
        );
      }
    }
    if (
      Object.keys(nextErrors).some((key) => key.startsWith("resumeLine")) ||
      nextErrors.resumeSkills
    ) {
      setActiveTab("resume");
    }

    const resumeTouched =
      (editData.resumeLines?.length ?? 0) > 0 ||
      draftResumeSkills.length > 0 ||
      resumeBaselineRef.current.lines.length > 0 ||
      resumeBaselineRef.current.skills.length > 0;
    if (resumeTouched && !editData.resumeId) {
      nextErrors.resumeId = t("employees.detail.resumeMissingId");
      setActiveTab("resume");
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      afterValidationPaint(() => focusAndScrollToFirstError());
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;

    setSaving(true);
    setError(null);

    try {
      const userId = accountUserId(editData);
      const nextRoleIds = uniqueIds([...selectedRoleIds, ...fixedRoleIds]);
      const rolesChanged = idsKey(nextRoleIds) !== idsKey([...initialRoleIds, ...fixedRoleIds]);

      if (rolesChanged) {
        if (!userId) {
          setError(t("employees.errors.missingUserId"));
          setSaving(false);
          return;
        }
        try {
          await updateUserRoles(userId, nextRoleIds);
          setInitialRoleIds(nextRoleIds);
        } catch (roleErr) {
          setError(
            getThrownErrorMessage(roleErr, t("employees.errors.saveRoles")),
          );
          setSaving(false);
          return;
        }
      }

      const submittedLocalPhoto = editData.avatar?.startsWith("data:")
        ? editData.avatar
        : "";
      const resumeDraft = {
        lines: (editData.resumeLines ?? []).filter(
          (line) => line.title.trim() && line.type && line.fromDate,
        ),
        skills: draftResumeSkills,
      };
      const updated = await updateEmployee(editData.id, {
        ...editData,
        resumeSkills: resumeDraft.skills,
        resumeLines: resumeDraft.lines,
      });

      if (editData.resumeId) {
        await syncEmployeeResume(
          editData.resumeId,
          resumeBaselineRef.current,
          resumeDraft,
        );
      }

      const refreshed = await getEmployeeById(editData.id).catch(() => updated);
      resumeBaselineRef.current = {
        lines: refreshed.resumeLines ?? [],
        skills: refreshed.resumeSkills ?? [],
      };
      setResumeHydrationKey((key) => key + 1);

      let userAccount = editData.userAccount;
      try {
        userAccount = (await getUserById(accountUserId(refreshed) || userId)) ?? userAccount;
      } catch {
        if (rolesChanged) {
          userAccount = {
            ...(userAccount ?? {
              id: userId,
              email: refreshed.email,
              isActive: true,
              emailConfirmed: false,
              roles: [],
              rolesCount: 0,
            }),
            roles: nextRoleIds.map((roleId) => ({
              roleId,
              isFixed: fixedRoleIds.has(roleId),
            })),
            rolesCount: nextRoleIds.length,
          };
        }
      }

      // Prefer the just-uploaded preview so a missing/broken API media path
      // does not wipe the photo the user already selected.
      const serverPhoto = refreshed.avatar?.trim() || "";
      const photoMissingOnServer = Boolean(submittedLocalPhoto) && !serverPhoto;
      const keptLocalPhoto =
        submittedLocalPhoto || serverPhoto || editData.avatar || "";
      const merged = {
        ...refreshed,
        userAccount,
        avatar: keptLocalPhoto,
      };
      setEditData(merged);
      if (rolesChanged) {
        setSelectedRoleIds(nextRoleIds);
        setInitialRoleIds(nextRoleIds);
      } else if (userAccount) {
        const assignedIds = uniqueIds(userAccount.roles.map((role) => role.roleId));
        setSelectedRoleIds(assignedIds);
        setInitialRoleIds(assignedIds);
        setFixedRoleIds(
          new Set(
            uniqueIds(
              userAccount.roles
                .filter((role) => role.isFixed)
                .map((role) => role.roleId),
            ),
          ),
        );
      }
      onUpdate(merged);
      if (photoMissingOnServer) {
        setError(t("employees.errors.photoNotPersistedByServer"));
      }
    } catch (err) {
      const message = getThrownErrorMessage(err, t("employees.errors.save"));
      if (
        err &&
        typeof err === "object" &&
        "message" in err &&
        String(err.message) === "INVALID_BIRTH_DATE"
      ) {
        setActiveTab("personal");
        setFieldErrors((prev) => ({
          ...prev,
          birthDate: t("employees.errors.birthDateTooYoung"),
        }));
        setError(t("employees.errors.birthDateTooYoung"));
      } else {
        setError(message);
      }
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

  const selectedDepartment = departmentOptions.find(
    (department) => department.id === editData.departmentId,
  );

  return (
    <main
      className="min-w-0 flex-1 bg-hr-bg px-4 py-4 sm:px-6 sm:py-6"
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hr-border px-5 py-4">
          <div className="flex items-center gap-2">
            <UserRound className="size-5 text-hr-primary" />
            <h2 className="text-lg font-bold text-hr-text">{t("employees.detail.title")}</h2>
          </div>
          <button
            type="button"
            onClick={() => setEditingUserRoles(true)}
            disabled={loading || !(editData.userId || editData.id)}
            className="inline-flex h-10 items-center rounded-xl bg-hr-primary px-4 text-sm font-bold text-white transition hover:bg-hr-primary-hover disabled:opacity-60"
          >
            {t("employees.detail.editUserRoles")}
          </button>
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
                  <EmployeeField label={t("employees.detail.fields.fullName")}>
                    <input
                      value={editData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className={inputClass}
                    />
                  </EmployeeField>
                  <EmployeeField
                    label={t("employees.detail.fields.birthDate")}
                    error={fieldErrors.birthDate}
                  >
                    <ManualDateInput
                      value={editData.birthDate || ""}
                      onChange={handleBirthDateChange}
                      aria-invalid={Boolean(fieldErrors.birthDate)}
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
                  <EmployeeField
                    label={t("employees.detail.fields.email")}
                    hint={t("employees.detail.fields.emailHint")}
                  >
                    <input
                      type="email"
                      value={editData.email}
                      readOnly
                      className={readOnlyClass}
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
                  <EmployeeField
                    label={t("employees.detail.fields.userId")}
                    hint={t("employees.detail.fields.userIdHint")}
                  >
                    <div className="flex h-11 items-center rounded-xl border border-hr-border bg-hr-hover px-4">
                      <CopyableIdCell value={editData.userId || editData.employeeId || "-"} />
                    </div>
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
                    {editData.departmentId ? (
                      <EntityLink
                        to={departmentPath(editData.departmentId)}
                        className="mt-1 inline-block text-xs"
                      >
                        {t("common.view")}
                      </EntityLink>
                    ) : null}
                  </EmployeeField>
                  <EmployeeField label={t("employees.detail.fields.manager")}>
                    <div className={`${readOnlyClass} flex items-center`}>
                      <EntityLink
                        to={employeePath(
                          selectedDepartment?.managerId || editData.managerId,
                        )}
                      >
                        {selectedDepartment?.managerName ||
                          editData.managerName ||
                          t("common.dash")}
                      </EntityLink>
                    </div>
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
                  <EmployeeField label={t("employees.detail.fields.workPhone")} error={fieldErrors.workPhone}>
                    <input
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      value={editData.workPhone || ""}
                      onChange={(e) => handleChange("workPhone", e.target.value)}
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
                      <ManualDateInput
                        value={editData.joiningDate || ""}
                        onChange={(joiningDate) =>
                          handleChange("joiningDate", joiningDate)
                        }
                      />
                      <ManualDateInput
                        value={editData.contractEndDate || ""}
                        onChange={(contractEndDate) =>
                          handleChange("contractEndDate", contractEndDate)
                        }
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
                  <p className="rounded-xl border border-hr-border bg-hr-hover/40 px-4 py-3 text-sm text-hr-muted">
                    {t("employees.detail.resumeSyncHint")}
                  </p>
                  {fieldErrors.resumeId ? (
                    <p className={alertErrorClass}>{fieldErrors.resumeId}</p>
                  ) : null}

                  <div>
                    <h3 className="mb-3 text-base font-bold text-hr-text">
                      {t("employees.detail.resumeLinesTitle")}
                    </h3>
                    <EmployeeResumeLinesEditor
                      lines={editData.resumeLines ?? []}
                      lineTypes={lineTypes}
                      loading={lineTypesLoading}
                      disabled={saving || !editData.resumeId}
                      onChange={(lines) =>
                        setEditData((prev) => ({ ...prev, resumeLines: lines }))
                      }
                    />
                  </div>

                  <div>
                    <h3 className="mb-3 text-base font-bold text-hr-text">
                      {t("employees.detail.resumeSkillsTitle")}
                    </h3>
                    {fieldErrors.resumeSkills ? (
                      <p className={`mb-3 ${alertErrorClass}`}>
                        {fieldErrors.resumeSkills}
                      </p>
                    ) : null}
                    <EmployeeResumeSkillsEditor
                      skills={skillRows}
                      onChange={setSkillRows}
                      skillGroups={skillGroups}
                      loading={skillsLoading || saving || !editData.resumeId}
                      error={skillsError}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="self-start text-sm font-medium text-hr-text">
                {t("employees.detail.fields.photo")}
              </p>
              {editData.avatar ? (
                <img
                  key={editData.avatar.slice(0, 64)}
                  src={editData.avatar}
                  alt=""
                  className="h-[180px] w-[170px] rounded-2xl border border-hr-border object-cover"
                  onError={(event) => {
                    const current = editData.avatar || "";
                    // Never wipe a local preview the user just chose.
                    if (current.startsWith("data:")) return;
                    // If a remote URL fails, fall back to initials only.
                    (event.currentTarget as HTMLImageElement).style.display = "none";
                    setEditData((prev) =>
                      prev.avatar === current ? { ...prev, avatar: "" } : prev,
                    );
                  }}
                />
              ) : (
                <EmployeeAvatar
                  src=""
                  name={editData.name}
                  alt=""
                  className="h-[180px] w-[170px] rounded-2xl border border-hr-border object-cover text-4xl"
                />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-hr-border bg-hr-surface px-4 py-2 text-sm font-medium text-hr-text transition hover:border-hr-primary">
                <Upload className="size-4" />
                {t("employees.detail.changePhoto")}
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
                    if (file.size > 5 * 1024 * 1024) {
                      setError(t("employees.errors.photoTooLarge"));
                      event.target.value = "";
                      return;
                    }
                    setError(null);
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = typeof reader.result === "string" ? reader.result : "";
                      if (!result) {
                        setError(t("employees.errors.photoInvalid"));
                        return;
                      }
                      setEditData((prev) => ({
                        ...prev,
                        avatar: result,
                      }));
                    };
                    reader.onerror = () => {
                      setError(t("employees.errors.photoInvalid"));
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

      {editingUserRoles && accountUserId(editData) ? (
        <EditUserRolesModal
          userId={accountUserId(editData)}
          onClose={() => setEditingUserRoles(false)}
          onSaved={() => {
            const userId = accountUserId(editData);
            void getUserById(userId)
              .then((userAccount) => {
                const assignedIds = uniqueIds(
                  userAccount.roles.map((role) => role.roleId),
                );
                setEditData((prev) => ({ ...prev, userAccount }));
                setSelectedRoleIds(assignedIds);
                setInitialRoleIds(assignedIds);
                setFixedRoleIds(
                  new Set(
                    uniqueIds(
                      userAccount.roles
                        .filter((role) => role.isFixed)
                        .map((role) => role.roleId),
                    ),
                  ),
                );
              })
              .catch(() => undefined);
            setEditingUserRoles(false);
          }}
        />
      ) : null}
    </main>
  );
}
