import api from "../api";
import type { AppRole, RoleFormPayload, RolesQuery } from "../../types/role";
import {
  assertMutationSuccess,
  assertSuccess,
  unwrapData,
  unwrapEntity,
  unwrapPage,
  unwrapPagedMeta,
} from "../../utils/apiResponse";
import { fetchAllPages } from "../../utils/fetchAllPages";
import { normalizeRole } from "./role.mapper";

const toRoleBody = (payload: RoleFormPayload) => ({
  name: payload.name.trim(),
  description: payload.description?.trim() || null,
  isDefault: payload.isDefault,
  level: payload.level,
  permissionIds: payload.permissionIds ?? [],
});

export const getRoles = async ({ page = 1, limit = 50, name }: RolesQuery = {}) => {
  const params: Record<string, string | number> = { Page: page, Limit: limit };
  if (name?.trim()) params.Name = name.trim();

  const response = await api.get("/roles", { params });
  const meta = unwrapPagedMeta(response.data);
  const records = unwrapPage<Record<string, unknown>>(response.data).map(normalizeRole);

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

export const getAllRoles = async (name?: string) =>
  fetchAllPages((page, limit) => getRoles({ page, limit, name }));

export const getRoleById = async (id: string): Promise<AppRole> => {
  const response = await api.get(`/roles/${id}`);
  return normalizeRole(unwrapEntity(response.data) as Record<string, unknown>);
};

const roleFromPayload = (id: string, payload: RoleFormPayload): AppRole => {
  const permissionIds = payload.permissionIds ?? [];
  return {
    id,
    name: payload.name.trim(),
    description: payload.description?.trim() || null,
    isDefault: payload.isDefault,
    level: payload.level,
    isFixed: false,
    permissionIds,
    permissions: permissionIds.map((permissionId) => ({
      permissionId,
      isFixed: false,
    })),
    numberOfPermissions: permissionIds.length,
  };
};

const tryGetRoleById = async (id: string, fallback: AppRole): Promise<AppRole> => {
  try {
    return await getRoleById(id);
  } catch {
    return fallback;
  }
};

export const addRole = async (payload: RoleFormPayload): Promise<AppRole> => {
  const response = await api.post("/roles", toRoleBody(payload));
  assertSuccess(response.data);

  const createdId = unwrapData<string>(response.data);
  const id = typeof createdId === "string" ? createdId.trim() : "";
  const fallback = roleFromPayload(id, payload);

  if (id) {
    return tryGetRoleById(id, fallback);
  }

  return fallback;
};

export const updateRole = async (
  id: string,
  payload: RoleFormPayload,
): Promise<AppRole> => {
  const body = toRoleBody(payload);
  const response = await api.put(`/roles/${id}`, body);
  assertMutationSuccess(response.data, "فشل تحديث الدور.");
  return tryGetRoleById(id, roleFromPayload(id, payload));
};

export const deleteRole = async (id: string) => {
  const response = await api.delete(`/roles/${id}`);
  assertMutationSuccess(response.data, "فشل حذف الدور.");
};
