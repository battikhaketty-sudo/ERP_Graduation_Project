import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import hrEmployeeStatsIllustration from "../assets/images/hr-employee-stats.png";
import { AttendanceRowActions } from "../components/hr/AttendanceRowActions";
import { TableAddButton, TableToolbar } from "../components/ui/TableToolbar";
import { useAuth } from "../hooks/useAuth";
import { DateTimeInput } from "../components/ui/DateTimeInput";
import { ManualDateInput } from "../components/ui/ManualDateInput";
import { FormField } from "../components/ui/FormField";
import {
  alertErrorClass,
  cancelBtnClass,
  readOnlyClass,
  STATUS_BADGE_CLASS,
  subtlePanelClass,
} from "../components/ui/formStyles";
import { SearchableSelect } from "../components/ui/SearchableSelect";
import { CopyableIdCell } from "../components/ui/CopyableIdCell";
import { TableRowIndex } from "../components/ui/TableRowIndex";
import { useToast } from "../context/ToastContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import {
  dateTimeInputToIso,
  defaultDateTimeInput,
  isoToDateTimeInput,
} from "../utils/timeInput";
import {
  addAttendence,
  addContractType,
  updateContractType,
  addDepartment,
  addSkillType,
  syncSkillTypeDetails,
  approveAttendence,
  checkInAttendence,
  checkOutAttendence,
  deleteAttendence,
  deleteContractType,
  deleteDepartment,
  deleteSkillType,
  getAttendences,
  getContractTypes,
  getDepartments,
  getSkillTypes,
  getTodayApiRange,
  refuseAttendence,
  updateAttendence,
  updateDepartment,
  type AttendanceRecord,
  type ContractType,
  type Department,
  type SkillGroup,
} from "../services/hrApi";
import { getEmployees, getEmployeeCount } from "../services/employeeApi";
import { getThrownErrorMessage } from "../utils/apiResponse";
import { sortSkillLevelsByRank } from "../utils/skillLevels";
import { mapNamedOptions } from "../utils/selectOptions";
import {
  WorkSchedulePanel,
  type WorkScheduleHeaderState,
} from "../components/WorkSchedulePanel";
import { WorkScheduleStatsBanner } from "../components/WorkScheduleStatsBanner";
import { AddProjectButton } from "../components/ui/AddProjectButton";
import { ModalTitleBar } from "../components/ui/ModalTitleBar";
import { Pagination } from "../components/Pagination";
import { usePreferences } from "../context/PreferencesContext";
import { useTranslation } from "../i18n";

type HrSection =
  | "contracts"
  | "workSchedules"
  | "attendance"
  | "departments"
  | "skills"
  | "addAttendanceModal"
  | "editAttendanceModal"
  | "editDepartmentModal"
  | "addDepartmentModal";

const attendanceStatusClasses: Record<string, string> = {
  مقبول: STATUS_BADGE_CLASS.success,
  مرفوض: STATUS_BADGE_CLASS.error,
  معلق: STATUS_BADGE_CLASS.warning,
  متأخر: STATUS_BADGE_CLASS.info,
  Approved: STATUS_BADGE_CLASS.success,
  Refused: STATUS_BADGE_CLASS.error,
  Pending: STATUS_BADGE_CLASS.warning,
  Late: STATUS_BADGE_CLASS.info,
  حاضر: STATUS_BADGE_CLASS.success,
  إجازة: STATUS_BADGE_CLASS.error,
};

const emptyDepartmentForm = {
  departmentId: "",
  name: "",
  managerId: "",
  parentId: "",
  description: "",
};

const getTodayRange = () => getTodayApiRange();

const truncateText = (value: string, max = 80) => {
  if (!value) return "-";
  return value.length > max ? `${value.slice(0, max)}...` : value;
};

const skillTypePillClasses = [
  "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
];


type SkillDraftRow = {
  id: string;
  apiId?: string;
  value: string;
};

const createSkillDraftRow = (value = "", apiId?: string): SkillDraftRow => ({
  id: crypto.randomUUID(),
  apiId,
  value,
});

type SkillLevelDraftRow = {
  id: string;
  apiId?: string;
  name: string;
  progress: number;
};

const createSkillLevelDraftRow = (
  name = "",
  progress = 50,
  apiId?: string,
): SkillLevelDraftRow => ({
  id: crypto.randomUUID(),
  apiId,
  name,
  progress,
});

const getSkillTypeClass = (name: string, index: number) => {
  const map: Record<string, string> = {
    Marketing:
      "bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300",
    "Programming languages":
      "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    "Programming Lanuages":
      "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    "Soft skills":
      "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
    IT: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300",
    Languages:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  };
  return map[name] || skillTypePillClasses[index % skillTypePillClasses.length];
};

const withSkillTypeSelection = (baseClass: string, selected: boolean) =>
  selected
    ? `${baseClass} ring-2 ring-hr-primary ring-offset-2 shadow-md`
    : `${baseClass} opacity-90 hover:opacity-100`;

const defaultSkillForm = () => ({
  skillType: "Languages",
  skillsList: [
    createSkillDraftRow("English"),
    createSkillDraftRow("French"),
    createSkillDraftRow("Arabic"),
    createSkillDraftRow("Italy"),
  ],
  skillLevels: [
    createSkillLevelDraftRow("A1", 81),
    createSkillLevelDraftRow("A2", 42),
    createSkillLevelDraftRow("B1", 51),
    createSkillLevelDraftRow("B2", 82),
  ],
});

const emptyEditAttendanceForm = {
  recordId: "",
  checkInAt: "",
  checkOutAt: "",
};

const emptyAttendanceForm = {
  employeeId: "",
  checkInAt: defaultDateTimeInput(9, 0),
  checkOutAt: defaultDateTimeInput(17, 0),
};

const displayHour = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return String(date.getHours());
};

const attendanceStatusLabelKeys: Record<
  string,
  "pending" | "approved" | "refused" | "late" | "present" | "leave"
> = {
  مقبول: "approved",
  Approved: "approved",
  approved: "approved",
  مرفوض: "refused",
  Refused: "refused",
  refused: "refused",
  معلق: "pending",
  Pending: "pending",
  pending: "pending",
  متأخر: "late",
  Late: "late",
  late: "late",
  حاضر: "present",
  Present: "present",
  present: "present",
  إجازة: "leave",
  Leave: "leave",
  leave: "leave",
};

export function HrPage() {
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { dir } = usePreferences();
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const scheduleDetailParam = searchParams.get("schedule");
  const showEmployeeStats = !scheduleDetailParam;
  const [scheduleHeader, setScheduleHeader] =
    useState<WorkScheduleHeaderState | null>(null);

  const sectionButtons = useMemo(
    (): { key: HrSection; label: string }[] => [
      { key: "contracts", label: t("hr.sections.contracts") },
      { key: "workSchedules", label: t("hr.sections.workSchedules") },
      { key: "skills", label: t("hr.sections.skills") },
      { key: "departments", label: t("hr.sections.departments") },
      { key: "attendance", label: t("hr.sections.attendance") },
    ],
    [t],
  );

  const attendanceStatusFilterOptions = useMemo(
    () => [
      { value: "", label: t("hr.attendance.filterLabel") },
      { value: "0", label: t("badges.attendanceStatus.pending") },
      { value: "1", label: t("badges.attendanceStatus.approved") },
      { value: "2", label: t("badges.attendanceStatus.refused") },
      { value: "3", label: t("badges.attendanceStatus.late") },
    ],
    [t],
  );

  const getAttendanceStatusLabel = useCallback(
    (status: string) => {
      const badgeKey = attendanceStatusLabelKeys[status.trim()];
      return badgeKey ? t(`badges.attendanceStatus.${badgeKey}`) : status;
    },
    [t],
  );
  const [activeSection, setActiveSection] = useState<HrSection>("contracts");
  const [search, setSearch] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [selectedContractIds, setSelectedContractIds] = useState<Set<string>>(
    new Set(),
  );
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  const [newContractName, setNewContractName] = useState("");
  const [inlineContractName, setInlineContractName] = useState("");
  const [contractModal, setContractModal] = useState<"add" | "edit" | null>(
    null,
  );
  const [editingContractId, setEditingContractId] = useState<string | null>(
    null,
  );
  const [editContractName, setEditContractName] = useState("");
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);
  const [addDepartmentForm, setAddDepartmentForm] =
    useState(emptyDepartmentForm);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<
    Set<string>
  >(new Set());
  const [departmentPage, setDepartmentPage] = useState(1);
  const [departmentTotalPages, setDepartmentTotalPages] = useState(1);
  const [departmentSaving, setDepartmentSaving] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [departmentOptions, setDepartmentOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendanceForm);
  const [editAttendanceForm, setEditAttendanceForm] = useState(
    emptyEditAttendanceForm,
  );
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(
    null,
  );
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(
    null,
  );
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("");
  const [attendanceDateFrom, setAttendanceDateFrom] = useState("");
  const [attendanceDateTo, setAttendanceDateTo] = useState("");
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceTotalPages, setAttendanceTotalPages] = useState(1);
  const [checkInSaving, setCheckInSaving] = useState(false);
  const [checkOutSavingId, setCheckOutSavingId] = useState<string | null>(null);

  const [contracts, setContracts] = useState<ContractType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [selectedSkillTypeId, setSelectedSkillTypeId] = useState<string | null>(
    null,
  );
  const [skillModal, setSkillModal] = useState<"add" | "edit" | null>(null);
  const [editingSkillTypeId, setEditingSkillTypeId] = useState<string | null>(
    null,
  );
  const [skillType, setSkillType] = useState(defaultSkillForm().skillType);
  const [skillsList, setSkillsList] = useState<SkillDraftRow[]>(
    defaultSkillForm().skillsList,
  );
  const [skillLevels, setSkillLevels] = useState<SkillLevelDraftRow[]>(
    defaultSkillForm().skillLevels,
  );
  const [skillSaving, setSkillSaving] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [presentTodayCount, setPresentTodayCount] = useState<number | null>(
    null,
  );
  const [statsLoading, setStatsLoading] = useState(true);

  const loadSkills = useCallback(async () => {
    const skillsData = await getSkillTypes();
    setSkillGroups(skillsData);
  }, []);

  const loadDepartments = useCallback(
    async (page: number) => {
      try {
        const { records, meta } = await getDepartments({
          page,
          limit: 10,
          name: departmentSearch.trim() || undefined,
        });

        setDepartments(records);
        setDepartmentPage(page);
        setDepartmentTotalPages(meta.totalPages || 1);
        setApiNotice(null);
      } catch (err) {
        setApiNotice(
          getThrownErrorMessage(err, t("hr.page.loadDepartmentsError")),
        );
      }
    },
    [departmentSearch, t],
  );

  const loadAttendance = useCallback(
    async (page: number) => {
      try {
        const from = attendanceDateFrom || undefined;
        const to = attendanceDateTo || undefined;

        const { records, meta } = await getAttendences({
          page,
          limit: 10,
          employeeName: attendanceSearch.trim() || undefined,
          from,
          to,
          status: attendanceStatusFilter
            ? Number(attendanceStatusFilter)
            : undefined,
        });

        setAttendance(records);
        setAttendancePage(page);
        setAttendanceTotalPages(meta.totalPages || 1);
        setApiNotice(null);
      } catch (err) {
        setApiNotice(
          getThrownErrorMessage(err, t("hr.page.loadAttendanceError")),
        );
      }
    },
    [
      attendanceDateFrom,
      attendanceDateTo,
      attendanceSearch,
      attendanceStatusFilter,
      t,
    ],
  );

  const loadEmployeeStats = useCallback(async () => {
    setStatsLoading(true);

    try {
      const total = await getEmployeeCount();
      setTotalEmployees(total);
    } catch {
      setTotalEmployees(0);
    }

    try {
      const { from, to } = getTodayRange();
      const todayAttendance = await getAttendences({
        page: 1,
        limit: 100,
        from,
        to,
      });

      const uniquePresent = new Set(
        todayAttendance.records
          .filter((record) => record.checkInRaw)
          .map((record) => record.employeeId),
      );

      setPresentTodayCount(
        uniquePresent.size || todayAttendance.meta.totalItems || 0,
      );
    } catch {
      setPresentTodayCount(0);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadHrData = useCallback(async () => {
    try {
      const [contractsData, departmentsResult, attendanceResult, skillsData] =
        await Promise.all([
          getContractTypes(),
          getDepartments({ page: 1, limit: 10 }),
          getAttendences({ page: 1, limit: 10 }),
          getSkillTypes(),
        ]);

      setContracts(contractsData);
      setDepartments(departmentsResult.records);
      setDepartmentPage(departmentsResult.meta.currentPage || 1);
      setDepartmentTotalPages(departmentsResult.meta.totalPages || 1);
      setAttendance(attendanceResult.records);
      setAttendancePage(attendanceResult.meta.currentPage || 1);
      setAttendanceTotalPages(attendanceResult.meta.totalPages || 1);
      setSkillGroups(skillsData);
      setApiNotice(null);
      await loadEmployeeStats();
    } catch (err) {
      setApiNotice(getThrownErrorMessage(err, t("hr.page.loadError")));
    }
  }, [loadEmployeeStats, t]);

  useEffect(() => {
    loadHrData();
  }, [loadHrData]);

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "skills") {
      setActiveSection("skills");
    }
    if (searchParams.get("schedule")) {
      setActiveSection("workSchedules");
    }
  }, [searchParams]);

  useEffect(() => {
    void loadEmployeeStats();
  }, [location.pathname, loadEmployeeStats]);

  useEffect(() => {
    const handleFocus = () => {
      void loadEmployeeStats();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadEmployeeStats]);

  useEffect(() => {
    const needsEmployees =
      activeSection === "addAttendanceModal" ||
      activeSection === "departments" ||
      activeSection === "addDepartmentModal" ||
      activeSection === "editDepartmentModal";

    if (!needsEmployees) {
      return;
    }

    getEmployees(1, 100)
      .then((result) => {
        setEmployeeOptions(
          result.data.map((employee) => ({
            id: employee.id,
            name: employee.name,
          })),
        );
      })
      .catch(() => {
        setEmployeeOptions([]);
      });

    if (
      activeSection !== "departments" &&
      activeSection !== "addDepartmentModal" &&
      activeSection !== "editDepartmentModal"
    ) {
      return;
    }

    getDepartments({ page: 1, limit: 100 })
      .then(({ records }) => {
        setDepartmentOptions(
          records.map((department) => ({
            id: department.id,
            name: department.name,
          })),
        );
      })
      .catch(() => {
        setDepartmentOptions([]);
      });
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "departments") return;
    const timer = window.setTimeout(() => {
      loadDepartments(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [activeSection, departmentSearch, loadDepartments]);

  useEffect(() => {
    if (activeSection !== "attendance") return;
    const timer = window.setTimeout(() => {
      loadAttendance(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    activeSection,
    attendanceSearch,
    attendanceStatusFilter,
    attendanceDateFrom,
    attendanceDateTo,
    loadAttendance,
  ]);

  const filteredContracts = useMemo(() => {
    const q = contractSearch.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter((item) => item.name.toLowerCase().includes(q));
  }, [contracts, contractSearch]);

  const toggleContractSelection = (id: string) => {
    setSelectedContractIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteContracts = async (ids: string[]) => {
    if (!ids.length) return;

    const confirmed = await confirm({
      message:
        ids.length === 1
          ? t("hr.contracts.confirms.delete")
          : t("hr.contracts.confirms.deleteMany", { count: ids.length }),
    });
    if (!confirmed) return;

    try {
      await Promise.all(ids.map((id) => deleteContractType(id)));
      setContracts((prev) => prev.filter((item) => !ids.includes(item.id)));
      setSelectedContractIds(new Set());
      setApiNotice(null);
    } catch (err) {
      setApiNotice(getThrownErrorMessage(err, t("hr.contracts.errors.delete")));
    }
  };

  const visibleSkillGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return skillGroups;
    return skillGroups.filter((group) =>
      group.name.toLowerCase().includes(query),
    );
  }, [skillGroups, search]);

  useEffect(() => {
    if (!visibleSkillGroups.length) {
      if (!search.trim()) {
        setSelectedSkillTypeId(null);
      }
      return;
    }

    if (
      !selectedSkillTypeId ||
      !visibleSkillGroups.some((group) => group.id === selectedSkillTypeId)
    ) {
      setSelectedSkillTypeId(visibleSkillGroups[0].id);
    }
  }, [visibleSkillGroups, selectedSkillTypeId, search]);

  const selectedSkillGroup = useMemo(
    () => skillGroups.find((group) => group.id === selectedSkillTypeId) ?? null,
    [skillGroups, selectedSkillTypeId],
  );

  const displayedSkills = selectedSkillGroup?.skills ?? [];

  const displayedSkillLevels = useMemo(
    () => sortSkillLevelsByRank(selectedSkillGroup?.levels ?? []),
    [selectedSkillGroup],
  );

  const resetSkillForm = () => {
    const defaults = defaultSkillForm();
    setSkillType(defaults.skillType);
    setSkillsList(defaults.skillsList);
    setSkillLevels(defaults.skillLevels);
    setEditingSkillTypeId(null);
  };

  const openAddSkillModal = () => {
    resetSkillForm();
    setSkillModal("add");
  };

  const openEditSkillType = (group: SkillGroup) => {
    setEditingSkillTypeId(group.id);
    setSkillType(group.name);
    setSkillsList(
      group.skills.map((skill) => createSkillDraftRow(skill.name, skill.id)),
    );
    setSkillLevels(
      sortSkillLevelsByRank(
        group.levels.map((level) =>
          createSkillLevelDraftRow(level.name, level.progress, level.id),
        ),
      ),
    );
    setSkillModal("edit");
  };

  const closeSkillModal = () => {
    setSkillModal(null);
    resetSkillForm();
  };

  const closeTo = (section: HrSection) => () => setActiveSection(section);

  const handleSaveSkill = async () => {
    const trimmedType = skillType.trim();
    const trimmedSkills = skillsList
      .map((skill) => skill.value.trim())
      .filter(Boolean);
    const trimmedLevels = skillLevels
      .map((level) => ({ name: level.name.trim(), progress: level.progress }))
      .filter((level) => level.name);

    if (!trimmedType) {
      setApiNotice(t("hr.skills.modals.typeRequired"));
      return;
    }

    setSkillSaving(true);
    try {
      await addSkillType({
        name: trimmedType,
        skillNames: trimmedSkills,
        skillLevels: trimmedLevels,
      });
      await loadSkills();
      setApiNotice(null);
      closeSkillModal();
    } catch (err) {
      setApiNotice(getThrownErrorMessage(err, t("hr.skills.errors.add")));
      return;
    } finally {
      setSkillSaving(false);
    }
  };

  const handleUpdateSkill = async () => {
    const original = skillGroups.find(
      (group) => group.id === editingSkillTypeId,
    );
    if (!original || !editingSkillTypeId) return;

    const trimmedType = skillType.trim();
    const trimmedSkills = skillsList
      .map((skill) => ({ apiId: skill.apiId, name: skill.value.trim() }))
      .filter((skill) => skill.name);

    const trimmedLevels = skillLevels
      .map((level) => ({ name: level.name.trim(), progress: level.progress }))
      .filter((level) => level.name);

    if (!trimmedType) {
      setApiNotice(t("hr.skills.modals.typeRequired"));
      return;
    }

    setSkillSaving(true);
    try {
      await syncSkillTypeDetails(
        editingSkillTypeId,
        original,
        trimmedType,
        trimmedSkills,
        trimmedLevels,
      );
      await loadSkills();
      setSelectedSkillTypeId(editingSkillTypeId);
      setApiNotice(null);
      closeSkillModal();
    } catch (err) {
      setApiNotice(getThrownErrorMessage(err, t("hr.skills.errors.update")));
    } finally {
      setSkillSaving(false);
    }
  };

  const handleDeleteSkillType = async (id: string) => {
    const confirmed = await confirm({
      message: t("hr.skills.confirms.delete"),
    });
    if (!confirmed) return;

    try {
      await deleteSkillType(id);
      setSkillGroups((prev) => prev.filter((group) => group.id !== id));
      if (selectedSkillTypeId === id) {
        setSelectedSkillTypeId(null);
      }
      setApiNotice(null);
    } catch (err) {
      setApiNotice(getThrownErrorMessage(err, t("hr.skills.errors.delete")));
    }
  };

  const handleAddContract = async () => {
    const name = newContractName.trim();
    if (!name) return;

    try {
      const created = await addContractType(name);
      setContracts(await getContractTypes());
      setApiNotice(null);
      showToast(t("hr.contracts.toasts.addSuccess"), "success");
    } catch (err) {
      const message = getThrownErrorMessage(err, t("hr.contracts.errors.add"));
      setApiNotice(message);
      showToast(message, "error");
      return;
    }

    setNewContractName("");
    setContractModal(null);
  };

  const handleQuickAddContract = async () => {
    const name = inlineContractName.trim();
    if (!name) return;

    try {
      const created = await addContractType(name);
      setContracts(await getContractTypes());
      setInlineContractName("");
      setApiNotice(null);
      showToast(
        t("hr.contracts.toasts.quickAddSuccess", { name: created.name }),
        "success",
      );
    } catch (err) {
      const message = getThrownErrorMessage(err, t("hr.contracts.errors.add"));
      setApiNotice(message);
      showToast(message, "error");
    }
  };

  const openEditContract = (contract: ContractType) => {
    setEditingContractId(contract.id);
    setEditContractName(contract.name);
    setContractModal("edit");
  };

  const closeContractModal = () => {
    setContractModal(null);
    setEditingContractId(null);
    setEditContractName("");
    setNewContractName("");
  };

  const handleUpdateContract = async () => {
    const name = editContractName.trim();
    if (!name || !editingContractId) return;

    try {
      const updated = await updateContractType(editingContractId, name);
      setContracts((prev) =>
        prev.map((item) =>
          item.id === editingContractId ? { ...item, ...updated } : item,
        ),
      );
      setApiNotice(null);
    } catch (err) {
      setApiNotice(getThrownErrorMessage(err, t("hr.contracts.errors.update")));
      return;
    }

    setEditingContractId(null);
    setEditContractName("");
    setContractModal(null);
  };

  const handleSaveDepartment = async (mode: "add" | "edit") => {
    const form = mode === "add" ? addDepartmentForm : departmentForm;

    if (!form.name.trim()) {
      setApiNotice(t("hr.departmentsSection.errors.nameRequired"));
      return;
    }

    if (!form.managerId.trim()) {
      setApiNotice(t("hr.departmentsSection.errors.managerRequired"));
      return;
    }

    const payload = {
      name: form.name.trim(),
      managerId: form.managerId.trim(),
      parentId: form.parentId.trim() || undefined,
      description: form.description.trim(),
    };

    setDepartmentSaving(true);
    try {
      if (mode === "edit" && editingDepartmentId) {
        await updateDepartment(editingDepartmentId, payload);
        await loadDepartments(departmentPage);
      } else {
        await addDepartment(payload);
        await loadDepartments(departmentPage);
      }

      setApiNotice(null);

      if (mode === "edit") {
        setDepartmentForm(emptyDepartmentForm);
        setEditingDepartmentId(null);
      } else {
        setAddDepartmentForm(emptyDepartmentForm);
      }

      setActiveSection("departments");
    } catch (err) {
      setApiNotice(
        getThrownErrorMessage(
          err,
          mode === "edit"
            ? t("hr.departmentsSection.errors.save")
            : t("hr.departmentsSection.errors.add"),
        ),
      );
    } finally {
      setDepartmentSaving(false);
    }
  };

  const handleDeleteDepartments = async (ids: string[]) => {
    if (!ids.length) return;

    const confirmed = await confirm({
      message:
        ids.length === 1
          ? t("hr.departmentsSection.confirms.delete")
          : t("hr.departmentsSection.confirms.deleteMany", {
              count: ids.length,
            }),
    });
    if (!confirmed) return;

    try {
      for (const id of ids) {
        await deleteDepartment(id);
      }
      setSelectedDepartmentIds(new Set());
      setApiNotice(null);
      await loadDepartments(departmentPage);
    } catch (err) {
      setApiNotice(
        getThrownErrorMessage(err, t("hr.departmentsSection.errors.delete")),
      );
    }
  };

  const toggleDepartmentSelection = (id: string) => {
    setSelectedDepartmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddAttendance = async () => {
    if (!attendanceForm.employeeId.trim()) return;

    const checkin = dateTimeInputToIso(attendanceForm.checkInAt);
    const checkout = attendanceForm.checkOutAt.trim()
      ? dateTimeInputToIso(attendanceForm.checkOutAt)
      : undefined;

    if (!checkin) return;

    try {
      await addAttendence({
        employeeId: attendanceForm.employeeId.trim(),
        checkin,
        checkout,
      });
      setApiNotice(null);
      setAttendancePage(1);
      await loadAttendance(1);
      await loadEmployeeStats();
    } catch (err) {
      setApiNotice(getThrownErrorMessage(err, t("hr.attendance.errors.add")));
      return;
    }

    setAttendanceForm(emptyAttendanceForm);
    setActiveSection("attendance");
  };

  const refreshAttendanceAfterMutation = async () => {
    setAttendancePage(1);
    await loadAttendance(1);
    await loadEmployeeStats();
  };

  const resolveEmployeeIdBySessionEmail = useCallback(async () => {
    const userEmail = user?.email?.trim().toLowerCase();
    if (!userEmail) return null;

    try {
      const result = await getEmployees(1, 100);
      return (
        result.data.find(
          (employee) => employee.email.trim().toLowerCase() === userEmail,
        )?.id ?? null
      );
    } catch {
      return null;
    }
  }, [user?.email]);

  const handleCheckIn = async () => {
    if (checkInSaving) return;

    setCheckInSaving(true);
    try {
      try {
        await checkInAttendence();
      } catch (selfCheckInError) {
        const employeeId = await resolveEmployeeIdBySessionEmail();
        if (!employeeId) {
          throw selfCheckInError;
        }

        await addAttendence({
          employeeId,
          checkin: new Date().toISOString(),
        });
      }

      setApiNotice(null);
      await refreshAttendanceAfterMutation();
    } catch (err) {
      setApiNotice(
        getThrownErrorMessage(err, t("hr.attendance.errors.checkIn")),
      );
    } finally {
      setCheckInSaving(false);
    }
  };

  const handleCheckOutRecord = async (record: AttendanceRecord) => {
    if (!record.checkInRaw || record.checkOutRaw || checkOutSavingId) return;

    setCheckOutSavingId(record.id);
    try {
      await checkOutAttendence(record.id);
      setApiNotice(null);
      showToast(t("hr.attendance.toasts.checkOutSuccess"), "success");
      await loadAttendance(attendancePage);
      await loadEmployeeStats();
    } catch (err) {
      setApiNotice(
        getThrownErrorMessage(err, t("hr.attendance.errors.checkOut")),
      );
    } finally {
      setCheckOutSavingId(null);
    }
  };

  const handleDeleteAttendance = async (ids: string[]) => {
    if (!ids.length) return;

    const confirmed = await confirm({
      message:
        ids.length === 1
          ? t("hr.attendance.confirms.delete")
          : t("hr.attendance.confirms.deleteMany", { count: ids.length }),
    });
    if (!confirmed) return;

    try {
      await Promise.all(ids.map((id) => deleteAttendence(id)));
      setApiNotice(null);
      showToast(t("hr.attendance.toasts.deleteSuccess"), "success");
      await loadAttendance(attendancePage);
      await loadEmployeeStats();
    } catch (err) {
      setApiNotice(
        getThrownErrorMessage(err, t("hr.attendance.errors.delete")),
      );
    }
  };

  const handleApproveAttendance = async (id: string) => {
    try {
      await approveAttendence(id);
      setApiNotice(null);
      showToast(t("hr.attendance.toasts.approveSuccess"), "success");
      await loadAttendance(attendancePage);
      await loadEmployeeStats();
    } catch (err) {
      setApiNotice(
        getThrownErrorMessage(err, t("hr.attendance.errors.approve")),
      );
    }
  };

  const handleRefuseAttendance = async (id: string) => {
    try {
      await refuseAttendence(id);
      setApiNotice(null);
      showToast(t("hr.attendance.toasts.refuseSuccess"), "success");
      await loadAttendance(attendancePage);
      await loadEmployeeStats();
    } catch (err) {
      setApiNotice(
        getThrownErrorMessage(err, t("hr.attendance.errors.refuse")),
      );
    }
  };

  const openEditAttendance = (record: AttendanceRecord) => {
    setEditingAttendanceId(record.id);
    setEditAttendanceForm({
      recordId: record.id,
      checkInAt: isoToDateTimeInput(record.checkInRaw),
      checkOutAt: isoToDateTimeInput(record.checkOutRaw),
    });
    setActiveSection("editAttendanceModal");
  };

  const handleEditAttendance = async () => {
    if (!editingAttendanceId) return;

    const checkin = dateTimeInputToIso(editAttendanceForm.checkInAt);
    const checkout = editAttendanceForm.checkOutAt.trim()
      ? dateTimeInputToIso(editAttendanceForm.checkOutAt)
      : undefined;

    if (!checkin) return;

    try {
      await updateAttendence(editingAttendanceId, { checkin, checkout });
      setApiNotice(null);
      await loadAttendance(attendancePage);
      await loadEmployeeStats();
    } catch (err) {
      setApiNotice(
        getThrownErrorMessage(err, t("hr.attendance.errors.update")),
      );
      return;
    }

    setEditingAttendanceId(null);
    setEditAttendanceForm(emptyEditAttendanceForm);
    setActiveSection("attendance");
  };

  const openEditDepartment = (department: Department) => {
    setApiNotice(null);
    setEditingDepartmentId(String(department.id));
    setDepartmentForm({
      departmentId: String(department.id),
      name: department.name,
      managerId: department.managerId,
      parentId: department.parentId,
      description: department.description,
    });
    setActiveSection("editDepartmentModal");
  };

  const renderContracts = () => (
    <section className="rounded-xl border border-hr-border bg-hr-surface p-4 shadow-card sm:p-5">
      <TableToolbar
        addLabel={t("hr.contracts.addLabel")}
        onAddClick={() => setContractModal("add")}
      >
        <div className="relative w-full max-w-xs sm:min-w-[240px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
          <input
            value={contractSearch}
            onChange={(e) => setContractSearch(e.target.value)}
            placeholder={t("hr.contracts.searchPlaceholder")}
            className="h-9 w-full rounded-lg border border-hr-border bg-hr-surface pe-3 ps-9 text-sm outline-none focus:border-hr-primary"
          />
        </div>
      </TableToolbar>

      <div className="overflow-hidden rounded-lg border border-hr-border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-hr-table-head text-hr-muted">
            <tr>
              <th className="px-3 py-3 text-center font-medium">
                {t("table.columns.select")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("table.columns.index")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                {t("table.columns.id")}
              </th>
              <th className="px-3 py-3 text-start font-medium">
                {t("hr.contracts.columns.name")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                <button
                  type="button"
                  aria-label={t("common.delete")}
                  onClick={() =>
                    handleDeleteContracts([...selectedContractIds])
                  }
                  className="text-red-400 disabled:opacity-40"
                  disabled={!selectedContractIds.size}
                >
                  <Trash2 className="mx-auto size-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="hr-table-row-highlight">
              <td className="px-3 py-2" colSpan={3} />
              <td className="px-3 py-2">
                <input
                  value={inlineContractName}
                  onChange={(event) =>
                    setInlineContractName(event.target.value)
                  }
                  placeholder={t("hr.contracts.quickAddPlaceholder")}
                  className="h-9 w-full rounded-lg border border-amber-200 bg-hr-surface px-3 text-sm outline-none focus:border-hr-primary"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleQuickAddContract();
                  }}
                />
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  type="button"
                  onClick={() => void handleQuickAddContract()}
                  disabled={!inlineContractName.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-hr-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                >
                  <Plus className="size-3.5" />
                  {t("common.add")}
                </button>
              </td>
            </tr>
            {filteredContracts.map((item, idx) => (
              <tr
                key={item.id}
                className={idx % 2 ? "bg-hr-table-head" : "bg-hr-surface"}
              >
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-hr-primary"
                    checked={selectedContractIds.has(item.id)}
                    onChange={() => toggleContractSelection(item.id)}
                  />
                </td>
                <td className="px-3 py-3 text-center text-hr-muted">
                  <TableRowIndex index={idx} />
                </td>
                <td className="px-3 py-3 text-center">
                  <CopyableIdCell value={item.id} />
                </td>
                <td className="px-3 py-3 text-hr-text">{item.name}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      aria-label={t("common.edit")}
                      onClick={() => openEditContract(item)}
                      className="rounded p-1 text-amber-500 transition hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("common.delete")}
                      onClick={() => handleDeleteContracts([item.id])}
                      className="rounded p-1 text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderAttendance = () => (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <select
          value={attendanceStatusFilter}
          onChange={(e) => setAttendanceStatusFilter(e.target.value)}
          aria-label={t("hr.attendance.filterLabel")}
          className="h-9 min-w-[190px] rounded-lg border border-hr-border bg-hr-surface px-3 text-sm text-hr-text outline-none focus:border-hr-primary"
        >
          {attendanceStatusFilterOptions.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="relative w-52 min-w-[180px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
          <input
            value={attendanceSearch}
            onChange={(e) => setAttendanceSearch(e.target.value)}
            placeholder={t("hr.attendance.searchPlaceholder")}
            className="h-9 w-full rounded-lg border border-hr-border bg-hr-surface pe-3 ps-9 text-sm outline-none focus:border-hr-primary"
          />
        </div>

        <div className="flex min-w-[150px] items-center gap-1.5">
          <span className="text-sm text-hr-muted">{t("common.from")}</span>
          <ManualDateInput
            value={attendanceDateFrom}
            onChange={setAttendanceDateFrom}
            className="!h-9"
            aria-label={t("common.from")}
          />
        </div>

        <div className="flex min-w-[150px] items-center gap-1.5">
          <span className="text-sm text-hr-muted">{t("common.to")}</span>
          <ManualDateInput
            value={attendanceDateTo}
            onChange={setAttendanceDateTo}
            className="!h-9"
            aria-label={t("common.to")}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-hr-border bg-hr-surface shadow-card">
        <div className="flex w-full flex-wrap items-center justify-end gap-2 border-b border-hr-border px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setActiveSection("addAttendanceModal")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-hr-accent-bg px-4 text-sm font-medium text-hr-accent-text transition hover:opacity-90"
          >
            <Plus className="size-4" />
            {t("hr.attendance.addRecord")}
          </button>
          <button
            type="button"
            onClick={() => void handleCheckIn()}
            disabled={checkInSaving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#FF7A0036] px-4 text-sm font-medium text-[#FF7A00] transition hover:bg-[#FF7A004D] disabled:opacity-60"
          >
            {checkInSaving
              ? t("hr.attendance.checkInSaving")
              : t("hr.attendance.checkIn")}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto text-sm">
            <thead className="bg-hr-table-head text-[11px] leading-tight text-hr-muted">
              <tr>
                <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                  {t("hr.attendance.checkOut")}
                </th>
                <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                  {t("hr.attendance.columns.recordNumber")}
                </th>
                <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                  {t("hr.attendance.columns.employeeNumber")}
                </th>
                <th className="whitespace-nowrap px-2 py-2.5 text-start font-medium">
                  {t("hr.attendance.columns.employeeName")}
                </th>
                <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                  {t("hr.attendance.columns.checkIn")}
                </th>
                <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                  {t("hr.attendance.columns.checkOut")}
                </th>
                <th className="whitespace-nowrap px-1 py-2.5 text-center font-medium">
                  {t("hr.attendance.columns.totalWorkHours")}
                </th>
                <th className="whitespace-nowrap px-1 py-2.5 text-center font-medium">
                  {t("hr.attendance.columns.requiredWorkHours")}
                </th>
                <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                  {t("hr.attendance.columns.status")}
                </th>
                <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                  {t("table.columns.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {attendance.map((item, idx) => (
                <tr
                  key={item.id}
                  className={idx % 2 ? "bg-hr-table-head" : "bg-hr-surface"}
                >
                  <td className="px-2 py-2.5 text-center">
                    {item.checkOutRaw ? (
                      <span
                        className="text-xs font-medium text-green-500"
                        aria-hidden
                      >
                        ✓
                      </span>
                    ) : item.checkInRaw ? (
                      <button
                        type="button"
                        onClick={() => void handleCheckOutRecord(item)}
                        disabled={checkOutSavingId === item.id}
                        className="inline-flex h-8 items-center rounded-lg bg-hr-primary/15 px-2.5 text-xs font-bold text-hr-primary transition hover:bg-hr-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {checkOutSavingId === item.id
                          ? t("hr.attendance.checkOutSaving")
                          : t("hr.attendance.checkOut")}
                      </button>
                    ) : (
                      <span className="text-hr-muted">-</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-center text-hr-text">
                    <TableRowIndex
                      index={idx}
                      page={attendancePage}
                      pageSize={10}
                    />
                  </td>
                  <td className="px-1 py-2.5 text-center">
                    <CopyableIdCell value={item.employeeId} />
                  </td>
                  <td
                    className="max-w-[160px] truncate whitespace-nowrap px-2 py-2.5 text-hr-text"
                    title={item.employeeName}
                  >
                    {item.employeeName}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-center text-hr-text">
                    {displayHour(item.checkInRaw)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-center text-hr-text">
                    {displayHour(item.checkOutRaw)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-center text-hr-text">
                    {item.totalWorkHours ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5 text-center text-hr-text">
                    {item.requiredWorkHours ?? 8}
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        attendanceStatusClasses[item.status] ??
                        STATUS_BADGE_CLASS.neutral
                      }`}
                    >
                      {getAttendanceStatusLabel(item.status)}
                    </span>
                  </td>
                  <td className="px-1 py-2.5">
                    <AttendanceRowActions
                      record={item}
                      onApprove={(id) => void handleApproveAttendance(id)}
                      onRefuse={(id) => void handleRefuseAttendance(id)}
                      onEdit={openEditAttendance}
                      onDelete={(id) => void handleDeleteAttendance([id])}
                    />
                  </td>
                </tr>
              ))}
              {!attendance.length && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-8 text-center text-hr-muted"
                  >
                    {t("hr.attendance.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={attendancePage}
          totalPages={attendanceTotalPages}
          onPageChange={(page) => void loadAttendance(page)}
          className="border-t border-hr-border"
        />
      </section>
    </>
  );

  const renderDepartments = () => (
    <section className="rounded-xl border border-hr-border bg-hr-surface p-4 shadow-card sm:p-5">
      <TableToolbar
        addLabel={t("hr.departmentsSection.addLabel")}
        onAddClick={() => {
          setApiNotice(null);
          setAddDepartmentForm(emptyDepartmentForm);
          setActiveSection("addDepartmentModal");
        }}
      >
        <div className="relative w-full max-w-xs sm:min-w-[240px]">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
          <input
            value={departmentSearch}
            onChange={(e) => setDepartmentSearch(e.target.value)}
            placeholder={t("hr.departmentsSection.searchPlaceholder")}
            className="h-9 w-full rounded-lg border border-hr-border bg-hr-surface pe-3 ps-9 text-sm outline-none focus:border-hr-primary"
          />
        </div>
      </TableToolbar>

      <div className="overflow-hidden rounded-lg border border-hr-border">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-10" />
            <col className="w-12" />
            <col className="w-[12%]" />
            <col className="w-[11%]" />
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col />
            <col className="w-16" />
          </colgroup>
          <thead className="bg-hr-table-head text-xs text-hr-muted">
            <tr>
              <th className="px-2 py-3 text-center font-medium">
                {t("table.columns.select")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("table.columns.index")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("table.columns.id")}
              </th>
              <th className="px-2 py-3 text-start font-medium">
                {t("hr.departmentsSection.columns.name")}
              </th>
              <th className="px-2 py-3 text-start font-medium">
                {t("hr.departmentsSection.columns.parentName")}
              </th>
              <th className="px-2 py-3 text-center font-medium">
                {t("hr.departmentsSection.columns.managerId")}
              </th>
              <th className="px-2 py-3 text-start font-medium">
                {t("hr.departmentsSection.columns.managerName")}
              </th>
              <th className="px-2 py-3 text-start font-medium">
                {t("hr.departmentsSection.columns.description")}
              </th>
              <th className="px-3 py-3 text-center font-medium">
                <button
                  type="button"
                  aria-label={t("common.delete")}
                  onClick={() =>
                    handleDeleteDepartments([...selectedDepartmentIds])
                  }
                  className="text-red-400 disabled:opacity-40"
                  disabled={!selectedDepartmentIds.size}
                >
                  <Trash2 className="mx-auto size-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {departments.map((item, idx) => (
              <tr
                key={item.id}
                className={idx % 2 ? "bg-hr-table-head" : "bg-hr-surface"}
              >
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-hr-primary"
                    checked={selectedDepartmentIds.has(item.id)}
                    onChange={() => toggleDepartmentSelection(item.id)}
                  />
                </td>
                <td className="px-3 py-3 text-center text-hr-muted">
                  <TableRowIndex
                    index={idx}
                    page={departmentPage}
                    pageSize={10}
                  />
                </td>
                <td className="px-2 py-3 text-center">
                  <CopyableIdCell value={item.id} />
                </td>
                <td
                  className="truncate px-2 py-3 text-hr-text"
                  title={item.name}
                >
                  {item.name}
                </td>
                <td
                  className="truncate px-2 py-3 text-hr-text"
                  title={item.parentName || undefined}
                >
                  {item.parentName || "-"}
                </td>
                <td
                  className="truncate px-2 py-3 text-center text-hr-text"
                  title={item.managerId || undefined}
                >
                  {item.managerId || "-"}
                </td>
                <td
                  className="truncate px-2 py-3 text-hr-text"
                  title={item.managerName || undefined}
                >
                  {item.managerName || "-"}
                </td>
                <td
                  className="line-clamp-2 break-words px-2 py-3 text-hr-text"
                  title={item.description || undefined}
                >
                  {truncateText(item.description, 50)}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      aria-label={t("common.edit")}
                      onClick={() => openEditDepartment(item)}
                      className="text-amber-500"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("common.delete")}
                      onClick={() => handleDeleteDepartments([item.id])}
                      className="text-red-400"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!departments.length && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-hr-muted">
                  {t("hr.departmentsSection.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {departmentTotalPages > 1 && (
        <Pagination
          currentPage={departmentPage}
          totalPages={departmentTotalPages}
          onPageChange={(page) => void loadDepartments(page)}
          className="mt-4 border-0"
        />
      )}
    </section>
  );

  const renderSkills = () => (
    <section className="rounded-xl border border-hr-border bg-hr-surface p-4 shadow-card sm:p-5">
      <div className="relative pe-10">
        <div
          className="absolute bottom-6 end-3 top-6 w-px border-e-2 border-dashed border-hr-border"
          aria-hidden
        />

        <div className="space-y-10">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm font-bold text-hr-text">
                {t("hr.skills.skillType")}
              </p>
              <div className="flex flex-wrap gap-2">
                {visibleSkillGroups.length ? (
                  visibleSkillGroups.map((group) => {
                    const index = skillGroups.findIndex((item) => item.id === group.id);
                    const selected = group.id === selectedSkillTypeId;
                    return (
                      <span
                        key={group.id}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition ${withSkillTypeSelection(getSkillTypeClass(group.name, index), selected)}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSkillTypeId(group.id)}
                          className="px-2 py-0.5"
                        >
                          {group.name}
                        </button>
                        <button
                          type="button"
                          aria-label={t("common.editItem", {
                            name: group.name,
                          })}
                          onClick={() => openEditSkillType(group)}
                          className="rounded p-0.5 text-amber-600 transition hover:bg-hr-surface/60"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={t("common.deleteItem", {
                            name: group.name,
                          })}
                          onClick={() => handleDeleteSkillType(group.id)}
                          className="rounded p-0.5 text-red-500 transition hover:bg-hr-surface/60 hover:text-red-600"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-hr-muted">
                    {t("hr.skills.noSkillTypes")}
                  </span>
                )}
              </div>
            </div>
            <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-hr-accent-bg text-sm font-bold text-hr-accent-text">
              1
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm font-bold text-hr-text">
                {t("hr.skills.skills")}
                {selectedSkillGroup ? (
                  <span className="ms-2 text-xs font-normal text-hr-muted">
                    ({selectedSkillGroup.name})
                  </span>
                ) : null}
              </p>
              {!selectedSkillGroup ? (
                <p className="text-sm text-hr-muted">
                  {t("hr.skills.selectSkillType")}
                </p>
              ) : displayedSkills.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {displayedSkills.map((skill) => (
                    <div
                      key={skill.id ?? skill.name}
                      className={`${subtlePanelClass} px-3 py-5 text-center text-sm`}
                    >
                      {skill.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-hr-muted">
                  {t("hr.skills.noSkills")}
                </p>
              )}
            </div>
            <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-hr-accent-bg text-sm font-bold text-hr-accent-text">
              2
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm font-bold text-hr-text">
                {t("hr.skills.skillLevel")}
                {selectedSkillGroup ? (
                  <span className="ms-2 text-xs font-normal text-hr-muted">
                    ({selectedSkillGroup.name})
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-2">
                {!selectedSkillGroup ? (
                  <span className="text-sm text-hr-muted">
                    {t("hr.skills.selectSkillTypeForLevels")}
                  </span>
                ) : displayedSkillLevels.length ? (
                  displayedSkillLevels.map((level) => (
                    <span
                      key={level.id ?? level.name}
                      className="rounded-full bg-hr-accent-bg px-4 py-1.5 text-sm font-medium text-hr-accent-text"
                      title={`${level.progress}%`}
                    >
                      {level.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-hr-muted">
                    {t("hr.skills.noLevels")}
                  </span>
                )}
              </div>
            </div>
            <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-hr-accent-bg text-sm font-bold text-hr-accent-text">
              3
            </div>
          </div>
        </div>
      </div>

      <TableAddButton
        label={t("hr.skills.addLabel")}
        onClick={openAddSkillModal}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-hr-accent-bg px-4 py-2 text-sm font-medium text-hr-accent-text transition hover:opacity-90"
      />
    </section>
  );

  return (
    <main
      className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-hr-bg px-6 py-6"
      dir={dir}
    >
      <header className="mb-6 rounded-2xl bg-hr-surface p-5 shadow-card sm:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-hr-primary sm:text-[22px]">
            {t("pages.departments.title")}{" "}
            <span className="font-medium text-hr-primary/80">
              ({departments.length})
            </span>{" "}
            | {t("hr.page.title")}
          </h1>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1 sm:min-w-[280px]">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-hr-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("hr.skills.searchPlaceholder")}
              className="h-[45px] w-full rounded-full border border-hr-border bg-hr-surface pe-4 ps-11 text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
            />
          </div>
          <AddProjectButton />
        </div>

        {scheduleHeader ? (
          <>
            <h2 className="mb-4 text-xl font-bold text-hr-text sm:text-[22px]">
              {scheduleHeader.scheduleTitle}
            </h2>
            <div className="mb-4">
              <WorkScheduleStatsBanner stats={scheduleHeader.stats} />
            </div>
          </>
        ) : (
          showEmployeeStats && (
            <div className="mb-4 grid grid-cols-1 items-center gap-4 rounded-2xl border border-hr-border bg-hr-table-alt px-5 py-4 sm:grid-cols-[minmax(0,1fr)_170px]">
              <div>
                <p className="mb-3 text-base font-bold text-hr-text">
                  {t("hr.page.statsTitle")}
                </p>
                <div className="flex flex-wrap gap-6 sm:gap-8">
                  <div className="flex flex-col items-center">
                    <div className="flex size-14 items-center justify-center rounded-full border-4 border-[#7FC9E4] bg-hr-surface text-lg font-bold text-[#3FB4E5]">
                      {statsLoading && totalEmployees === null
                        ? "…"
                        : (totalEmployees ?? 0)}
                    </div>
                    <p className="mt-2 text-xs text-hr-muted">
                      {t("hr.page.totalEmployees")}
                    </p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="flex size-14 items-center justify-center rounded-full border-4 border-[#7FC9E4] bg-hr-surface text-lg font-bold text-[#3FB4E5]">
                      {statsLoading && presentTodayCount === null
                        ? "…"
                        : (presentTodayCount ?? 0)}
                    </div>
                    <p className="mt-2 text-xs text-hr-muted">
                      {t("hr.page.presentToday")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="hidden items-center justify-center sm:flex">
                <div className="relative h-[140px] w-[170px] overflow-hidden rounded-2xl bg-gradient-to-b from-[#E8F6FC] to-[#D4EEF9]">
                  <img
                    src={hrEmployeeStatsIllustration}
                    alt=""
                    className="size-full object-contain object-bottom p-1"
                  />
                </div>
              </div>
            </div>
          )
        )}

        {apiNotice && <p className={`mb-4 ${alertErrorClass}`}>{apiNotice}</p>}

        <div className="flex flex-wrap gap-2">
          {sectionButtons.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={
                activeSection === section.key ||
                (activeSection === "addAttendanceModal" &&
                  section.key === "attendance") ||
                (activeSection === "editAttendanceModal" &&
                  section.key === "attendance")
                  ? "hr-tab-pill-active"
                  : "hr-tab-pill-inactive"
              }
            >
              {section.label}
            </button>
          ))}
        </div>
      </header>

      {activeSection === "contracts" && renderContracts()}
      {activeSection === "workSchedules" && (
        <WorkSchedulePanel
          onNotice={setApiNotice}
          onHeaderStateChange={setScheduleHeader}
        />
      )}
      {activeSection === "attendance" && renderAttendance()}
      {activeSection === "departments" && renderDepartments()}
      {activeSection === "skills" && renderSkills()}

      {contractModal === "add" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="relative w-full max-w-lg rounded-xl bg-hr-surface p-8 shadow-card"
            dir={dir}
          >
            <ModalTitleBar
              title={t("hr.contracts.addLabel")}
              onClose={closeContractModal}
            />
            <label className="mb-2 block text-sm text-hr-text">
              {t("hr.contracts.columns.name")}
            </label>
            <input
              value={newContractName}
              onChange={(e) => setNewContractName(e.target.value)}
              className="mb-8 h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
              placeholder={t("hr.contracts.modals.namePlaceholder")}
            />
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleAddContract}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white"
              >
                {t("hr.contracts.modals.addSubmit")}
              </button>
              <button
                type="button"
                onClick={closeContractModal}
                className={cancelBtnClass}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {contractModal === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="relative w-full max-w-lg rounded-xl bg-hr-surface p-8 shadow-card"
            dir={dir}
          >
            <ModalTitleBar
              title={t("hr.contracts.modals.editTitle")}
              onClose={closeContractModal}
            />
            <label className="mb-2 block text-sm text-hr-text">
              {t("hr.contracts.columns.name")}
            </label>
            <input
              value={editContractName}
              onChange={(e) => setEditContractName(e.target.value)}
              className="mb-8 h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
              placeholder={t("hr.contracts.modals.namePlaceholder")}
              autoFocus
            />
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleUpdateContract}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white"
              >
                {t("common.save")}
              </button>
              <button
                type="button"
                onClick={closeContractModal}
                className={cancelBtnClass}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "addAttendanceModal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="relative w-full max-w-lg rounded-xl bg-hr-surface p-8 shadow-card"
            dir={dir}
          >
            <ModalTitleBar
              title={t("hr.attendance.modals.addTitle")}
              onClose={closeTo("attendance")}
            />
            <FormField
              label={t("hr.attendance.modals.employee")}
              required
              hint={t("hr.attendance.modals.employeeHint")}
            >
              <SearchableSelect
                value={attendanceForm.employeeId}
                onChange={(value) =>
                  setAttendanceForm((prev) => ({
                    ...prev,
                    employeeId: value,
                  }))
                }
                options={mapNamedOptions(employeeOptions, {
                  description: (employee) => employee.id,
                })}
                placeholder={t("hr.attendance.modals.selectEmployee")}
              />
            </FormField>
            <div className="mb-6">
              <label className="mb-2 block text-sm text-hr-text">
                {t("hr.attendance.modals.checkInTime")}
              </label>
              <DateTimeInput
                value={attendanceForm.checkInAt}
                onChange={(value) =>
                  setAttendanceForm((prev) => ({ ...prev, checkInAt: value }))
                }
                aria-label={t("hr.attendance.modals.checkInTime")}
              />
            </div>
            <div className="mb-8">
              <label className="mb-2 block text-sm text-hr-text">
                {t("hr.attendance.modals.checkOutTime")}
              </label>
              <DateTimeInput
                value={attendanceForm.checkOutAt}
                onChange={(value) =>
                  setAttendanceForm((prev) => ({ ...prev, checkOutAt: value }))
                }
                aria-label={t("hr.attendance.modals.checkOutTime")}
              />
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleAddAttendance}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white"
              >
                {t("hr.attendance.modals.addSubmit")}
              </button>
              <button
                type="button"
                onClick={closeTo("attendance")}
                className={cancelBtnClass}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "editAttendanceModal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="relative w-full max-w-lg rounded-xl bg-hr-surface p-8 shadow-card"
            dir={dir}
          >
            <ModalTitleBar
              title={t("hr.attendance.modals.editTitle")}
              onClose={closeTo("attendance")}
            />
            <label className="mb-2 block text-sm text-hr-text">
              {t("hr.attendance.modals.recordId")}
            </label>
            <input
              value={editAttendanceForm.recordId}
              readOnly
              className={`mb-6 ${readOnlyClass}`}
            />
            <div className="mb-6">
              <label className="mb-2 block text-sm text-hr-text">
                {t("hr.attendance.modals.checkInTime")}
              </label>
              <DateTimeInput
                value={editAttendanceForm.checkInAt}
                onChange={(value) =>
                  setEditAttendanceForm((prev) => ({
                    ...prev,
                    checkInAt: value,
                  }))
                }
                aria-label={t("hr.attendance.modals.checkInTime")}
              />
            </div>
            <div className="mb-8">
              <label className="mb-2 block text-sm text-hr-text">
                {t("hr.attendance.modals.checkOutTime")}
              </label>
              <DateTimeInput
                value={editAttendanceForm.checkOutAt}
                onChange={(value) =>
                  setEditAttendanceForm((prev) => ({
                    ...prev,
                    checkOutAt: value,
                  }))
                }
                aria-label={t("hr.attendance.modals.checkOutTime")}
              />
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleEditAttendance}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white"
              >
                {t("common.save")}
              </button>
              <button
                type="button"
                onClick={closeTo("attendance")}
                className={cancelBtnClass}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "editDepartmentModal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="relative w-full max-w-2xl rounded-xl bg-hr-surface p-8 shadow-card"
            dir={dir}
          >
            <ModalTitleBar
              title={t("hr.departmentsSection.modals.editTitle")}
              onClose={closeTo("departments")}
            />
            {apiNotice && (
              <p className={`mb-4 ${alertErrorClass}`}>{apiNotice}</p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  {t("hr.departmentsSection.modals.departmentId")}
                </label>
                <input
                  value={departmentForm.departmentId}
                  readOnly
                  className={readOnlyClass}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  {t("hr.departmentsSection.columns.name")}
                </label>
                <input
                  value={departmentForm.name}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
                />
              </div>
              <FormField
                label={t("hr.departmentsSection.modals.parent")}
                hint={t("common.optional")}
              >
                <SearchableSelect
                  value={departmentForm.parentId}
                  onChange={(value) =>
                    setDepartmentForm((prev) => ({
                      ...prev,
                      parentId: value,
                    }))
                  }
                  options={mapNamedOptions(
                    departmentOptions.filter(
                      (department) =>
                        department.id !== departmentForm.departmentId,
                    ),
                  )}
                  placeholder={t("hr.departmentsSection.modals.noParent")}
                />
              </FormField>
              <FormField
                label={t("hr.departmentsSection.modals.manager")}
                hint={t("hr.departmentsSection.modals.managerHint")}
              >
                <SearchableSelect
                  value={departmentForm.managerId}
                  onChange={(value) =>
                    setDepartmentForm((prev) => ({
                      ...prev,
                      managerId: value,
                    }))
                  }
                  options={mapNamedOptions(employeeOptions, {
                    description: (employee) => employee.id,
                  })}
                  placeholder={t("hr.departmentsSection.modals.selectManager")}
                />
              </FormField>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-hr-text">
                  {t("hr.departmentsSection.modals.description")}
                </label>
                <textarea
                  value={departmentForm.description}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-hr-border p-3 outline-none focus:border-hr-primary"
                  rows={4}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveDepartment("edit")}
                disabled={departmentSaving}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {departmentSaving
                  ? t("common.saving")
                  : t("hr.departmentsSection.modals.editSubmit")}
              </button>
              <button
                type="button"
                onClick={closeTo("departments")}
                className={cancelBtnClass}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "addDepartmentModal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="relative w-full max-w-2xl rounded-xl bg-hr-surface p-8 shadow-card"
            dir={dir}
          >
            <ModalTitleBar
              title={t("hr.departmentsSection.modals.addTitle")}
              onClose={closeTo("departments")}
            />
            {apiNotice && (
              <p className={`mb-4 ${alertErrorClass}`}>{apiNotice}</p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  {t("hr.departmentsSection.columns.name")}
                </label>
                <input
                  value={addDepartmentForm.name}
                  onChange={(e) =>
                    setAddDepartmentForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
                />
              </div>
              <FormField
                label={t("hr.departmentsSection.modals.parent")}
                hint={t("common.optional")}
              >
                <SearchableSelect
                  value={addDepartmentForm.parentId}
                  onChange={(value) =>
                    setAddDepartmentForm((prev) => ({
                      ...prev,
                      parentId: value,
                    }))
                  }
                  options={mapNamedOptions(departmentOptions)}
                  placeholder={t("hr.departmentsSection.modals.noParent")}
                />
              </FormField>
              <FormField
                label={t("hr.departmentsSection.modals.manager")}
                hint={t("hr.departmentsSection.modals.managerHint")}
              >
                <SearchableSelect
                  value={addDepartmentForm.managerId}
                  onChange={(value) =>
                    setAddDepartmentForm((prev) => ({
                      ...prev,
                      managerId: value,
                    }))
                  }
                  options={mapNamedOptions(employeeOptions, {
                    description: (employee) => employee.id,
                  })}
                  placeholder={t("hr.departmentsSection.modals.selectManager")}
                />
              </FormField>
              <div className="sm:col-span-3">
                <label className="mb-2 block text-sm text-hr-text">
                  {t("hr.departmentsSection.modals.description")}
                </label>
                <textarea
                  value={addDepartmentForm.description}
                  onChange={(e) =>
                    setAddDepartmentForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-hr-border p-3 outline-none focus:border-hr-primary"
                  rows={4}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveDepartment("add")}
                disabled={departmentSaving}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {departmentSaving
                  ? t("common.adding")
                  : t("hr.departmentsSection.modals.addSubmit")}
              </button>
              <button
                type="button"
                onClick={closeTo("departments")}
                className={cancelBtnClass}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {skillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-hr-surface p-8 shadow-card"
            dir={dir}
          >
            <ModalTitleBar
              title={
                skillModal === "add"
                  ? t("hr.skills.modals.addTitle")
                  : t("hr.skills.modals.editTitle")
              }
              onClose={closeSkillModal}
              disabled={skillSaving}
            />

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  {t("hr.skills.modals.typeLabel")}
                </label>
                <input
                  value={skillType}
                  onChange={(e) => setSkillType(e.target.value)}
                  placeholder="Languages"
                  className="h-11 w-full rounded-lg border border-hr-border px-3 text-sm outline-none focus:border-hr-primary"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-hr-text">
                  {t("hr.skills.modals.skillsLabel")}
                </p>
                <div className="space-y-2">
                  {skillsList.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center gap-2 rounded-lg border border-hr-border px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSkillsList((prev) =>
                            prev.filter((row) => row.id !== skill.id),
                          )
                        }
                        className="text-red-400"
                        aria-label={t("hr.skills.modals.deleteSkill")}
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <input
                        value={skill.value}
                        onChange={(e) =>
                          setSkillsList((prev) =>
                            prev.map((row) =>
                              row.id === skill.id
                                ? { ...row, value: e.target.value }
                                : row,
                            ),
                          )
                        }
                        className="h-8 flex-1 border-0 bg-transparent px-1 text-sm outline-none"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setSkillsList((prev) => [
                        ...prev,
                        createSkillDraftRow(""),
                      ])
                    }
                    className="inline-flex items-center gap-1 rounded-lg bg-hr-accent-bg px-3 py-1.5 text-sm font-medium text-hr-accent-text transition hover:opacity-90"
                  >
                    <Plus className="size-4" />
                    {t("hr.skills.modals.addSkillToList")}
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-hr-text">
                  {t("hr.skills.modals.skillLevelsLabel")}
                </p>
                <div className="overflow-hidden rounded-lg border border-hr-border">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-hr-table-head text-xs text-hr-muted">
                      <tr>
                        <th className="w-10 px-2 py-2 text-center font-medium" />
                        <th className="px-2 py-2 text-start font-medium">
                          {t("hr.skills.modals.levelName")}
                        </th>
                        <th className="px-2 py-2 text-start font-medium">
                          {t("hr.skills.modals.progress")}
                        </th>
                        <th className="w-14 px-2 py-2 text-center font-medium">
                          {t("hr.skills.modals.levelColumn")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {skillLevels.map((level) => (
                        <tr
                          key={level.id}
                          className="border-t border-hr-border"
                        >
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              className="text-red-400"
                              onClick={() =>
                                setSkillLevels((prev) =>
                                  prev.filter((row) => row.id !== level.id),
                                )
                              }
                              aria-label={t("hr.skills.modals.deleteLevel")}
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              value={level.name}
                              onChange={(e) =>
                                setSkillLevels((prev) =>
                                  prev.map((row) =>
                                    row.id === level.id
                                      ? { ...row, name: e.target.value }
                                      : row,
                                  ),
                                )
                              }
                              placeholder="A1"
                              className="h-8 w-full rounded border border-transparent bg-transparent px-2 text-sm outline-none focus:border-hr-primary"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={level.progress}
                              onChange={(e) =>
                                setSkillLevels((prev) =>
                                  prev.map((row) =>
                                    row.id === level.id
                                      ? {
                                          ...row,
                                          progress: Number(e.target.value),
                                        }
                                      : row,
                                  ),
                                )
                              }
                              className="h-2 w-full accent-orange-400"
                            />
                          </td>
                          <td className="px-2 py-2 text-center text-sm font-medium text-orange-500">
                            {level.progress}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSkillLevels((prev) => [
                      ...prev,
                      createSkillLevelDraftRow(),
                    ])
                  }
                  className="mt-2 inline-flex items-center gap-1 rounded-lg bg-hr-accent-bg px-3 py-1.5 text-sm font-medium text-hr-accent-text transition hover:opacity-90"
                >
                  <Plus className="size-4" />
                  {t("hr.skills.modals.addLevel")}
                </button>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={
                  skillModal === "add" ? handleSaveSkill : handleUpdateSkill
                }
                disabled={skillSaving}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {skillSaving
                  ? skillModal === "add"
                    ? t("hr.skills.submit.adding")
                    : t("common.saving")
                  : skillModal === "add"
                    ? t("hr.skills.submit.add")
                    : t("hr.skills.submit.save")}
              </button>
              <button
                type="button"
                onClick={closeSkillModal}
                className={cancelBtnClass}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
