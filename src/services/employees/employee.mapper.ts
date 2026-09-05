import type {
  Employee,
  EmployeeResumeLine,
  EmployeeResumeSkill,
} from "../../types/employee";
import { env } from "../../config/env";
import { normalizeBirthDateValue } from "../../utils/employeeDates";
import { calendarDateToUtcIso, formatSyriaDate } from "../../utils/syriaTime";
import { RESUME_LINE_TYPE_BY_API } from "../backendEnums";
import { readApiBoolean } from "../../utils/readIsFixed";

const MEDIA_PROXY_PREFIX = "/media";

export const toApiGender = (gender?: Employee["gender"]) =>
  gender === "female" ? "2" : "1";

export const toIsoDate = (value?: string) => {
  if (!value?.trim()) return null;
  return calendarDateToUtcIso(value, false) || null;
};

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

/** Relative API base (e.g. `/api/v1`) means Vite/Netlify proxy is in use. */
const usesProxiedApi = () => !/^https?:\/\//i.test(env.apiBaseUrl);

const getDirectMediaHost = () =>
  stripTrailingSlash(env.apiHost || env.apiProxyTarget);

const toProxiedMediaUrl = (pathnameAndSearch: string) => {
  const normalized = pathnameAndSearch.startsWith("/")
    ? pathnameAndSearch
    : `/${pathnameAndSearch}`;
  if (normalized === MEDIA_PROXY_PREFIX || normalized.startsWith(`${MEDIA_PROXY_PREFIX}/`)) {
    return normalized;
  }
  return `${MEDIA_PROXY_PREFIX}${normalized}`;
};

/**
 * Resolve employee/media file paths to a browser-loadable URL.
 *
 * Prefer the API media host directly. Only rewrite through same-origin `/media`
 * when the page is HTTPS and the file is HTTP (mixed-content block).
 * (The Vite `/media` proxy has been falling through to SPA HTML in local dev.)
 */
export const resolveMediaUrl = (path?: string | null) => {
  if (!path?.trim()) return "";

  const raw = path.trim().replace(/\\/g, "/");
  if (raw.startsWith("data:")) return raw;

  let absolute: URL;
  try {
    if (/^https?:\/\//i.test(raw)) {
      absolute = new URL(raw);
    } else {
      const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
      absolute = new URL(`${getDirectMediaHost()}${normalizedPath}`);
    }
  } catch {
    return raw;
  }

  const pageIsHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";

  if (pageIsHttps && absolute.protocol === "http:" && usesProxiedApi()) {
    return toProxiedMediaUrl(`${absolute.pathname}${absolute.search}`);
  }

  return `${absolute.protocol}//${absolute.host}${absolute.pathname}${absolute.search}`;
};

const readProfileImagePath = (
  item: Record<string, unknown>,
  personal?: Record<string, unknown>,
) => {
  const candidates = [
    personal?.profileImagePath,
    personal?.ProfileImagePath,
    personal?.profileImageUrl,
    personal?.ProfileImageUrl,
    item.profileImagePath,
    item.ProfileImagePath,
    item.profileImageUrl,
    item.ProfileImageUrl,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
};

export const resolveAvatarUrl = (path?: string | null, _name?: string) => {
  if (!path?.trim()) return "";
  return resolveMediaUrl(path) || "";
};

export const isArchivedEmployeeRecord = (item: Record<string, unknown>) =>
  readApiBoolean(item, "isArchived", "IsArchived");

export const readResumeId = (...candidates: unknown[]) => {
  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    if (value && value !== "undefined" && value !== "null") return value;
  }
  return undefined;
};

export const mapResumeLines = (resume: Record<string, unknown>): EmployeeResumeLine[] => {
  const rawLines = resume.lines ?? resume.Lines ?? resume.resumeLines ?? resume.ResumeLines;
  if (!Array.isArray(rawLines)) return [];

  return (rawLines as Record<string, unknown>[]).map((line) => {
    const typeValue = Number(line.type ?? line.Type ?? 0);
    const fromDate = line.fromDate ?? line.FromDate;
    const toDate = line.toDate ?? line.ToDate;
    return {
      id: String(line.id || line.Id || `local-${crypto.randomUUID()}`),
      title: String(line.title || line.Title || ""),
      description: line.description || line.Description
        ? String(line.description || line.Description)
        : undefined,
      type: Number.isFinite(typeValue) ? typeValue : 0,
      typeName: String(
        line.typeName || line.TypeName || RESUME_LINE_TYPE_BY_API[typeValue] || "",
      ),
      fromDate: fromDate ? formatSyriaDate(String(fromDate)) || undefined : undefined,
      toDate: toDate ? formatSyriaDate(String(toDate)) || undefined : undefined,
    };
  });
};

export const mapResumeSkills = (
  resume: Record<string, unknown>,
): EmployeeResumeSkill[] => {
  const rawSkills =
    resume.skills ??
    resume.Skills ??
    resume.resumeSkills ??
    resume.ResumeSkills;
  if (!Array.isArray(rawSkills)) return [];
  return (rawSkills as Record<string, unknown>[]).map((skill) => {
    const progressValue = Number(skill.progress ?? skill.Progress);
    return {
      id: skill.id ? String(skill.id) : skill.Id ? String(skill.Id) : undefined,
      skillId: String(skill.skillId || skill.SkillId || ""),
      skillLevelId: String(skill.skillLevelId || skill.SkillLevelId || ""),
      name: String(skill.skillName || skill.SkillName || skill.name || ""),
      type: String(skill.skillTypeName || skill.SkillTypeName || skill.type || ""),
      level: String(skill.skillLevelName || skill.SkillLevelName || skill.level || ""),
      progress: Number.isFinite(progressValue) ? progressValue : undefined,
    };
  });
};

const readMappedDate = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return formatSyriaDate(value) || undefined;
    }
  }
  return undefined;
};

const readWorkingScheduleId = (...sources: Record<string, unknown>[]) => {
  for (const source of sources) {
    const value = String(
      source.workingScheduleId ?? source.WorkingScheduleId ?? "",
    ).trim();
    if (value && value !== "null") return value;
  }
  return "";
};

export const normalizeEmployee = (
  item: Record<string, unknown>,
  isDetail = false,
): Employee => {
  if (!isDetail) {
    return {
      id: String(item.id || ""),
      userId: String(item.userId || item.UserId || ""),
      employeeId: String(item.userId || item.id || ""),
      resumeId: readResumeId(item.resumeId, item.ResumeId),
      name: String(item.legalName || item.name || "بدون اسم"),
      email: String(item.email || "-"),
      // List payload only exposes WorkMobileNumber (no personal mobile).
      phone: String(item.workMobileNumber || item.phone || "-"),
      workPhone: String(item.workMobileNumber || item.phone || "-"),
      genderName: item.genderName ? String(item.genderName) : undefined,
      nationality: item.nationality ? String(item.nationality) : undefined,
      department: String(item.departmentName || "غير محدد"),
      departmentId: String(item.departmentId || ""),
      managerId: String(item.managerId || ""),
      managerName: String(item.managerName || ""),
      workingScheduleId: readWorkingScheduleId(item),
      avatar: resolveAvatarUrl(readProfileImagePath(item)),
      isArchived: isArchivedEmployeeRecord(item),
      address:
        `${item.nationality || ""} - ${item.departmentName || ""}`.trim() || "-",
    };
  }

  const personal = (item.personalInfo ?? item.PersonalInfo ?? {}) as Record<string, unknown>;
  const work = (item.workInfo ?? item.WorkInfo ?? {}) as Record<string, unknown>;
  const citizenship = (item.citizenshipInfo ?? item.CitizenshipInfo ?? {}) as Record<string, unknown>;
  const resume = (item.resumeInfo ?? item.ResumeInfo ?? {}) as Record<string, unknown>;

  const contractRange = String(
    work.contractTimeRange || work.ContractTimeRange || "",
  );
  const dates = contractRange.includes(" - ") ? contractRange.split(" - ") : [];
  const salaryValue = Number(work.salary ?? work.Salary);
  const wageValue = Number(work.wage ?? work.Wage);

  return {
    id: String(item.id || item.Id || item.userId || item.UserId || ""),
    userId: String(item.userId ?? item.UserId ?? item.id ?? item.Id ?? ""),
    employeeId: String(item.userId || item.id || ""),
    resumeId: readResumeId(resume.id, resume.Id, item.resumeId, item.ResumeId),
    name: String(personal.legalName || item.name || "بدون اسم"),
    email: String(item.email || "-"),
    phone: String(personal.mobileNumber || personal.MobileNumber || item.phone || "").replace(/^-$/, ""),
    workPhone: (() => {
      const value = String(work.workMobileNumber || "").trim();
      return value && value !== "-" ? value : "";
    })(),
    address:
      `${citizenship.nationality || ""} - ${work.departmentName || ""}`.trim() || "-",
    avatar: resolveAvatarUrl(readProfileImagePath(item, personal)),
    isArchived:
      isArchivedEmployeeRecord(item) || isArchivedEmployeeRecord(work),
    birthDate:
      normalizeBirthDateValue(
        String(personal.birthDay || personal.Birthday || ""),
      ) || undefined,
    gender: personal.gender === 2 || personal.gender === "2" ? "female" : "male",
    genderName: personal.genderName ? String(personal.genderName) : undefined,
    nationality: String(citizenship.nationality || "غير محدد"),
    department: String(work.departmentName || "غير محدد"),
    departmentId: String(work.departmentId || item.departmentId || ""),
    managerId: String(work.managerId || item.managerId || ""),
    managerName: String(work.managerName || item.managerName || ""),
    workingScheduleId: readWorkingScheduleId(work, item),
    contractTypeId: String(work.contractTypeId || ""),
    contractTypeName: work.contractTypeName ? String(work.contractTypeName) : undefined,
    salary: Number.isFinite(salaryValue) ? salaryValue : undefined,
    wage: Number.isFinite(wageValue) ? wageValue : undefined,
    joiningDate: readMappedDate(
      work.contractTimeRangeFrom,
      work.ContractTimeRangeFrom,
      dates[0],
    ),
    contractEndDate: readMappedDate(
      work.contractTimeRangeTo,
      work.ContractTimeRangeTo,
      dates[1],
    ),
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
