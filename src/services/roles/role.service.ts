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
import { sortNewestFirst } from "../../utils/listOrder";
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
  const records = sortNewestFirst(
    unwrapPage<Record<string, unknown>>(response.data).map(normalizeRole),
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

export const getAllRoles = async (name?: string) =>
  fetchAllPages((page, limit) => getRoles({ page, limit, name }));

export const getRoleById = async (id: string): Promise<AppRole> => {
  const response = await api.get(`/roles/${id}`);
  return normalizeRole(unwrapEntity(response.data) as Record<string, unknown>);
};

export const addRole = async (payload: RoleFormPayload): Promise<AppRole> => {
  const response = await api.post("/roles", toRoleBody(payload));
  assertSuccess(response.data);

  const createdId = unwrapData<string>(response.data);
  if (typeof createdId === "string" && createdId.trim()) {
    return getRoleById(createdId);
  }

  const { records } = await getRoles({ page: 1, limit: 1, name: payload.name });
  if (records[0]) return records[0];
  throw { message: "فشل إنشاء الدور." };
};

export const updateRole = async (
  id: string,
  payload: Partial<RoleFormPayload>,
): Promise<AppRole> => {
  const current = await getRoleById(id);
  const response = await api.put(
    `/roles/${id}`,
    toRoleBody({
      name: payload.name ?? current.name,
      description:
        payload.description !== undefined ? payload.description : current.description,
      isDefault: payload.isDefault ?? current.isDefault,
      level: payload.level ?? current.level,
      permissionIds: payload.permissionIds ?? current.permissionIds ?? [],
    }),
  );
  assertMutationSuccess(response.data, "فشل تحديث الدور.");
  return getRoleById(id);
};

export const deleteRole = async (id: string) => {
  const response = await api.delete(`/roles/${id}`);
  assertMutationSuccess(response.data, "فشل حذف الدور.");
};
