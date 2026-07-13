import type { Employee, EmployeeResumeLine } from "../../types/employee";
import { env } from "../../config/env";
import { DEFAULT_AVATAR_URL } from "../../constants/defaults";

export const toApiGender = (gender?: Employee["gender"]) =>
  gender === "female" ? "2" : "1";

export const toIsoDate = (value?: string) => {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const resolveAvatarUrl = (path?: string | null) => {
  if (!path) return DEFAULT_AVATAR_URL;
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${env.apiHost}${path}`;
};

export const resolveMediaUrl = (path?: string | null) => {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${env.apiHost}${path}`;
};

export const isArchivedEmployeeRecord = (item: Record<string, unknown>) => {
  const archived = item.isArchived ?? item.IsArchived ?? item.archived;
  if (typeof archived === "boolean") return archived;

  const status = String(item.status ?? item.Status ?? item.employeeStatus ?? "")
    .trim()
    .toLowerCase();

  return status === "archived" || status === "inactive";
};

const mapResumeLines = (resume: Record<string, unknown>): EmployeeResumeLine[] => {
  if (!Array.isArray(resume.lines)) return [];

  return (resume.lines as Record<string, unknown>[]).map((line) => ({
    id: String(line.id || crypto.randomUUID()),
    title: String(line.title || ""),
    description: line.description ? String(line.description) : undefined,
    typeName: String(line.typeName || line.type || ""),
    fromDate: line.fromDate ? String(line.fromDate).split("T")[0] : undefined,
    toDate: line.toDate ? String(line.toDate).split("T")[0] : undefined,
  }));
};

const mapResumeSkills = (resume: Record<string, unknown>) =>
  Array.isArray(resume.skills)
    ? (resume.skills as Record<string, unknown>[]).map((skill) => ({
        name: String(skill.skillName || skill.name || ""),
        type: String(skill.skillTypeName || skill.type || ""),
        level: String(skill.skillLevelName || skill.level || ""),
      }))
    : [];

export const normalizeEmployee = (
  item: Record<string, unknown>,
  isDetail = false,
): Employee => {
  if (!isDetail) {
    return {
      id: String(item.id || ""),
      userId: String(item.userId || ""),
      employeeId: String(item.userId || item.id || ""),
      resumeId: item.resumeId ? String(item.resumeId) : undefined,
      name: String(item.legalName || item.name || "بدون اسم"),
      email: String(item.email || "-"),
      phone: String(item.workMobileNumber || item.phone || "-"),
      genderName: item.genderName ? String(item.genderName) : undefined,
      nationality: item.nationality ? String(item.nationality) : undefined,
      department: String(item.departmentName || "غير محدد"),
      departmentId: String(item.departmentId || ""),
      managerId: String(item.managerId || ""),
      managerName: String(item.managerName || ""),
      avatar: resolveAvatarUrl(String(item.profileImagePath || "")),
      isArchived: isArchivedEmployeeRecord(item),
      role: "Front_end",
      address:
        `${item.nationality || ""} - ${item.departmentName || ""}`.trim() || "-",
    };
  }

  const personal = (item.personalInfo ?? {}) as Record<string, unknown>;
  const work = (item.workInfo ?? {}) as Record<string, unknown>;
  const citizenship = (item.citizenshipInfo ?? {}) as Record<string, unknown>;
  const resume = (item.resumeInfo ?? {}) as Record<string, unknown>;

  const contractRange = String(work.contractTimeRange || "");
  const dates = contractRange ? contractRange.split(" - ") : [];
  const salaryValue = Number(work.salary);
  const wageValue = Number(work.wage);

  return {
    id: String(item.id || item.userId || ""),
    userId: String(item.userId ?? item.id ?? ""),
    employeeId: String(item.userId || item.id || ""),
    resumeId: resume.id ? String(resume.id) : item.resumeId ? String(item.resumeId) : undefined,
    name: String(personal.legalName || item.name || "بدون اسم"),
    email: String(item.email || "-"),
    phone: String(
      work.workMobileNumber || personal.mobileNumber || item.phone || "-",
    ),
    role: "Front_end",
    address:
      `${citizenship.nationality || ""} - ${work.departmentName || ""}`.trim() || "-",
    avatar: resolveAvatarUrl(String(personal.profileImagePath || "")),
    isArchived: isArchivedEmployeeRecord(item),
    birthDate: toIsoDate(String(personal.birthDay || ""))?.split("T")[0],
    gender: personal.gender === 2 || personal.gender === "2" ? "female" : "male",
    genderName: personal.genderName ? String(personal.genderName) : undefined,
    nationality: String(citizenship.nationality || "غير محدد"),
    department: String(work.departmentName || "غير محدد"),
    departmentId: String(work.departmentId || item.departmentId || ""),
    managerId: String(work.managerId || item.managerId || ""),
    managerName: String(work.managerName || item.managerName || ""),
    contractTypeId: String(work.contractTypeId || ""),
    contractTypeName: work.contractTypeName ? String(work.contractTypeName) : undefined,
    salary: Number.isFinite(salaryValue) ? salaryValue : undefined,
    wage: Number.isFinite(wageValue) ? wageValue : undefined,
    joiningDate: dates[0] ? toIsoDate(String(dates[0]))?.split("T")[0] : undefined,
    contractEndDate: dates[1] ? toIsoDate(String(dates[1]))?.split("T")[0] : undefined,
    idNumber: String(citizenship.identificationNo || ""),
    idCardFrontImage: resolveMediaUrl(
      citizenship.idCardFrontImagePath ? String(citizenship.idCardFrontImagePath) : null,
    ),
    idCardBackImage: resolveMediaUrl(
      citizenship.idCardBackImagePath ? String(citizenship.idCardBackImagePath) : null,
    ),
    resumeLines: mapResumeLines(resume),
    resumeSkills: mapResumeSkills(resume),
  };
};
