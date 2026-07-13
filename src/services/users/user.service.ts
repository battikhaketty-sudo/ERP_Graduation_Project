import api from "../api";
import type { UserAccount, UsersQuery } from "../../types/user";
import {
  assertMutationSuccess,
  unwrapEntity,
  unwrapPage,
  unwrapPagedMeta,
} from "../../utils/apiResponse";
import { sortNewestFirst } from "../../utils/listOrder";
import { normalizeUser } from "./user.mapper";

export const getUsers = async ({
  page = 1,
  limit = 50,
  email,
  activation,
  emailConfirmed,
}: UsersQuery = {}) => {
  const params: Record<string, string | number | boolean> = {
    Page: page,
    Limit: limit,
  };
  if (email?.trim()) params.Email = email.trim();
  if (activation !== undefined) params.Activation = activation;
  if (emailConfirmed !== undefined) params.EmailConfirmed = emailConfirmed;

  const response = await api.get("/users", { params });
  const meta = unwrapPagedMeta(response.data);
  const records = sortNewestFirst(
    unwrapPage<Record<string, unknown>>(response.data).map(normalizeUser),
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

export const getUserById = async (id: string): Promise<UserAccount> => {
  const response = await api.get(`/users/${id}`);
  return normalizeUser(unwrapEntity(response.data) as Record<string, unknown>);
};

export const updateUserRoles = async (userId: string, roleIds: string[]) => {
  const response = await api.put(`/users/${userId}/roles`, { roleIds });
  assertMutationSuccess(response.data, "فشل تحديث أدوار المستخدم.");
};

export const deleteUser = async (id: string) => {
  const response = await api.delete(`/users/${id}`);
  assertMutationSuccess(response.data, "فشل حذف المستخدم.");
};
