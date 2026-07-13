import api from "../api";
import type {
  AppPermission,
  PermissionFormPayload,
  PermissionsQuery,
} from "../../types/permission";
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
import { normalizePermission } from "./permission.mapper";

const toPermissionBody = (payload: PermissionFormPayload) => ({
  name: payload.name.trim(),
  description: payload.description?.trim() || null,
  resourceType: payload.resourceType.trim(),
});

export const getPermissions = async ({
  page = 1,
  limit = 50,
  name,
  resourceType,
}: PermissionsQuery = {}) => {
  const params: Record<string, string | number> = { Page: page, Limit: limit };
  if (name?.trim()) params.Name = name.trim();
  if (resourceType?.trim()) params.ResourceType = resourceType.trim();

  const response = await api.get("/permissions", { params });
  const meta = unwrapPagedMeta(response.data);
  const records = sortNewestFirst(
    unwrapPage<Record<string, unknown>>(response.data).map(normalizePermission),
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

export const getAllPermissions = async (name?: string) =>
  fetchAllPages((page, limit) => getPermissions({ page, limit, name }));

export const getPermissionById = async (id: string): Promise<AppPermission> => {
  const response = await api.get(`/permissions/${id}`);
  return normalizePermission(unwrapEntity(response.data) as Record<string, unknown>);
};

export const addPermission = async (
  payload: PermissionFormPayload,
): Promise<AppPermission> => {
  const response = await api.post("/permissions", toPermissionBody(payload));
  assertSuccess(response.data);

  const createdId = unwrapData<string>(response.data);
  if (typeof createdId === "string" && createdId.trim()) {
    return getPermissionById(createdId);
  }

  const { records } = await getPermissions({ page: 1, limit: 1, name: payload.name });
  if (records[0]) return records[0];
  throw { message: "فشل إنشاء الصلاحية." };
};

export const updatePermission = async (
  id: string,
  payload: PermissionFormPayload,
): Promise<AppPermission> => {
  const response = await api.put(`/permissions/${id}`, toPermissionBody(payload));
  assertMutationSuccess(response.data, "فشل تحديث الصلاحية.");
  return getPermissionById(id);
};

export const deletePermission = async (id: string) => {
  const response = await api.delete(`/permissions/${id}`);
  assertMutationSuccess(response.data, "فشل حذف الصلاحية.");
};
