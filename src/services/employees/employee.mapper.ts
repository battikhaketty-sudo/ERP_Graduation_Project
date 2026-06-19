import type { Employee } from "../../types/employee";
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

export const isArchivedEmployeeRecord = (item: Record<string, unknown>) => {
  const archived = item.isArchived ?? item.IsArchived ?? item.archived;
  if (typeof archived === "boolean") return archived;

  const status = String(item.status ?? item.Status ?? item.employeeStatus ?? "")
    .trim()
    .toLowerCase();

  return status === "archived" || status === "inactive";
};

export const normalizeEmployee = (
  item: Record<string, unknown>,
  isDetail = false,
): Employee => {
  const personal = (isDetail ? item.personalInfo : item) as Record<string, unknown>;
  const work = (isDetail ? item.workInfo : {}) as Record<string, unknown>;
  const citizenship = (isDetail ? item.citizenshipInfo : {}) as Record<string, unknown>;
  const resume = (isDetail ? item.resumeInfo : {}) as Record<string, unknown>;

  const contractRange = String(work.contractTimeRange || "");
  const dates = contractRange ? contractRange.split(" - ") : [];

  return {
    id: String(item.id || item.userId || ""),
    employeeId: String(item.userId || item.id || ""),
    name: String(personal.legalName || item.name || "بدون اسم"),
    email: String(item.email || "-"),
    phone: String(
      work.workMobileNumber || personal.mobileNumber || item.phone || "-",
    ),
    role: "Front_end",
    address:
      `${citizenship.nationality || ""} - ${work.departmentName || ""}`.trim() || "-",
    avatar: resolveAvatarUrl(String(personal.profileImagePath || "")),
    birthDate: toIsoDate(String(personal.birthDay || ""))?.split("T")[0],
    gender: personal.gender === 2 || personal.gender === "2" ? "female" : "male",
    nationality: String(citizenship.nationality || "غير محدد"),
    department: String(work.departmentName || "غير محدد"),
    departmentId: String(work.departmentId || item.departmentId || ""),
    managerId: String(work.managerId || item.managerId || ""),
    managerName: String(work.managerName || item.managerName || ""),
    contractTypeId: String(work.contractTypeId || ""),
    salary: Number(work.salary || work.wage) || undefined,
    joiningDate: dates[0] ? toIsoDate(String(dates[0]))?.split("T")[0] : undefined,
    contractEndDate: dates[1] ? toIsoDate(String(dates[1]))?.split("T")[0] : undefined,
    idNumber: String(citizenship.identificationNo || ""),
    resumeSkills: Array.isArray(resume.skills)
      ? (resume.skills as Record<string, unknown>[]).map((skill) => ({
          name: String(skill.skillName || skill.name || ""),
          type: String(skill.skillTypeName || skill.type || ""),
          level: String(skill.skillLevelName || skill.level || ""),
        }))
      : [],
  };
};
