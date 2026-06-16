import {
  Briefcase,
  CheckCircle,
  Clock,
  FileX,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  addAttendence,
  addContractType,
  addDepartment,
  addSkillType,
  approveAttendence,
  checkInAttendence,
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

type HrSection =
  | "contracts"
  | "workSchedules"
  | "attendance"
  | "departments"
  | "skills"
  | "addSkillModal"
  | "addContractModal"
  | "addAttendanceModal"
  | "editAttendanceModal"
  | "editDepartmentModal"
  | "addDepartmentModal";

const sectionButtons: { key: HrSection; label: string }[] = [
  { key: "contracts", label: "إدارة أنواع العقود" },
  { key: "workSchedules", label: "إدارة جدول العمل" },
  { key: "skills", label: "إدارة المهارات" },
  { key: "departments", label: "إدارة الأقسام" },
  { key: "attendance", label: "الحضور والغياب" },
];

const attendanceStatusClasses: Record<string, string> = {
  مقبول: "bg-green-100 text-green-700",
  مرفوض: "bg-pink-100 text-pink-700",
  معلق: "bg-yellow-100 text-yellow-700",
  متأخر: "bg-indigo-100 text-indigo-700",
  Approved: "bg-green-100 text-green-700",
  Refused: "bg-pink-100 text-pink-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Late: "bg-indigo-100 text-indigo-700",
  حاضر: "bg-green-100 text-green-700",
  إجازة: "bg-pink-100 text-pink-700",
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
  "bg-pink-100 text-pink-700",
  "bg-orange-100 text-orange-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
];

const skillLevelOrder = ["C2", "C1", "B2", "B1", "A2", "A1"];

const getSkillTypeClass = (name: string, index: number) => {
  const map: Record<string, string> = {
    Marketing: "bg-pink-100 text-pink-700",
    "Programming languages": "bg-orange-100 text-orange-700",
    "Soft skills": "bg-green-100 text-green-700",
    IT: "bg-purple-100 text-purple-700",
    Languages: "bg-blue-100 text-blue-700",
  };
  return map[name] || skillTypePillClasses[index % skillTypePillClasses.length];
};

const emptyEditAttendanceForm = {
  recordId: "",
  checkInFrom: "09:00 AM",
  checkInTo: "11:00 PM",
  checkOutFrom: "09:00 AM",
  checkOutTo: "11:00 PM",
};

const timeToIso = (time: string, baseDate = new Date()) => {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return baseDate.toISOString();

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

const isoToTimeLabel = (value?: string) => {
  if (!value) return "09:00 AM";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const displayHour = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return String(date.getHours());
};

const emptyAttendanceForm = {
  employeeId: "",
  checkInFrom: "09:00 AM",
  checkInTo: "11:00 PM",
  checkOutFrom: "09:00 AM",
  checkOutTo: "11:00 PM",
};

export function HrPage() {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<HrSection>("contracts");
  const [search, setSearch] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [selectedContractIds, setSelectedContractIds] = useState<Set<string>>(new Set());
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  const [newContractName, setNewContractName] = useState("");
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);
  const [addDepartmentForm, setAddDepartmentForm] = useState(emptyDepartmentForm);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<Set<string>>(new Set());
  const [departmentPage, setDepartmentPage] = useState(1);
  const [departmentTotalPages, setDepartmentTotalPages] = useState(1);
  const [departmentSaving, setDepartmentSaving] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [departmentOptions, setDepartmentOptions] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendanceForm);
  const [editAttendanceForm, setEditAttendanceForm] = useState(emptyEditAttendanceForm);
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceDateFrom, setAttendanceDateFrom] = useState("");
  const [attendanceDateTo, setAttendanceDateTo] = useState("");
  const [selectedAttendanceIds, setSelectedAttendanceIds] = useState<Set<string>>(new Set());
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceTotalPages, setAttendanceTotalPages] = useState(1);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  const [contracts, setContracts] = useState<ContractType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);

  const [skillType, setSkillType] = useState("Languages");
  const [skillsList, setSkillsList] = useState(["English", "French", "Arabic", "Italy"]);
  const [skillLevels, setSkillLevels] = useState([
    { name: "A1", progress: 81 },
    { name: "A2", progress: 42 },
    { name: "B1", progress: 51 },
    { name: "B2", progress: 82 },
  ]);
  const [skillSaving, setSkillSaving] = useState(false);
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [presentTodayCount, setPresentTodayCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadSkills = useCallback(async () => {
    const skillsData = await getSkillTypes();
    setSkillGroups(skillsData);
  }, []);

  const loadDepartments = useCallback(async (page = departmentPage) => {
    try {
      const { records, meta } = await getDepartments({
        page,
        limit: 10,
        name: departmentSearch.trim() || undefined,
      });

      setDepartments(records);
      setDepartmentPage(meta.currentPage || page);
      setDepartmentTotalPages(meta.totalPages || 1);
      setApiNotice(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "تعذر تحميل الأقسام";
      setApiNotice(message);
    }
  }, [departmentPage, departmentSearch]);

  const loadAttendance = useCallback(async (page = attendancePage) => {
    try {
      const from = attendanceDateFrom || undefined;
      const to = attendanceDateTo || undefined;

      const { records, meta } = await getAttendences({
        page,
        limit: 10,
        employeeName: attendanceSearch.trim() || undefined,
        from,
        to,
      });

      setAttendance(records);
      setAttendancePage(meta.currentPage || page);
      setAttendanceTotalPages(meta.totalPages || 1);
      setApiNotice(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "تعذر تحميل سجلات الحضور";
      setApiNotice(message);
    }
  }, [attendanceDateFrom, attendanceDateTo, attendanceSearch]);

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
      const todayAttendance = await getAttendences({ page: 1, limit: 100, from, to });

      const uniquePresent = new Set(
        todayAttendance.records
          .filter((record) => record.checkInRaw)
          .map((record) => record.employeeId),
      );

      setPresentTodayCount(uniquePresent.size || todayAttendance.meta.totalItems || 0);
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
          : (err as { message?: string })?.message || "تعذر تحميل بيانات HR من API";
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
    if (
      activeSection !== "departments" &&
      activeSection !== "addDepartmentModal" &&
      activeSection !== "editDepartmentModal"
    ) {
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
  }, [activeSection, attendanceSearch, attendanceDateFrom, attendanceDateTo, loadAttendance]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const displayedSkills = useMemo(
    () => [...new Set(skillGroups.flatMap((group) => group.skills))],
    [skillGroups],
  );

  const displayedSkillLevels = useMemo(() => {
    const levels = [
      ...new Set(skillGroups.flatMap((group) => group.levels.map((level) => level.name))),
    ];

    return levels.sort((a, b) => {
      const aIndex = skillLevelOrder.indexOf(a);
      const bIndex = skillLevelOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [skillGroups]);

  const closeTo = (section: HrSection) => () => setActiveSection(section);

  const handleSaveSkill = async () => {
    const trimmedType = skillType.trim();
    const trimmedSkills = skillsList.map((s) => s.trim()).filter(Boolean);

    if (!trimmedType) {
      setApiNotice("يرجى إدخال نوع المهارة.");
      return;
    }

    if (!trimmedSkills.length) {
      setApiNotice("يرجى إضافة مهارة واحدة على الأقل.");
      return;
    }

    if (
      skillGroups.some((group) => group.name.toLowerCase() === trimmedType.toLowerCase())
    ) {
      setApiNotice("اسم نوع المهارة موجود مسبقاً.");
      return;
    }

    setSkillSaving(true);
    try {
      await addSkillType({
        name: trimmedType,
        skillNames: trimmedSkills,
        skillLevels: skillLevels.map((level) => ({
          name: level.name,
          progress: level.progress,
        })),
      });
      await loadSkills();
      setApiNotice(null);
      setActiveSection("skills");
    } catch (err) {
      setApiNotice(getThrownErrorMessage(err, "فشل إضافة المهارة"));
      return;
    } finally {
      setSkillSaving(false);
    }
  };

  const handleDeleteSkillType = async (id: string) => {
    try {
      await deleteSkillType(id);
      setSkillGroups((prev) => prev.filter((group) => group.id !== id));
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
      setContracts((prev) => [...prev, created]);
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
    setActiveSection("contracts");
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
      } else {
        await addDepartment(payload);
      }

      await loadDepartments(departmentPage);
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

    const hasChildDepartments = ids.some((id) =>
      departments.some((department) => department.parentId === id),
    );

    if (hasChildDepartments) {
      setApiNotice("لا يمكن حذف قسم يحتوي على أقسام فرعية. احذف الأقسام الفرعية أولاً.");
      return;
    }

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

  const departmentPageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = Math.max(departmentTotalPages, 1);
    for (let i = 1; i <= max; i += 1) pages.push(i);
    return pages.slice(0, 5);
  }, [departmentTotalPages]);

  const handleAddAttendance = async () => {
    if (!attendanceForm.employeeId.trim()) return;

    const today = new Date();
    const checkin = timeToIso(attendanceForm.checkInFrom, today);
    const checkout = timeToIso(attendanceForm.checkOutFrom, today);

    try {
      await addAttendence({
        employeeId: attendanceForm.employeeId.trim(),
        checkin,
        checkout,
      });
      setApiNotice(null);
      await loadAttendance(attendancePage);
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

  const handleCheckIn = async () => {
    try {
      await checkInAttendence();
      setApiNotice(null);
      await loadAttendance(attendancePage);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || "فشل تسجيل الدخول";
      setApiNotice(message);
    }
  };

  const toggleAttendanceSelection = (id: string) => {
    setSelectedAttendanceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteAttendance = async (ids: string[]) => {
    if (!ids.length) return;

    try {
      await Promise.all(ids.map((id) => deleteAttendence(id)));
      setSelectedAttendanceIds(new Set());
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
      checkInFrom: isoToTimeLabel(record.checkInRaw),
      checkInTo: "11:00 PM",
      checkOutFrom: isoToTimeLabel(record.checkOutRaw),
      checkOutTo: "11:00 PM",
    });
    setOpenActionMenuId(null);
    setActiveSection("editAttendanceModal");
  };

  const handleEditAttendance = async () => {
    if (!editingAttendanceId) return;

    const today = new Date();
    const checkin = timeToIso(editAttendanceForm.checkInFrom, today);
    const checkout = timeToIso(editAttendanceForm.checkOutFrom, today);

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

  const attendancePageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = Math.max(attendanceTotalPages, 1);
    for (let i = 1; i <= max; i += 1) pages.push(i);
    return pages.slice(0, 5);
  }, [attendanceTotalPages]);

  const TimeField = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div>
      <label className="mb-2 block text-sm text-hr-text">{label}</label>
      <div className="relative">
        <Clock className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="09:00 AM"
          className="h-11 w-full rounded-lg border border-hr-border pe-3 ps-10 outline-none focus:border-hr-primary"
        />
      </div>
    </div>
  );

  const AttendanceTimeRange = ({
    title,
    fromValue,
    toValue,
    onFromChange,
    onToChange,
  }: {
    title: string;
    fromValue: string;
    toValue: string;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
  }) => (
    <div>
      <p className="mb-3 text-sm font-medium text-hr-text">{title}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TimeField label="من" value={fromValue} onChange={onFromChange} />
        <TimeField label="إلى" value={toValue} onChange={onToChange} />
      </div>
    </div>
  );

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
              <th className="px-3 py-3 text-start font-medium">رقم العقد</th>
              <th className="px-3 py-3 text-start font-medium">اسم العقد</th>
              <th className="px-3 py-3 text-center font-medium">
                <button
                  type="button"
                  aria-label="حذف المحدد"
                  onClick={() => handleDeleteContracts([...selectedContractIds])}
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
              <tr key={item.id} className={idx % 2 ? "bg-[#F5FAFD]" : "bg-white"}>
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-hr-primary"
                    checked={selectedContractIds.has(item.id)}
                    onChange={() => toggleContractSelection(item.id)}
                  />
                </td>
                <td className="px-3 py-3 text-hr-text">{idx + 1}</td>
                <td className="px-3 py-3 text-hr-text">{item.name}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => handleDeleteContracts([item.id])}
                      className="text-red-400"
                    >
                      <Trash2 className="size-4" />
                    </button>
                    <button type="button" aria-label="تعديل" className="text-amber-500">
                      <Pencil className="size-4" />
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
          onClick={() => setActiveSection("addContractModal")}
          className="inline-flex items-center gap-2 rounded-lg bg-[#DDF1FA] px-4 py-2 text-sm font-medium text-[#3D7EA6] transition hover:bg-[#C8E9F7]"
        >
          <Plus className="size-4" />
          إضافة نوع عقد جديد
        </button>
      </div>
    </section>
  );

  const renderAttendance = () => (
    <section className="rounded-xl border border-[#B8E4F2] bg-white p-4 shadow-card sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full min-w-[180px] sm:w-56">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
            <input
              value={attendanceSearch}
              onChange={(e) => setAttendanceSearch(e.target.value)}
              placeholder="ابحث عن موظف"
              className="h-9 w-full rounded-lg border border-hr-border bg-white pe-3 ps-9 text-sm outline-none focus:border-hr-primary"
            />
          </div>
          <input
            type="date"
            value={attendanceDateFrom}
            onChange={(e) => setAttendanceDateFrom(e.target.value)}
            className="h-9 rounded-lg border border-hr-border px-3 text-sm outline-none focus:border-hr-primary"
            aria-label="من"
          />
          <input
            type="date"
            value={attendanceDateTo}
            onChange={(e) => setAttendanceDateTo(e.target.value)}
            className="h-9 rounded-lg border border-hr-border px-3 text-sm outline-none focus:border-hr-primary"
            aria-label="إلى"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSection("addAttendanceModal")}
            className="inline-flex items-center gap-2 rounded-lg bg-hr-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-hr-primary-hover"
          >
            <Plus className="size-4" />
            إضافة سجل حضور
          </button>
          <button
            type="button"
            onClick={handleCheckIn}
            className="inline-flex items-center gap-2 rounded-lg bg-[#F5A623] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#E09512]"
          >
            <Plus className="size-4" />
            إضافة تسجيل دخول
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-hr-border">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-10" />
            <col className="w-12" />
            <col className="w-[10%]" />
            <col />
            <col className="w-12" />
            <col className="w-12" />
            <col className="w-14" />
            <col className="w-14" />
            <col className="w-16" />
            <col className="w-12" />
          </colgroup>
          <thead className="bg-[#F5FAFD] text-xs text-hr-muted">
            <tr>
              <th className="px-3 py-3 text-center font-medium">تحديد</th>
              <th className="px-3 py-3 text-center font-medium">تسلسل</th>
              <th className="px-3 py-3 text-start font-medium">رقم السجل</th>
              <th className="px-3 py-3 text-start font-medium">اسم الموظف</th>
              <th className="px-3 py-3 text-center font-medium">وقت الدخول</th>
              <th className="px-3 py-3 text-center font-medium">وقت الخروج</th>
              <th className="px-3 py-3 text-center font-medium">عدد ساعات العمل الكلي</th>
              <th className="px-3 py-3 text-center font-medium">عدد ساعات العمل المطلوب</th>
              <th className="px-3 py-3 text-center font-medium">الحالة</th>
              <th className="px-3 py-3 text-center font-medium">
                <button
                  type="button"
                  aria-label="حذف المحدد"
                  onClick={() => handleDeleteAttendance([...selectedAttendanceIds])}
                  className="text-red-400 disabled:opacity-40"
                  disabled={!selectedAttendanceIds.size}
                >
                  <Trash2 className="mx-auto size-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((item, idx) => (
              <tr key={item.id} className={idx % 2 ? "bg-[#F5FAFD]" : "bg-white"}>
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-hr-primary"
                    checked={selectedAttendanceIds.has(item.id)}
                    onChange={() => toggleAttendanceSelection(item.id)}
                  />
                </td>
                <td className="px-3 py-3 text-center text-hr-text">
                  {(attendancePage - 1) * 10 + idx + 1}
                </td>
                <td className="truncate px-2 py-3 text-hr-text" title={item.id}>
                  {item.id}
                </td>
                <td className="truncate px-2 py-3 text-hr-text" title={item.employeeName}>
                  {item.employeeName}
                </td>
                <td className="px-3 py-3 text-center text-hr-text">
                  {displayHour(item.checkInRaw)}
                </td>
                <td className="px-3 py-3 text-center text-hr-text">
                  {displayHour(item.checkOutRaw)}
                </td>
                <td className="px-3 py-3 text-center text-hr-text">
                  {item.totalWorkHours ?? "-"}
                </td>
                <td className="px-3 py-3 text-center text-hr-text">
                  {item.requiredWorkHours ?? 8}
                </td>
                <td className="px-3 py-3 text-center">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      attendanceStatusClasses[item.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="relative px-3 py-3 text-center">
                  <button
                    type="button"
                    aria-label="إجراءات"
                    onClick={() =>
                      setOpenActionMenuId((prev) => (prev === item.id ? null : item.id))
                    }
                    className="rounded p-1 text-hr-muted hover:bg-gray-100"
                  >
                    <MoreVertical className="mx-auto size-4" />
                  </button>
                  {openActionMenuId === item.id && (
                    <div
                      ref={actionMenuRef}
                      className="absolute end-2 top-10 z-20 min-w-[170px] rounded-lg bg-[#2F3B4C] py-2 text-sm text-white shadow-lg"
                    >
                      <button
                        type="button"
                        onClick={() => handleDeleteAttendance([item.id])}
                        className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-white/10"
                      >
                        <Trash2 className="size-4 text-red-400" />
                        حذف السجل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApproveAttendance(item.id)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-white/10"
                      >
                        <CheckCircle className="size-4 text-green-400" />
                        قبول السجل
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefuseAttendance(item.id)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-white/10"
                      >
                        <FileX className="size-4 text-gray-300" />
                        رفض السجل
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditAttendance(item)}
                        className="flex w-full items-center gap-2 px-4 py-2 text-start hover:bg-white/10"
                      >
                        <Pencil className="size-4 text-amber-400" />
                        تعديل السجل
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!attendance.length && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-hr-muted">
                  لا توجد سجلات حضور
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => attendancePage > 1 && loadAttendance(attendancePage - 1)}
          disabled={attendancePage <= 1}
          className="rounded px-2 py-1 text-hr-muted disabled:opacity-40"
        >
          ‹
        </button>
        {attendancePageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => loadAttendance(page)}
            className={[
              "size-8 rounded-full text-sm",
              page === attendancePage
                ? "bg-hr-primary text-white"
                : "text-hr-muted hover:bg-gray-100",
            ].join(" ")}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            attendancePage < attendanceTotalPages && loadAttendance(attendancePage + 1)
          }
          disabled={attendancePage >= attendanceTotalPages}
          className="rounded px-2 py-1 text-hr-muted disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </section>
  );

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
              <th className="px-2 py-3 text-center font-medium">رقم القسم</th>
              <th className="px-2 py-3 text-start font-medium">اسم القسم</th>
              <th className="px-2 py-3 text-start font-medium">اسم قسم الأب</th>
              <th className="px-2 py-3 text-center font-medium">رقم مدير القسم</th>
              <th className="px-2 py-3 text-start font-medium">اسم مدير القسم</th>
              <th className="px-2 py-3 text-start font-medium">وصف مختصر عن وصف أساسي</th>
              <th className="px-3 py-3 text-center font-medium">
                <button
                  type="button"
                  aria-label="حذف المحدد"
                  onClick={() => handleDeleteDepartments([...selectedDepartmentIds])}
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
              <tr key={item.id} className={idx % 2 ? "bg-[#F5FAFD]" : "bg-white"}>
                <td className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-hr-primary"
                    checked={selectedDepartmentIds.has(item.id)}
                    onChange={() => toggleDepartmentSelection(item.id)}
                  />
                </td>
                <td className="px-3 py-3 text-center text-hr-text">
                  {(departmentPage - 1) * 10 + idx + 1}
                </td>
                <td className="truncate px-2 py-3 text-hr-text" title={item.name}>
                  {item.name}
                </td>
                <td className="truncate px-2 py-3 text-hr-text" title={item.parentName || undefined}>
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

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => departmentPage > 1 && loadDepartments(departmentPage - 1)}
          disabled={departmentPage <= 1}
          className="rounded px-2 py-1 text-hr-muted disabled:opacity-40"
        >
          ‹
        </button>
        {departmentPageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => loadDepartments(page)}
            className={[
              "size-8 rounded-full text-sm",
              page === departmentPage
                ? "bg-hr-primary text-white"
                : "text-hr-muted hover:bg-gray-100",
            ].join(" ")}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() =>
            departmentPage < departmentTotalPages && loadDepartments(departmentPage + 1)
          }
          disabled={departmentPage >= departmentTotalPages}
          className="rounded px-2 py-1 text-hr-muted disabled:opacity-40"
        >
          ›
        </button>
      </div>
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
                  skillGroups.map((group, index) => (
                    <span
                      key={group.id}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium ${getSkillTypeClass(group.name, index)}`}
                    >
                      {group.name}
                      <button
                        type="button"
                        aria-label={`حذف ${group.name}`}
                        onClick={() => handleDeleteSkillType(group.id)}
                        className="text-red-500 transition hover:text-red-600"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-hr-muted">لا توجد أنواع مهارات</span>
                )}
              </div>
            </div>
            <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DDF1FA] text-sm font-bold text-[#3D7EA6]">
              1
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm font-bold text-hr-text">المهارات</p>
              {displayedSkills.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {displayedSkills.map((skill) => (
                    <div
                      key={skill}
                      className="rounded-lg bg-[#F7EEE7] px-3 py-5 text-center text-sm text-[#8B6F62]"
                    >
                      {skill}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-hr-muted">لا توجد مهارات</p>
              )}
            </div>
            <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#DDF1FA] text-sm font-bold text-[#3D7EA6]">
              2
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-sm font-bold text-hr-text">مستوى المهارة</p>
              <div className="flex flex-wrap gap-2">
                {displayedSkillLevels.length ? (
                  displayedSkillLevels.map((level) => (
                    <span
                      key={level}
                      className="rounded-full bg-[#DDF1FA] px-4 py-1.5 text-sm font-medium text-[#3D7EA6]"
                    >
                      {level}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-hr-muted">لا توجد مستويات</span>
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
          onClick={() => setActiveSection("addSkillModal")}
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
            <span className="font-medium text-hr-primary/80">({departments.length})</span> | HR قسم
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
            <p className="mb-3 text-base font-bold text-hr-text">إحصائيات عن الموظفين</p>
            <div className="flex flex-wrap gap-6 sm:gap-8">
              <div className="flex flex-col items-center">
                <div className="flex size-14 items-center justify-center rounded-full border-4 border-[#7FC9E4] bg-white text-lg font-bold text-[#3FB4E5]">
                  {statsLoading && totalEmployees === null ? "…" : (totalEmployees ?? 0)}
                </div>
                <p className="mt-2 text-xs text-hr-muted">إجمالي عدد الموظفين</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex size-14 items-center justify-center rounded-full border-4 border-[#7FC9E4] bg-white text-lg font-bold text-[#3FB4E5]">
                  {statsLoading && presentTodayCount === null ? "…" : (presentTodayCount ?? 0)}
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
                "inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium transition",
                activeSection === section.key
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

      {activeSection === "addContractModal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-card" dir="rtl">
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">
              إضافة نوع عقد جديد
            </h3>
            <label className="mb-2 block text-sm text-hr-text">رقم العقد</label>
            <input
              value={newContractName}
              onChange={(e) => setNewContractName(e.target.value)}
              className="mb-8 h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
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
                onClick={closeTo("contracts")}
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
          <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-card" dir="rtl">
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">
              إضافة سجل حضور
            </h3>
            <label className="mb-2 block text-sm text-hr-text">رقم الموظف</label>
            <input
              value={attendanceForm.employeeId}
              onChange={(e) =>
                setAttendanceForm((prev) => ({ ...prev, employeeId: e.target.value }))
              }
              className="mb-6 h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
            />
            <div className="mb-6">
              <AttendanceTimeRange
                title="وقت الحضور"
                fromValue={attendanceForm.checkInFrom}
                toValue={attendanceForm.checkInTo}
                onFromChange={(value) =>
                  setAttendanceForm((prev) => ({ ...prev, checkInFrom: value }))
                }
                onToChange={(value) =>
                  setAttendanceForm((prev) => ({ ...prev, checkInTo: value }))
                }
              />
            </div>
            <div className="mb-8">
              <AttendanceTimeRange
                title="وقت الخروج"
                fromValue={attendanceForm.checkOutFrom}
                toValue={attendanceForm.checkOutTo}
                onFromChange={(value) =>
                  setAttendanceForm((prev) => ({ ...prev, checkOutFrom: value }))
                }
                onToChange={(value) =>
                  setAttendanceForm((prev) => ({ ...prev, checkOutTo: value }))
                }
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
          <div className="w-full max-w-lg rounded-xl bg-white p-8 shadow-card" dir="rtl">
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
              <AttendanceTimeRange
                title="وقت الدخول"
                fromValue={editAttendanceForm.checkInFrom}
                toValue={editAttendanceForm.checkInTo}
                onFromChange={(value) =>
                  setEditAttendanceForm((prev) => ({ ...prev, checkInFrom: value }))
                }
                onToChange={(value) =>
                  setEditAttendanceForm((prev) => ({ ...prev, checkInTo: value }))
                }
              />
            </div>
            <div className="mb-8">
              <AttendanceTimeRange
                title="وقت الخروج"
                fromValue={editAttendanceForm.checkOutFrom}
                toValue={editAttendanceForm.checkOutTo}
                onFromChange={(value) =>
                  setEditAttendanceForm((prev) => ({ ...prev, checkOutFrom: value }))
                }
                onToChange={(value) =>
                  setEditAttendanceForm((prev) => ({ ...prev, checkOutTo: value }))
                }
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
          <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-card" dir="rtl">
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">تعديل قسم</h3>
            {apiNotice && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiNotice}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-hr-text">رقم القسم</label>
                <input
                  value={departmentForm.departmentId}
                  readOnly
                  className="h-11 w-full rounded-lg border border-hr-border bg-gray-50 px-3 outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">اسم القسم</label>
                <input
                  value={departmentForm.name}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">قسم الأب</label>
                <select
                  value={departmentForm.parentId}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({ ...prev, parentId: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-hr-border bg-white px-3 outline-none focus:border-hr-primary"
                >
                  <option value="">بدون قسم أب</option>
                  {departmentOptions
                    .filter((department) => department.id !== departmentForm.departmentId)
                    .map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">مدير القسم</label>
                <select
                  value={departmentForm.managerId}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({ ...prev, managerId: e.target.value }))
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
                <label className="mb-2 block text-sm text-hr-text">وصف القسم</label>
                <textarea
                  value={departmentForm.description}
                  onChange={(e) =>
                    setDepartmentForm((prev) => ({ ...prev, description: e.target.value }))
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
          <div className="w-full max-w-2xl rounded-xl bg-white p-8 shadow-card" dir="rtl">
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">إضافة قسم جديد</h3>
            {apiNotice && (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {apiNotice}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm text-hr-text">اسم القسم</label>
                <input
                  value={addDepartmentForm.name}
                  onChange={(e) =>
                    setAddDepartmentForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-hr-border px-3 outline-none focus:border-hr-primary"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-hr-text">قسم الأب</label>
                <select
                  value={addDepartmentForm.parentId}
                  onChange={(e) =>
                    setAddDepartmentForm((prev) => ({ ...prev, parentId: e.target.value }))
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
                <label className="mb-2 block text-sm text-hr-text">مدير القسم</label>
                <select
                  value={addDepartmentForm.managerId}
                  onChange={(e) =>
                    setAddDepartmentForm((prev) => ({ ...prev, managerId: e.target.value }))
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
                <label className="mb-2 block text-sm text-hr-text">وصف القسم</label>
                <textarea
                  value={addDepartmentForm.description}
                  onChange={(e) =>
                    setAddDepartmentForm((prev) => ({ ...prev, description: e.target.value }))
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

      {activeSection === "addSkillModal" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-8 shadow-card" dir="rtl">
            <h3 className="mb-6 text-center text-2xl font-bold text-[#1B91C4]">
              إضافة مهارة جديدة
            </h3>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-hr-text">نوع المهارة</label>
                <input
                  value={skillType}
                  onChange={(e) => setSkillType(e.target.value)}
                  placeholder="Languages"
                  className="h-11 w-full rounded-lg border border-hr-border px-3 text-sm outline-none focus:border-hr-primary"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-hr-text">المهارات</p>
                <div className="space-y-2">
                  {skillsList.map((skill, index) => (
                    <div
                      key={`${skill}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-hr-border px-3 py-2"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSkillsList((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                        }
                        className="text-red-400"
                        aria-label="حذف المهارة"
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button type="button" className="text-amber-500" aria-label="تعديل المهارة">
                        <Pencil className="size-4" />
                      </button>
                      <input
                        value={skill}
                        onChange={(e) =>
                          setSkillsList((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? e.target.value : item,
                            ),
                          )
                        }
                        className="h-8 flex-1 border-0 bg-transparent px-1 text-sm outline-none"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSkillsList((prev) => [...prev, ""])}
                    className="text-sm text-[#3D7EA6]"
                  >
                    + إضافة مهارة للقائمة
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-hr-text">مستويات المهارة</p>
                <div className="overflow-hidden rounded-lg border border-hr-border">
                  <table className="w-full table-fixed text-sm">
                    <thead className="bg-[#F5FAFD] text-xs text-hr-muted">
                      <tr>
                        <th className="w-10 px-2 py-2 text-center font-medium" />
                        <th className="px-2 py-2 text-start font-medium">اسم المستوى</th>
                        <th className="px-2 py-2 text-start font-medium">التقدم</th>
                        <th className="w-14 px-2 py-2 text-center font-medium">المستوى</th>
                      </tr>
                    </thead>
                    <tbody>
                      {skillLevels.map((item, index) => (
                        <tr key={`${item.name}-${index}`} className="border-t border-hr-border">
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              className="text-red-400"
                              onClick={() =>
                                setSkillLevels((prev) =>
                                  prev.filter((_, levelIndex) => levelIndex !== index),
                                )
                              }
                              aria-label="حذف المستوى"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                          <td className="px-2 py-2 text-hr-text">{item.name}</td>
                          <td className="px-2 py-2">
                            <input
                              type="range"
                              min={0}
                              max={100}
                              value={item.progress}
                              onChange={(e) =>
                                setSkillLevels((prev) =>
                                  prev.map((level, levelIndex) =>
                                    levelIndex === index
                                      ? { ...level, progress: Number(e.target.value) }
                                      : level,
                                  ),
                                )
                              }
                              className="h-2 w-full accent-orange-400"
                            />
                          </td>
                          <td className="px-2 py-2 text-center text-sm font-medium text-orange-500">
                            {item.progress}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleSaveSkill}
                disabled={skillSaving}
                className="rounded-lg bg-hr-primary px-8 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {skillSaving ? "جاري الإضافة…" : "إضافة المهارة"}
              </button>
              <button
                type="button"
                onClick={closeTo("skills")}
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
