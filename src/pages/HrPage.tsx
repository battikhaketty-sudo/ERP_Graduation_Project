import {
  Briefcase,
  CheckCircle,
  FileX,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { DateTimeInput } from "../components/ui/DateTimeInput";
import { CopyableIdCell } from "../components/ui/CopyableIdCell";
import { TableRowIndex } from "../components/ui/TableRowIndex";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { prependUniqueRecord } from "../utils/listOrder";
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
import { WorkSchedulePanel } from "../components/WorkSchedulePanel";
import { Pagination } from "../components/Pagination";

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

const sectionButtons: { key: HrSection; label: string }[] = [
  { key: "contracts", label: "إدارة أنواع العقود" },
  { key: "workSchedules", label: "إدارة جدول العمل" },
  { key: "skills", label: "إدارة المهارات" },
  { key: "departments", label: "إدارة الأقسام" },
  { key: "attendance", label: "الحضور والدوام" },
];

const attendanceStatusClasses: Record<string, string> = {
  مقبول: "bg-[#D4F5E2] text-[#1F8A4C]",
  مرفوض: "bg-[#FDE2E2] text-[#D64545]",
  معلق: "bg-[#FFF3CD] text-[#B8860B]",
  متأخر: "bg-[#D4F0F5] text-[#2A8FA8]",
  Approved: "bg-[#D4F5E2] text-[#1F8A4C]",
  Refused: "bg-[#FDE2E2] text-[#D64545]",
  Pending: "bg-[#FFF3CD] text-[#B8860B]",
  Late: "bg-[#D4F0F5] text-[#2A8FA8]",
  حاضر: "bg-[#D4F5E2] text-[#1F8A4C]",
  إجازة: "bg-[#FDE2E2] text-[#D64545]",
};

const attendanceStatusFilterOptions = [
  { value: "", label: "فلترة حسب حالة الحضور" },
  { value: "0", label: "معلق" },
  { value: "1", label: "مقبول" },
  { value: "2", label: "مرفوض" },
  { value: "3", label: "متأخر" },
];

const ATTENDANCE_ACTION_MENU_HEIGHT = 176;
const ATTENDANCE_ACTION_MENU_WIDTH = 170;
const VIEWPORT_EDGE_PADDING = 8;

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
  "bg-pink-100 text-pink-700",
  "bg-orange-100 text-orange-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
];

const skillLevelOrder = ["C2", "C1", "B2", "B1", "A2", "A1"];

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
    Marketing: "bg-pink-100 text-pink-700",
    "Programming languages": "bg-orange-100 text-orange-700",
    "Programming Lanuages": "bg-orange-100 text-orange-700",
    "Soft skills": "bg-green-100 text-green-700",
    IT: "bg-purple-100 text-purple-700",
    Languages: "bg-blue-100 text-blue-700",
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

export function HrPage() {
  const { confirm } = useConfirmDialog();
  const { user } = useAuth();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<HrSection>("contracts");
  const [search, setSearch] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [selectedContractIds, setSelectedContractIds] = useState<Set<string>>(
    new Set(),
  );
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  const [newContractName, setNewContractName] = useState("");
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
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceTotalPages, setAttendanceTotalPages] = useState(1);
  const [checkInSaving, setCheckInSaving] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const actionMenuTriggerRef = useRef<HTMLButtonElement | null>(null);

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
        const message =
          err instanceof Error
            ? err.message
            : (err as { message?: string })?.message || "تعذر تحميل الأقسام";
        setApiNotice(message);
      }
    },
    [departmentSearch],
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
        const message =
          err instanceof Error
            ? err.message
            : (err as { message?: string })?.message ||
              "تعذر تحميل سجلات الحضور";
        setApiNotice(message);
      }
    },
    [attendanceDateFrom, attendanceDateTo, attendanceSearch, attendanceStatusFilter],
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
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
            "تعذر تحميل بيانات HR من API";
      setApiNotice(message);
    }
  }, [loadEmployeeStats]);

  useEffect(() => {
    loadHrData();
  }, [loadHrData]);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (actionMenuRef.current?.contains(target)) return;
      if (actionMenuTriggerRef.current?.contains(target)) return;
      setOpenActionMenuId(null);
      setActionMenuPosition(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!openActionMenuId) return;

    const closeMenu = () => {
      setOpenActionMenuId(null);
      setActionMenuPosition(null);
    };

    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [openActionMenuId]);

  const closeActionMenu = () => {
    setOpenActionMenuId(null);
    setActionMenuPosition(null);
  };

  const toggleActionMenu = (id: string, button: HTMLButtonElement) => {
    if (openActionMenuId === id) {
      closeActionMenu();
      return;
    }

    const rect = button.getBoundingClientRect();
    actionMenuTriggerRef.current = button;

    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove =
      spaceBelow < ATTENDANCE_ACTION_MENU_HEIGHT + VIEWPORT_EDGE_PADDING;

    let top = openAbove
      ? rect.top - ATTENDANCE_ACTION_MENU_HEIGHT - 4
      : rect.bottom + 4;
    top = Math.max(
      VIEWPORT_EDGE_PADDING,
      Math.min(
        top,
        window.innerHeight -
          ATTENDANCE_ACTION_MENU_HEIGHT -
          VIEWPORT_EDGE_PADDING,
      ),
    );

    const left = Math.min(
      Math.max(VIEWPORT_EDGE_PADDING, rect.right - ATTENDANCE_ACTION_MENU_WIDTH),
      window.innerWidth - ATTENDANCE_ACTION_MENU_WIDTH - VIEWPORT_EDGE_PADDING,
    );

    setOpenActionMenuId(id);
    setActionMenuPosition({ top, left });
  };

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
          ? "هل أنت متأكد من حذف نوع العقد؟"
          : `هل أنت متأكد من حذف ${ids.length} أنواع عقود؟`,
    });
    if (!confirmed) return;

    try {
      await Promise.all(ids.map((id) => deleteContractType(id)));
      setContracts((prev) => prev.filter((item) => !ids.includes(item.id)));
      setSelectedContractIds(new Set());
      setApiNotice(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "فشل حذف نوع العقد";
      setApiNotice(message);
    }
  };

  useEffect(() => {
    if (!skillGroups.length) {
      setSelectedSkillTypeId(null);
      return;
    }

    if (
      !selectedSkillTypeId ||
      !skillGroups.some((group) => group.id === selectedSkillTypeId)
    ) {
      setSelectedSkillTypeId(skillGroups[0].id);
    }
  }, [skillGroups, selectedSkillTypeId]);

  const selectedSkillGroup = useMemo(
    () => skillGroups.find((group) => group.id === selectedSkillTypeId) ?? null,
    [skillGroups, selectedSkillTypeId],
  );

  const displayedSkills = selectedSkillGroup?.skills ?? [];

  const displayedSkillLevels = useMemo(() => {
    const levels = selectedSkillGroup?.levels ?? [];

    return [...levels].sort((a, b) => {
      const aIndex = skillLevelOrder.indexOf(a.name);
      const bIndex = skillLevelOrder.indexOf(b.name);
      if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [selectedSkillGroup]);

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
      group.levels.map((level) =>
        createSkillLevelDraftRow(level.name, level.progress, level.id),
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
      setApiNotice("يرجى إدخال نوع المهارة.");
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
      setApiNotice(getThrownErrorMessage(err, "فشل إضافة المهارة"));
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
      setApiNotice("يرجى إدخال نوع المهارة.");
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
      setApiNotice(getThrownErrorMessage(err, "فشل تعديل نوع المهارة"));
    } finally {
      setSkillSaving(false);
    }
  };

  const handleDeleteSkillType = async (id: string) => {
    const confirmed = await confirm({
      message: "هل أنت متأكد من حذف نوع المهارة؟",
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
      setApiNotice(getThrownErrorMessage(err, "فشل حذف نوع المهارة"));
    }
  };

  const handleAddContract = async () => {
    const name = newContractName.trim();
    if (!name) return;

    try {
      const created = await addContractType(name);
      setContracts((prev) => prependUniqueRecord(prev, created));
      setApiNotice(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "فشل إضافة نوع العقد";
      setApiNotice(message);
      return;
    }

    setNewContractName("");
    setContractModal(null);
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
      setApiNotice(getThrownErrorMessage(err, "فشل تحديث نوع العقد"));
      return;
    }

    setEditingContractId(null);
    setEditContractName("");
    setContractModal(null);
  };

  const handleSaveDepartment = async (mode: "add" | "edit") => {
    const form = mode === "add" ? addDepartmentForm : departmentForm;

    if (!form.name.trim()) {
      setApiNotice("يرجى إدخال اسم القسم.");
      return;
    }

    if (!form.managerId.trim()) {
      setApiNotice("يرجى اختيار مدير القسم.");
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
        setDepartmentPage(1);
        await loadDepartments(1);
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
          mode === "edit" ? "فشل تحديث القسم" : "فشل إضافة القسم",
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
          ? "هل أنت متأكد من حذف هذا القسم؟"
          : `هل أنت متأكد من حذف ${ids.length} أقسام؟`,
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
      setApiNotice(getThrownErrorMessage(err, "فشل حذف القسم"));
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
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "فشل إضافة سجل الحضور";
      setApiNotice(message);
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
      setApiNotice(getThrownErrorMessage(err, "فشل تسجيل الدخول"));
    } finally {
      setCheckInSaving(false);
    }
  };

  const handleCheckOutRecord = async (record: AttendanceRecord) => {
    if (!record.checkInRaw || record.checkOutRaw) return;

    try {
      await checkOutAttendence(record.id);
      setApiNotice(null);
      await loadAttendance(attendancePage);
      await loadEmployeeStats();
    } catch (err) {
      setApiNotice(getThrownErrorMessage(err, "فشل تسجيل الخروج"));
    }
  };

  const handleDeleteAttendance = async (ids: string[]) => {
    if (!ids.length) return;

    const confirmed = await confirm({
      message:
        ids.length === 1
          ? "هل أنت متأكد من حذف سجل الحضور؟"
          : `هل أنت متأكد من حذف ${ids.length} سجلات حضور؟`,
    });
    if (!confirmed) return;

    try {
      await Promise.all(ids.map((id) => deleteAttendence(id)));
      setOpenActionMenuId(null);
      setApiNotice(null);
      await loadAttendance(attendancePage);
      await loadEmployeeStats();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "فشل حذف سجل الحضور";
      setApiNotice(message);
    }
  };

  const handleApproveAttendance = async (id: string) => {
    try {
      await approveAttendence(id);
      setOpenActionMenuId(null);
      setApiNotice(null);
      await loadAttendance(attendancePage);
      await loadEmployeeStats();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "فشل قبول السجل";
      setApiNotice(message);
    }
  };

  const handleRefuseAttendance = async (id: string) => {
    try {
      await refuseAttendence(id);
      setOpenActionMenuId(null);
      setApiNotice(null);
      await loadAttendance(attendancePage);
      await loadEmployeeStats();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "فشل رفض السجل";
      setApiNotice(message);
    }
  };

  const openEditAttendance = (record: AttendanceRecord) => {
    setEditingAttendanceId(record.id);
    setEditAttendanceForm({
      recordId: record.id,
      checkInAt: isoToDateTimeInput(record.checkInRaw),
      checkOutAt: isoToDateTimeInput(record.checkOutRaw),
    });
    setOpenActionMenuId(null);
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
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "فشل تعديل سجل الحضور";
      setApiNotice(message);
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
    <section className="rounded-xl border border-[#B8E4F2] bg-white p-4 shadow-card sm:p-5">
      <div className="mb-4 flex justify-end">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
          <input
            value={contractSearch}
            onChange={(e) => setContractSearch(e.target.value)}
            placeholder="ابحث عن اسم عقد معين"
            className="h-9 w-full rounded-lg border border-hr-border bg-white pe-3 ps-9 text-sm outline-none focus:border-hr-primary"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-hr-border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-[#F5FAFD] text-hr-muted">
            <tr>
              <th className="px-3 py-3 text-center font-medium">تحديد</th>
              <th className="px-3 py-3 text-center font-medium">#</th>
              <th className="px-3 py-3 text-center font-medium">id</th>
              <th className="px-3 py-3 text-start font-medium">اسم العقد</th>
              <th className="px-3 py-3 text-center font-medium">
                <button
                  type="button"
                  aria-label="حذف المحدد"
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
            {filteredContracts.map((item, idx) => (
              <tr
                key={item.id}
                className={idx % 2 ? "bg-[#F5FAFD]" : "bg-white"}
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
                      aria-label="تعديل"
                      onClick={() => openEditContract(item)}
                      className="rounded p-1 text-amber-500 transition hover:bg-amber-50 hover:text-amber-600"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => handleDeleteContracts([item.id])}
                      className="rounded p-1 text-red-400 transition hover:bg-red-50"
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

      <div className="mt-4 flex justify-start">
        <button
          type="button"
          onClick={() => setContractModal("add")}
          className="inline-flex items-center gap-2 rounded-lg bg-[#DDF1FA] px-4 py-2 text-sm font-medium text-[#3D7EA6] transition hover:bg-[#C8E9F7]"
        >
          <Plus className="size-4" />
          إضافة نوع عقد جديد
        </button>
      </div>
    </section>
  );

  const renderAttendance = () => {
    const openAttendanceRecord = attendance.find(
      (record) => record.id === openActionMenuId,
    );

    return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={attendanceStatusFilter}
            onChange={(e) => setAttendanceStatusFilter(e.target.value)}
            aria-label="فلترة حسب حالة الحضور"
            className="h-9 min-w-[190px] rounded-lg border border-hr-border bg-white px-3 text-sm text-hr-text outline-none focus:border-hr-primary"
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
              placeholder="ابحث عن اسم موظف"
              className="h-9 w-full rounded-lg border border-hr-border bg-white pe-3 ps-9 text-sm outline-none focus:border-hr-primary"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm text-hr-muted">من</span>
            <input
              type="date"
              value={attendanceDateFrom}
              onChange={(e) => setAttendanceDateFrom(e.target.value)}
              className="h-9 rounded-lg border border-hr-border bg-white px-2 text-sm outline-none focus:border-hr-primary"
              aria-label="من"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm text-hr-muted">إلى</span>
            <input
              type="date"
              value={attendanceDateTo}
              onChange={(e) => setAttendanceDateTo(e.target.value)}
              className="h-9 rounded-lg border border-hr-border bg-white px-2 text-sm outline-none focus:border-hr-primary"
              aria-label="إلى"
            />
          </div>
      </div>

    <section className="overflow-hidden rounded-xl border border-[#B8E4F2] bg-white shadow-card">
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-hr-border px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setActiveSection("addAttendanceModal")}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#DDF1FA] px-4 text-sm font-medium text-[#3D7EA6] transition hover:bg-[#C8E9F7]"
          >
            <Plus className="size-4" />
            إضافة سجل حضور
          </button>
          <button
            type="button"
            onClick={() => void handleCheckIn()}
            disabled={checkInSaving}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#FFF0D9] px-4 text-sm font-medium text-[#E09512] transition hover:bg-[#FFE8C4] disabled:opacity-60"
          >
            {checkInSaving ? "جاري التسجيل…" : "تسجيل دخول"}
          </button>
        </div>

      <div className="overflow-x-auto">
        <table className="w-full table-auto text-sm">
          <thead className="bg-[#F5FAFD] text-[11px] leading-tight text-hr-muted">
            <tr>
              <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                تسجيل خروج
              </th>
              <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                رقم السجل
              </th>
              <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                رقم الموظف
              </th>
              <th className="whitespace-nowrap px-2 py-2.5 text-start font-medium">
                اسم الموظف
              </th>
              <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                وقت الدخول
              </th>
              <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                وقت الخروج
              </th>
              <th className="whitespace-nowrap px-1 py-2.5 text-center font-medium">
                عدد ساعات العمل الكلي
              </th>
              <th className="whitespace-nowrap px-1 py-2.5 text-center font-medium">
                عدد ساعات العمل المطلوب
              </th>
              <th className="whitespace-nowrap px-2 py-2.5 text-center font-medium">
                الحالة
              </th>
              <th className="whitespace-nowrap px-1 py-2.5 text-center font-medium">
                <span className="sr-only">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((item, idx) => (
              <tr
                key={item.id}
                className={idx % 2 ? "bg-[#F5FAFD]" : "bg-white"}
              >
                <td className="px-2 py-2.5 text-center">
                  <input
                    type="checkbox"
                    className="size-4 rounded accent-hr-primary"
                    checked={!!item.checkOutRaw}
                    disabled={!item.checkInRaw || !!item.checkOutRaw}
                    onChange={(event) => {
                      if (event.target.checked) {
                        void handleCheckOutRecord(item);
                      }
                    }}
                    aria-label="تسجيل خروج"
                  />
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
                      "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-1 py-2.5 text-center">
                  <button
                    type="button"
                    aria-label="إجراءات"
                    aria-expanded={openActionMenuId === item.id}
                    onClick={(event) =>
                      toggleActionMenu(item.id, event.currentTarget)
                    }
                    className="rounded p-1 text-hr-muted hover:bg-gray-100"
                  >
                    <MoreVertical className="mx-auto size-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!attendance.length && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-8 text-center text-hr-muted"
                >
                  لا توجد سجلات حضور
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

      {openActionMenuId &&
        actionMenuPosition &&
        openAttendanceRecord &&
        createPortal(
          <div
            ref={actionMenuRef}
            dir="rtl"
            style={{
              position: "fixed",
              top: actionMenuPosition.top,
              left: actionMenuPosition.left,
              zIndex: 1000,
            }}
            className="min-w-[170px] rounded-lg bg-[#2F3B4C] py-2 text-sm text-white shadow-lg"
          >
            <button
              type="button"
              onClick={() => {
                closeActionMenu();
                void handleDeleteAttendance([openAttendanceRecord.id]);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-white/10"
            >
              <Trash2 className="size-4 text-red-400" />
              حذف السجل
            </button>
            <button
              type="button"
              onClick={() => {
                closeActionMenu();
                void handleApproveAttendance(openAttendanceRecord.id);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-white/10"
            >
              <CheckCircle className="size-4 text-green-400" />
              قبول السجل
            </button>
            <button
              type="button"
              onClick={() => {
                closeActionMenu();
                void handleRefuseAttendance(openAttendanceRecord.id);
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-white/10"
            >
              <FileX className="size-4 text-gray-300" />
              رفض السجل
            </button>
            <button
              type="button"
              onClick={() => openEditAttendance(openAttendanceRecord)}
              className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-white/10"
            >
              <Pencil className="size-4 text-amber-400" />
              تعديل السجل
            </button>
          </div>,
          document.body,
        )}
    </section>
    </>
    );
  };

  const renderDepartments = () => (
    <section className="rounded-xl border border-[#B8E4F2] bg-white p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setApiNotice(null);
            setAddDepartmentForm(emptyDepartmentForm);
            setActiveSection("addDepartmentModal");
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#DDF1FA] px-4 py-2 text-sm font-medium text-[#3D7EA6] transition hover:bg-[#C8E9F7]"
        >
          <Plus className="size-4" />
          إضافة قسم جديد
        </button>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
          <input
            value={departmentSearch}
            onChange={(e) => setDepartmentSearch(e.target.value)}
            placeholder="ابحث عن اسم قسم"
            className="h-9 w-full rounded-lg border border-hr-border bg-white pe-3 ps-9 text-sm outline-none focus:border-hr-primary"
          />
        </div>
      </div>

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
          <thead className="bg-[#F5FAFD] text-xs text-hr-muted">
            <tr>
              <th className="px-2 py-3 text-center font-medium">تحديد</th>
              <th className="px-2 py-3 text-center font-medium">#</th>
              <th className="px-2 py-3 text-center font-medium">id</th>
              <th className="px-2 py-3 text-start font-medium">اسم القسم</th>
              <th className="px-2 py-3 text-start font-medium">اسم قسم الأب</th>
              <th className="px-2 py-3 text-center font-medium">
                رقم مدير القسم
              </th>
              <th className="px-2 py-3 text-start font-medium">
                اسم مدير القسم
              </th>
              <th className="px-2 py-3 text-start font-medium">
                وصف مختصر عن وصف أساسي
              </th>
              <th className="px-3 py-3 text-center font-medium">
                <button
                  type="button"
                  aria-label="حذف المحدد"
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
                className={idx % 2 ? "bg-[#F5FAFD]" : "bg-white"}
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
                      aria-label="تعديل"
                      onClick={() => openEditDepartment(item)}
                      className="text-amber-500"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="حذف"
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
                  لا توجد أقسام
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
    <section className="rounded-xl border border-[#B8E4F2] bg-white p-4 shadow-card sm:p-5">
      <div className="relative pe-10">
        <div
          className="absolute bottom-6 end-3 top-6 w-px border-e-2 border-dashed border-[#B8E4F2]"
          aria-hidden
        />

        <div className="space-y-10">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm font-bold text-hr-text">نوع المهارة</p>
              <div className="flex flex-wrap gap-2">
                {skillGroups.length ? (
                  skillGroups.map((group, index) => {
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
                          aria-label={`تعديل ${group.name}`}
                          onClick={() => openEditSkillType(group)}
                          className="rounded p-0.5 text-amber-600 transition hover:bg-white/60"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`حذف ${group.name}`}
                          onClick={() => handleDeleteSkillType(group.id)}
                          className="rounded p-0.5 text-red-500 transition hover:bg-white/60 hover:text-red-600"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-hr-muted">
                    لا توجد أنواع مهارات
                  </span>
                )}
              </div>
            </div>
            <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DDF1FA] text-sm font-bold text-[#3D7EA6]">
              1
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm font-bold text-hr-text">
                المهارات
                {selectedSkillGroup ? (
                  <span className="ms-2 text-xs font-normal text-hr-muted">
                    ({selectedSkillGroup.name})
                  </span>
                ) : null}
              </p>
              {!selectedSkillGroup ? (
                <p className="text-sm text-hr-muted">
                  اختر نوع مهارة لعرض مهاراته
                </p>
              ) : displayedSkills.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {displayedSkills.map((skill) => (
                    <div
                      key={skill.id ?? skill.name}
                      className="rounded-lg bg-[#F7EEE7] px-3 py-5 text-center text-sm text-[#8B6F62]"
                    >
                      {skill.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-hr-muted">
                  لا توجد مهارات لهذا النوع
                </p>
              )}
            </div>
            <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DDF1FA] text-sm font-bold text-[#3D7EA6]">
              2
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm font-bold text-hr-text">
                مستوى المهارة
                {selectedSkillGroup ? (
                  <span className="ms-2 text-xs font-normal text-hr-muted">
                    ({selectedSkillGroup.name})
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-2">
                {!selectedSkillGroup ? (
                  <span className="text-sm text-hr-muted">
                    اختر نوع مهارة لعرض مستوياته
                  </span>
                ) : displayedSkillLevels.length ? (
                  displayedSkillLevels.map((level) => (
                    <span
                      key={level.id ?? level.name}
                      className="rounded-full bg-[#DDF1FA] px-4 py-1.5 text-sm font-medium text-[#3D7EA6]"
                      title={`${level.progress}%`}
                    >
                      {level.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-hr-muted">
                    لا توجد مستويات لهذا النوع
                  </span>
                )}
              </div>
            </div>
            <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DDF1FA] text-sm font-bold text-[#3D7EA6]">
              3
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-start">
        <button
          type="button"
          onClick={openAddSkillModal}
          className="inline-flex items-center gap-2 rounded-lg bg-[#DDF1FA] px-4 py-2 text-sm font-medium text-[#3D7EA6] transition hover:bg-[#C8E9F7]"
        >
          <Plus className="size-4" />
          إضافة مهارة جديدة
        </button>
      </div>
    </section>
  );

  return (
    <main
      className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-hr-bg px-6 py-6"
      dir="rtl"
    >
      <header className="mb-6 rounded-2xl bg-white p-5 shadow-card sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h1 className="shrink-0 text-xl font-bold text-hr-primary sm:text-[22px]">
            قسم{" "}
            <span className="font-medium text-hr-primary/80">
              ({departments.length})
            </span>{" "}
            | HR قسم
          </h1>
          <div className="relative w-full max-w-[420px] flex-1 sm:min-w-[280px]">
            <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-hr-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن قسم محدد"
              className="h-[45px] w-full rounded-full border border-hr-border bg-white pe-4 ps-11 text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
            />
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 items-center gap-4 rounded-2xl border border-hr-border bg-[#FAFCFE] px-5 py-4 sm:grid-cols-[minmax(0,1fr)_170px]">
          <div>
            <p className="mb-3 text-base font-bold text-hr-text">
              إحصائيات عن الموظفين
            </p>
            <div className="flex flex-wrap gap-6 sm:gap-8">
              <div className="flex flex-col items-center">
                <div className="flex size-14 items-center justify-center rounded-full border-4 border-[#7FC9E4] bg-white text-lg font-bold text-[#3FB4E5]">
                  {statsLoading && totalEmployees === null
                    ? "…"
                    : (totalEmployees ?? 0)}
                </div>
                <p className="mt-2 text-xs text-hr-muted">
                  إجمالي عدد الموظفين
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex size-14 items-center justify-center rounded-full border-4 border-[#7FC9E4] bg-white text-lg font-bold text-[#3FB4E5]">
                  {statsLoading && presentTodayCount === null
                    ? "…"
                    : (presentTodayCount ?? 0)}
                </div>
                <p className="mt-2 text-xs text-hr-muted">المتواجدون اليوم</p>
              </div>
            </div>
          </div>
          <div className="hidden items-center justify-center sm:flex">
            <div className="relative flex h-[140px] w-[170px] items-end justify-center rounded-2xl bg-gradient-to-b from-[#E8F6FC] to-[#D4EEF9] pb-4">
              <Briefcase className="size-16 text-[#3FB4E5]/80" />
            </div>
          </div>
        </div>

        {apiNotice && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiNotice}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {sectionButtons.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={[
                "inline-flex h-10 items-center rounded-lg px-5 text-sm font-medium transition",
                activeSection === section.key ||
                (activeSection === "addAttendanceModal" &&
                  section.key === "attendance") ||
                (activeSection === "editAttendanceModal" &&
                  section.key === "attendance")
                  ? "bg-[#5BB8E8] text-white shadow-sm"
                  : "bg-[#E9F6FC] text-[#3A6E86] hover:bg-[#D8EEF9]",
              ].join(" ")}
            >
              {section.label}
            </button>
          ))}
        </div>
      </header>

      {activeSection === "contracts" && renderContracts()}
      {activeSection === "workSchedules" && (
        <WorkSchedulePanel onNotice={setApiNotice} />
      )}
      {activeSection === "attendance" && renderAttendance()}
      {activeSection === "departments" && renderDepartments()}
      {activeSection === "skills" && renderSkills()}

      {contractModal === "add" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-lg rounded-xl bg-white p-8 shadow-card"
            dir="rtl"
          >
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">
              إضافة نوع عقد جديد
            </h3>
            <label className="mb-2 block text-sm text-hr-text">اسم العقد</label>
            <input
              value={newContractName}
              onChange={(e) => setNewContractName(e.target.value)}
              className="mb-8 h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
              placeholder="أدخل اسم نوع العقد"
            />
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleAddContract}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white"
              >
                إضافة العقد
              </button>
              <button
                type="button"
                onClick={closeContractModal}
                className="rounded-lg bg-gray-400 px-8 py-2.5 text-sm font-bold text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {contractModal === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-lg rounded-xl bg-white p-8 shadow-card"
            dir="rtl"
          >
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">
              تعديل نوع العقد
            </h3>
            <label className="mb-2 block text-sm text-hr-text">اسم العقد</label>
            <input
              value={editContractName}
              onChange={(e) => setEditContractName(e.target.value)}
              className="mb-8 h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
              placeholder="أدخل اسم نوع العقد"
              autoFocus
            />
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleUpdateContract}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white"
              >
                حفظ التعديلات
              </button>
              <button
                type="button"
                onClick={closeContractModal}
                className="rounded-lg bg-gray-400 px-8 py-2.5 text-sm font-bold text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "addAttendanceModal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-lg rounded-xl bg-white p-8 shadow-card"
            dir="rtl"
          >
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">
              إضافة سجل حضور
            </h3>
            <label className="mb-2 block text-sm text-hr-text">
              رقم الموظف
            </label>
            <input
              value={attendanceForm.employeeId}
              onChange={(e) =>
                setAttendanceForm((prev) => ({
                  ...prev,
                  employeeId: e.target.value,
                }))
              }
              className="mb-6 h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
            />
            <div className="mb-6">
              <label className="mb-2 block text-sm text-hr-text">
                وقت الدخول
              </label>
              <DateTimeInput
                value={attendanceForm.checkInAt}
                onChange={(value) =>
                  setAttendanceForm((prev) => ({ ...prev, checkInAt: value }))
                }
                aria-label="وقت الدخول"
              />
            </div>
            <div className="mb-8">
              <label className="mb-2 block text-sm text-hr-text">
                وقت الخروج
              </label>
              <DateTimeInput
                value={attendanceForm.checkOutAt}
                onChange={(value) =>
                  setAttendanceForm((prev) => ({ ...prev, checkOutAt: value }))
                }
                aria-label="وقت الخروج"
              />
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleAddAttendance}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white"
              >
                إضافة سجل الحضور
              </button>
              <button
                type="button"
                onClick={closeTo("attendance")}
                className="rounded-lg bg-gray-400 px-8 py-2.5 text-sm font-bold text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "editAttendanceModal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-lg rounded-xl bg-white p-8 shadow-card"
            dir="rtl"
          >
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">
              تعديل سجل حضور
            </h3>
            <label className="mb-2 block text-sm text-hr-text">رقم السجل</label>
            <input
              value={editAttendanceForm.recordId}
              readOnly
              className="mb-6 h-11 w-full rounded-lg border border-hr-border bg-gray-50 px-3 outline-none"
            />
            <div className="mb-6">
              <label className="mb-2 block text-sm text-hr-text">
                وقت الدخول
              </label>
              <DateTimeInput
                value={editAttendanceForm.checkInAt}
                onChange={(value) =>
                  setEditAttendanceForm((prev) => ({
                    ...prev,
                    checkInAt: value,
                  }))
                }
                aria-label="وقت الدخول"
              />
            </div>
            <div className="mb-8">
              <label className="mb-2 block text-sm text-hr-text">
                وقت الخروج
              </label>
              <DateTimeInput
                value={editAttendanceForm.checkOutAt}
                onChange={(value) =>
                  setEditAttendanceForm((prev) => ({
                    ...prev,
                    checkOutAt: value,
                  }))
                }
                aria-label="وقت الخروج"
              />
            </div>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleEditAttendance}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white"
              >
                حفظ التعديلات
              </button>
              <button
                type="button"
                onClick={closeTo("attendance")}
                className="rounded-lg bg-gray-400 px-8 py-2.5 text-sm font-bold text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "editDepartmentModal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-card"
            dir="rtl"
          >
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">
              تعديل قسم
            </h3>
            {apiNotice && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiNotice}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  رقم القسم
                </label>
                <input
                  value={departmentForm.departmentId}
                  readOnly
                  className="h-11 w-full rounded-lg border border-hr-border bg-gray-50 px-3 outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  اسم القسم
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
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  قسم الأب
                </label>
                <select
                  value={departmentForm.parentId}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({
                      ...prev,
                      parentId: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-hr-border bg-white px-3 outline-none focus:border-hr-primary"
                >
                  <option value="">بدون قسم أب</option>
                  {departmentOptions
                    .filter(
                      (department) =>
                        department.id !== departmentForm.departmentId,
                    )
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  مدير القسم
                </label>
                <select
                  value={departmentForm.managerId}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({
                      ...prev,
                      managerId: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-hr-border bg-white px-3 outline-none focus:border-hr-primary"
                >
                  <option value="">اختر المدير</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm text-hr-text">
                  وصف القسم
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
                {departmentSaving ? "جاري الحفظ…" : "تعديل معلومات القسم"}
              </button>
              <button
                type="button"
                onClick={closeTo("departments")}
                className="rounded-lg bg-gray-400 px-8 py-2.5 text-sm font-bold text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSection === "addDepartmentModal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-card"
            dir="rtl"
          >
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">
              إضافة قسم جديد
            </h3>
            {apiNotice && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiNotice}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  اسم القسم
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
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  قسم الأب
                </label>
                <select
                  value={addDepartmentForm.parentId}
                  onChange={(e) =>
                    setAddDepartmentForm((prev) => ({
                      ...prev,
                      parentId: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-hr-border bg-white px-3 outline-none focus:border-hr-primary"
                >
                  <option value="">بدون قسم أب</option>
                  {departmentOptions.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  مدير القسم
                </label>
                <select
                  value={addDepartmentForm.managerId}
                  onChange={(e) =>
                    setAddDepartmentForm((prev) => ({
                      ...prev,
                      managerId: e.target.value,
                    }))
                  }
                  className="h-11 w-full rounded-lg border border-hr-border bg-white px-3 outline-none focus:border-hr-primary"
                >
                  <option value="">اختر المدير</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="mb-2 block text-sm text-hr-text">
                  وصف القسم
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
                {departmentSaving ? "جاري الإضافة…" : "إضافة القسم"}
              </button>
              <button
                type="button"
                onClick={closeTo("departments")}
                className="rounded-lg bg-gray-400 px-8 py-2.5 text-sm font-bold text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {skillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-8 shadow-card"
            dir="rtl"
          >
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">
              {skillModal === "add" ? "إضافة مهارة جديدة" : "تعديل نوع المهارة"}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-hr-text">
                  نوع المهارة
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
                  المهارات
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
                        aria-label="حذف المهارة"
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
                    className="inline-flex items-center gap-1 rounded-lg bg-[#DDF1FA] px-3 py-1.5 text-sm font-medium text-[#3D7EA6] transition hover:bg-[#C8E9F7]"
                  >
                    <Plus className="size-4" />
                    إضافة مهارة للقائمة
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-hr-text">
                  مستويات المهارة
                </p>
                <div className="overflow-hidden rounded-lg border border-hr-border">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-[#F5FAFD] text-xs text-hr-muted">
                      <tr>
                        <th className="w-10 px-2 py-2 text-center font-medium" />
                        <th className="px-2 py-2 text-start font-medium">
                          اسم المستوى
                        </th>
                        <th className="px-2 py-2 text-start font-medium">
                          التقدم
                        </th>
                        <th className="w-14 px-2 py-2 text-center font-medium">
                          المستوى
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
                              aria-label="حذف المستوى"
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
                  className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#DDF1FA] px-3 py-1.5 text-sm font-medium text-[#3D7EA6] transition hover:bg-[#C8E9F7]"
                >
                  <Plus className="size-4" />
                  إضافة مستوى جديد
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
                    ? "جاري الإضافة…"
                    : "جاري الحفظ…"
                  : skillModal === "add"
                    ? "إضافة المهارة"
                    : "حفظ التعديلات"}
              </button>
              <button
                type="button"
                onClick={closeSkillModal}
                className="rounded-lg bg-gray-400 px-8 py-2.5 text-sm font-bold text-white"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
