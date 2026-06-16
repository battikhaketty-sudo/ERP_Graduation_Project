import api from "./api";
import type { AttendanceFilters, AttendanceRecord } from "../types/attendance";
import type { ContractType } from "../types/contract";
import type { Department, DepartmentFilters } from "../types/department";
import type { SkillGroup } from "../types/skill";
import {
  assertSuccess,
  unwrapData,
  unwrapEntity,
  unwrapPage,
  unwrapPagedMeta,
} from "../utils/apiResponse";

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
});

const normalizeDepartment = (item: Record<string, unknown>): Department => ({
  id: String(item.id ?? crypto.randomUUID()),
  name: String(item.name ?? "بدون اسم"),
  managerId: String(item.managerId ?? ""),
  parentId: String(item.parentId ?? ""),
  parentName: typeof item.parentName === "string" ? item.parentName : undefined,
  managerName: typeof item.managerName === "string" ? item.managerName : undefined,
  description: String(item.description ?? ""),
});

const normalizeAttendance = (item: Record<string, unknown>): AttendanceRecord => {
  const checkInRaw = typeof item.checkin === "string" ? item.checkin : "";
  const checkOutRaw = typeof item.checkout === "string" ? item.checkout : "";

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
  };
};

const normalizeSkillGroup = (item: Record<string, unknown>): SkillGroup => {
  const skills = Array.isArray(item.skills)
    ? item.skills.map((skill) =>
        String((skill as Record<string, unknown>).name ?? skill),
      )
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
  return unwrapPage<Record<string, unknown>>(res.data).map(normalizeContract);
};

export const addContractType = async (name: string) => {
  const res = await api.post("/contract-types", { name });
  const data = unwrapEntity<Record<string, unknown>>(res.data);
  return normalizeContract(data);
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
  const records = unwrapPage<Record<string, unknown>>(res.data).map(normalizeDepartment);
  const meta = unwrapPagedMeta(res.data);

  return { records, meta };
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
  const records = unwrapPage<Record<string, unknown>>(res.data).map(normalizeAttendance);
  const meta = unwrapPagedMeta(res.data);

  return { records, meta };
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
  assertSuccess(res.data);
  return res.data;
};

export const deleteAttendence = async (id: string) => {
  const res = await api.delete(`/attendences/${id}`);
  assertSuccess(res.data);
  return res.data;
};

export const getSkillTypes = async (page = 1, limit = 50) => {
  const res = await api.get("/skill-types", { params: { page, limit } });
  return unwrapPage<Record<string, unknown>>(res.data).map(normalizeSkillGroup);
};

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
