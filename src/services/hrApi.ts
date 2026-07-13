import api from "./api";
import type { AttendanceFilters, AttendanceRecord } from "../types/attendance";
import type { ContractType } from "../types/contract";
import type { Department, DepartmentFilters } from "../types/department";
import type { SkillGroup } from "../types/skill";
import {
  assertMutationSuccess,
  assertSuccess,
  unwrapData,
  unwrapEntity,
  unwrapPage,
  unwrapPagedMeta,
} from "../utils/apiResponse";
import { extractRowNumber } from "../utils/tableRowNumber";
import { fetchAllPages } from "../utils/fetchAllPages";
import { sortNewestFirst } from "../utils/listOrder";

export type { AttendanceFilters, AttendancePayload, AttendanceRecord } from "../types/attendance";
export type { ContractType } from "../types/contract";
export type { Department, DepartmentFilters, DepartmentFormPayload } from "../types/department";
export type { SkillGroup, SkillLevel } from "../types/skill";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ar-SY", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
};

const normalizeContract = (item: Record<string, unknown>): ContractType => ({
  id: String(item.id ?? crypto.randomUUID()),
  name: String(item.name ?? "بدون اسم"),
  rowNumber: extractRowNumber(item),
});

const normalizeDepartment = (item: Record<string, unknown>): Department => ({
  id: String(item.id ?? crypto.randomUUID()),
  name: String(item.name ?? "بدون اسم"),
  managerId: String(item.managerId ?? ""),
  parentId: String(item.parentId ?? ""),
  parentName: typeof item.parentName === "string" ? item.parentName : undefined,
  managerName: typeof item.managerName === "string" ? item.managerName : undefined,
  description: String(item.description ?? ""),
  rowNumber: extractRowNumber(item),
});

const readAttendanceDate = (item: Record<string, unknown>, ...keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed && trimmed !== "-") return trimmed;
    }
  }
  return "";
};

const normalizeAttendance = (item: Record<string, unknown>): AttendanceRecord => {
  const checkInRaw = readAttendanceDate(item, "checkin", "checkIn", "CheckIn");
  const checkOutRaw = readAttendanceDate(item, "checkout", "checkOut", "CheckOut");

  return {
    id: String(item.id ?? crypto.randomUUID()),
    employeeId: String(item.employeeId ?? ""),
    employeeName: String(item.legalName ?? item.employeeName ?? "بدون اسم"),
    checkIn: formatDateTime(checkInRaw || null),
    checkOut: formatDateTime(checkOutRaw || null),
    checkInRaw: checkInRaw || undefined,
    checkOutRaw: checkOutRaw || undefined,
    status: String(item.statusName ?? item.status ?? "-"),
    totalWorkHours: Number(item.totalWorkHours ?? 0) || undefined,
    requiredWorkHours: Number(item.requiredWorkHours ?? 8) || undefined,
    rowNumber: extractRowNumber(item),
  };
};

const normalizeSkillGroup = (item: Record<string, unknown>): SkillGroup => {
  const skills = Array.isArray(item.skills)
    ? item.skills.map((skill) => {
        const entry = skill as Record<string, unknown>;
        return {
          id: typeof entry.id === "string" ? entry.id : undefined,
          name: String(entry.name ?? skill),
        };
      })
    : [];

  const levels = Array.isArray(item.skillLevels)
    ? item.skillLevels.map((level) => {
        const entry = level as Record<string, unknown>;
        return {
          id: typeof entry.id === "string" ? entry.id : undefined,
          name: String(entry.name ?? ""),
          progress: Number(entry.progress ?? 0),
        };
      })
    : [];

  return {
    id: String(item.id ?? crypto.randomUUID()),
    name: String(item.name ?? "بدون اسم"),
    skills,
    levels,
  };
};

export const getContractTypes = async (page = 1, limit = 50) => {
  const res = await api.get("/contract-types", { params: { Page: page, Limit: limit } });
  return sortNewestFirst(
    unwrapPage<Record<string, unknown>>(res.data).map((item) =>
      normalizeContract(item),
    ),
  );
};

export const addContractType = async (name: string) => {
  const res = await api.post("/contract-types", { name });
  const data = unwrapEntity<Record<string, unknown>>(res.data);
  return normalizeContract(data);
};

export const updateContractType = async (id: string, name: string) => {
  const trimmed = name.trim();
  const res = await api.put(`/contract-types/${id}`, { name: trimmed });
  assertSuccess(res.data);
  return { id, name: trimmed };
};

export const deleteContractType = async (id: string) => {
  const res = await api.delete(`/contract-types/${id}`);
  assertSuccess(res.data);
  return res.data;
};

export const getDepartments = async (filters: DepartmentFilters = {}) => {
  const { page = 1, limit = 10, name, parentName, managerName } = filters;
  const params: Record<string, string | number> = { Page: page, Limit: limit };
  if (name?.trim()) params.Name = name.trim();
  if (parentName?.trim()) params.ParentName = parentName.trim();
  if (managerName?.trim()) params.ManagerName = managerName.trim();

  const res = await api.get("/departments", { params });
  const records = sortNewestFirst(
    unwrapPage<Record<string, unknown>>(res.data).map((item) =>
      normalizeDepartment(item),
    ),
  );
  const meta = unwrapPagedMeta(res.data);

  return {
    records,
    meta: {
      ...meta,
      currentPage: page,
      totalPages: meta.totalItems
        ? Math.max(1, Math.ceil(meta.totalItems / limit))
        : meta.totalPages,
    },
  };
};

export const addDepartment = async (data: {
  name: string;
  managerId: string;
  parentId?: string;
  description?: string;
}) => {
  const res = await api.post("/departments", {
    name: data.name,
    managerId: data.managerId,
    parentId: data.parentId || null,
    description: data.description || null,
  });
  assertSuccess(res.data);
  const createdId = unwrapData<string>(res.data);
  if (typeof createdId === "string" && createdId.trim()) {
    return getDepartmentById(createdId);
  }
  return null;
};

export const getDepartmentById = async (id: string) => {
  const res = await api.get(`/departments/${id}`);
  const data = unwrapEntity<Record<string, unknown>>(res.data);
  return normalizeDepartment(data);
};

export const updateDepartment = async (
  id: string,
  data: {
    name: string;
    managerId: string;
    parentId?: string;
    description?: string;
  },
) => {
  const res = await api.put(`/departments/${id}`, {
    name: data.name,
    managerId: data.managerId,
    parentId: data.parentId || null,
    description: data.description || null,
  });
  assertSuccess(res.data);
  return getDepartmentById(id);
};

export const deleteDepartment = async (id: string) => {
  const res = await api.delete(`/departments/${id}`);
  assertSuccess(res.data);
  return res.data;
};

const formatDateTimeParam = (value?: string, endOfDay = false) => {
  if (!value?.trim()) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return endOfDay ? `${value}T23:59:59.999Z` : `${value}T00:00:00.000Z`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  if (endOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  } else {
    date.setUTCHours(0, 0, 0, 0);
  }

  return date.toISOString();
};

export const getTodayApiRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const date = `${year}-${month}-${day}`;

  return {
    from: `${date}T00:00:00.000Z`,
    to: `${date}T23:59:59.999Z`,
  };
};

export const getAttendences = async (filters: AttendanceFilters = {}) => {
  const { page = 1, limit = 10, employeeName, from, to, status } = filters;
  const params: Record<string, string | number> = { Page: page, Limit: limit };
  if (employeeName?.trim()) params.EmployeeName = employeeName.trim();

  const fromParam = formatDateTimeParam(from, false);
  const toParam = formatDateTimeParam(to, true);
  if (fromParam) params.From = fromParam;
  if (toParam) params.To = toParam;

  if (status !== undefined) params.Status = status;

  const res = await api.get("/attendences", { params });
  const records = sortNewestFirst(
    unwrapPage<Record<string, unknown>>(res.data).map((item) =>
      normalizeAttendance(item),
    ),
  );
  const meta = unwrapPagedMeta(res.data);

  return {
    records,
    meta: {
      ...meta,
      currentPage: page,
      totalPages: meta.totalItems
        ? Math.max(1, Math.ceil(meta.totalItems / limit))
        : meta.totalPages,
    },
  };
};

export const addAttendence = async (data: {
  employeeId: string;
  checkin: string;
  checkout?: string;
}) => {
  const res = await api.post("/attendences", data);
  const entity = unwrapEntity<Record<string, unknown>>(res.data);
  return normalizeAttendance(entity);
};

export const updateAttendence = async (
  id: string,
  data: { checkin: string; checkout?: string | null },
) => {
  const res = await api.put(`/attendences/${id}`, data);
  assertSuccess(res.data);
  return res.data;
};

export const approveAttendence = async (id: string) => {
  const res = await api.post(`/attendences/${id}/approve`);
  assertSuccess(res.data);
  return res.data;
};

export const refuseAttendence = async (id: string) => {
  const res = await api.post(`/attendences/${id}/refuse`);
  assertSuccess(res.data);
  return res.data;
};

export const checkInAttendence = async () => {
  const res = await api.post("/attendences/check-in");
  assertMutationSuccess(res.data, "فشل تسجيل الدخول.");
  return res.data;
};

export const checkOutAttendence = async (id: string) => {
  const res = await api.post(`/attendences/${id}/check-out`, {});
  assertSuccess(res.data);
  return res.data;
};

export const deleteAttendence = async (id: string) => {
  const res = await api.delete(`/attendences/${id}`);
  assertSuccess(res.data);
  return res.data;
};

export const getSkillTypesPage = async (page = 1, limit = 50) => {
  const res = await api.get("/skill-types", { params: { page, limit } });
  const meta = unwrapPagedMeta(res.data);
  const records = sortNewestFirst(
    unwrapPage<Record<string, unknown>>(res.data).map(normalizeSkillGroup),
  );

  return {
    records,
    meta: {
      ...meta,
      totalPages: meta.totalItems
        ? Math.max(1, Math.ceil(meta.totalItems / limit))
        : meta.totalPages,
    },
  };
};

export const getSkillTypes = async (page = 1, limit = 50) => {
  const { records } = await getSkillTypesPage(page, limit);
  return records;
};

export const getAllSkillTypes = async () =>
  fetchAllPages((page, limit) => getSkillTypesPage(page, limit));

export const addSkillType = async (data: {
  name: string;
  skillNames: string[];
  skillLevels: Array<{ name: string; progress: number }>;
}) => {
  const res = await api.post("/skill-types", {
    name: data.name,
    skillNames: data.skillNames,
    skillLevels: data.skillLevels,
  });
  assertSuccess(res.data);
  return res.data;
};

export const deleteSkillType = async (id: string) => {
  const res = await api.delete(`/skill-types/${id}`);
  assertSuccess(res.data);
  return res.data;
};

export const updateSkillType = async (id: string, name: string) => {
  const res = await api.put(`/skill-types/${id}`, { name: name.trim() });
  assertSuccess(res.data);
};

export const addSkillToType = async (skillTypeId: string, name: string) => {
  const res = await api.post(`/skill-types/${skillTypeId}/skills`, { name: name.trim() });
  assertSuccess(res.data);
};

export const updateSkillInType = async (skillTypeId: string, skillId: string, name: string) => {
  const res = await api.put(`/skill-types/${skillTypeId}/skills/${skillId}`, {
    name: name.trim(),
  });
  assertSuccess(res.data);
};

export const deleteSkillFromType = async (skillTypeId: string, skillId: string) => {
  const res = await api.delete(`/skill-types/${skillTypeId}/skills/${skillId}`);
  assertSuccess(res.data);
};

export const addSkillLevelToType = async (
  skillTypeId: string,
  data: { name: string; progress: number },
) => {
  const res = await api.post(`/skill-types/${skillTypeId}/skill-levels`, data);
  assertSuccess(res.data);
};

export const updateSkillLevelInType = async (
  skillTypeId: string,
  skillLevelId: string,
  data: { name: string; progress: number },
) => {
  const res = await api.put(`/skill-types/${skillTypeId}/skill-levels/${skillLevelId}`, data);
  assertSuccess(res.data);
};

export const deleteSkillLevelFromType = async (skillTypeId: string, skillLevelId: string) => {
  const res = await api.delete(`/skill-types/${skillTypeId}/skill-levels/${skillLevelId}`);
  assertSuccess(res.data);
};

export type SkillDraftPayload = {
  apiId?: string;
  name: string;
};

export type SkillLevelDraftPayload = {
  apiId?: string;
  name: string;
  progress: number;
};

export const syncSkillTypeDetails = async (
  skillTypeId: string,
  original: SkillGroup,
  nextName: string,
  nextSkills: SkillDraftPayload[],
  nextLevels: SkillLevelDraftPayload[],
) => {
  if (original.name.trim() !== nextName.trim()) {
    await updateSkillType(skillTypeId, nextName);
  }

  const nextSkillIds = new Set(
    nextSkills.map((skill) => skill.apiId).filter(Boolean) as string[],
  );

  await Promise.all(
    original.skills
      .filter((skill) => skill.id && !nextSkillIds.has(skill.id))
      .map((skill) => deleteSkillFromType(skillTypeId, skill.id!)),
  );

  await Promise.all(
    nextSkills.map(async (skill) => {
      const trimmedName = skill.name.trim();
      if (!trimmedName) return;

      if (skill.apiId) {
        const originalSkill = original.skills.find((item) => item.id === skill.apiId);
        if (originalSkill && originalSkill.name !== trimmedName) {
          await updateSkillInType(skillTypeId, skill.apiId, trimmedName);
        }
        return;
      }

      await addSkillToType(skillTypeId, trimmedName);
    }),
  );

  const nextLevelIds = new Set(
    nextLevels.map((level) => level.apiId).filter(Boolean) as string[],
  );

  await Promise.all(
    original.levels
      .filter((level) => level.id && !nextLevelIds.has(level.id))
      .map((level) => deleteSkillLevelFromType(skillTypeId, level.id!)),
  );

  await Promise.all(
    nextLevels.map(async (level) => {
      const trimmedName = level.name.trim();
      if (!trimmedName) return;

      const payload = { name: trimmedName, progress: level.progress };

      if (level.apiId) {
        const originalLevel = original.levels.find((item) => item.id === level.apiId);
        if (
          originalLevel &&
          (originalLevel.name !== trimmedName || originalLevel.progress !== level.progress)
        ) {
          await updateSkillLevelInType(skillTypeId, level.apiId, payload);
        }
        return;
      }

      await addSkillLevelToType(skillTypeId, payload);
    }),
  );
};
