import type { AppRole, RolePermissionAssignment } from "../../types/role";
import { readIsFixed } from "../../utils/readIsFixed";

const extractPermissions = (item: Record<string, unknown>): RolePermissionAssignment[] => {
  if (!Array.isArray(item.permissions)) return [];

  return item.permissions
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) return null;
      const row = entry as Record<string, unknown>;
      const permissionId = String(
        row.permissionId ?? row.PermissionId ?? row.id ?? row.Id ?? "",
      );
      if (!permissionId) return null;
      return {
        permissionId,
        isFixed: readIsFixed(row),
      };
    })
    .filter((entry): entry is RolePermissionAssignment => entry !== null);
};

export const normalizeRole = (item: Record<string, unknown>): AppRole => {
  const permissions = extractPermissions(item);
  const fixedIds = permissions.filter((p) => p.isFixed).map((p) => p.permissionId);
  const permissionIds = Array.from(
    new Set([...permissions.map((permission) => permission.permissionId), ...fixedIds]),
  );

  return {
    id: String(item.id ?? item.roleId ?? ""),
    name: String(item.name ?? item.roleName ?? "بدون اسم"),
    description:
      typeof item.description === "string" || item.description === null
        ? item.description
        : undefined,
    isDefault: Boolean(item.isDefault ?? item.IsDefault),
    level: Number(item.level ?? item.Level ?? 0) || 0,
    isFixed: readIsFixed(item),
    permissions,
    permissionIds,
    numberOfPermissions: Number(item.numberOfPermissions ?? permissions.length) || 0,
  };
};
