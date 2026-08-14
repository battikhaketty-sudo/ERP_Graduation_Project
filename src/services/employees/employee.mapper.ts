import type {
  Employee,
  EmployeeResumeLine,
  EmployeeResumeSkill,
} from "../../types/employee";
import { env } from "../../config/env";
import { normalizeBirthDateValue } from "../../utils/employeeDates";

const MEDIA_PROXY_PREFIX = "/media";

export const toApiGender = (gender?: Employee["gender"]) =>
  gender === "female" ? "2" : "1";

export const toIsoDate = (value?: string) => {
  if (!value?.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

export const buildNamedAvatarUrl = (name?: string) => {
  const label = (name || "Employee").trim() || "Employee";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=2F80ED&color=fff`;
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

  return (resume.lines as Record<string, unknown>[]).map((line) => {
    const typeValue = Number(line.type ?? 0);
    return {
      id: String(line.id || `local-${crypto.randomUUID()}`),
      title: String(line.title || ""),
      description: line.description ? String(line.description) : undefined,
      type: Number.isFinite(typeValue) ? typeValue : 0,
      typeName: String(line.typeName || ""),
      fromDate: line.fromDate ? String(line.fromDate).split("T")[0] : undefined,
      toDate: line.toDate ? String(line.toDate).split("T")[0] : undefined,
    };
  });
};

const mapResumeSkills = (
  resume: Record<string, unknown>,
): EmployeeResumeSkill[] =>
  Array.isArray(resume.skills)
    ? (resume.skills as Record<string, unknown>[]).map((skill) => ({
        id: skill.id ? String(skill.id) : undefined,
        skillId: String(skill.skillId || ""),
        skillLevelId: String(skill.skillLevelId || ""),
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
      avatar: resolveAvatarUrl(readProfileImagePath(item)),
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
    avatar: resolveAvatarUrl(readProfileImagePath(item, personal)),
    isArchived: isArchivedEmployeeRecord(item),
    birthDate: normalizeBirthDateValue(String(personal.birthDay || "")) || undefined,
    gender: personal.gender === 2 || personal.gender === "2" ? "female" : "male",
    genderName: personal.genderName ? String(personal.genderName) : undefined,
    nationality: String(citizenship.nationality || "غير محدد"),
    maritalStatus: String(
      personal.maritalStatus ||
        personal.MaritalStatus ||
        personal.socialStatus ||
        personal.SocialStatus ||
        citizenship.maritalStatus ||
        citizenship.MaritalStatus ||
        "",
    ),
    degreeLevel: String(
      personal.degreeLevel ||
        personal.DegreeLevel ||
        personal.certificateLevel ||
        personal.CertificateLevel ||
        personal.educationLevel ||
        "",
    ),
    fieldOfStudy: String(
      personal.fieldOfStudy ||
        personal.FieldOfStudy ||
        personal.studyField ||
        personal.StudyField ||
        "",
    ),
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
