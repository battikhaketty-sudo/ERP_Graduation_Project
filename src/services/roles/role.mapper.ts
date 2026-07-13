import type { AppRole, RolePermissionAssignment } from "../../types/role";

const extractPermissions = (item: Record<string, unknown>): RolePermissionAssignment[] => {
  if (!Array.isArray(item.permissions)) return [];

  return item.permissions
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) return null;
      const row = entry as Record<string, unknown>;
      const permissionId = String(row.permissionId ?? row.id ?? "");
      if (!permissionId) return null;
      return {
        permissionId,
        isFixed: Boolean(row.isFixed),
      };
    })
    .filter((entry): entry is RolePermissionAssignment => entry !== null);
};

export const normalizeRole = (item: Record<string, unknown>): AppRole => {
  const permissions = extractPermissions(item);

  return {
    id: String(item.id ?? item.roleId ?? ""),
    name: String(item.name ?? item.roleName ?? "بدون اسم"),
    description:
      typeof item.description === "string" || item.description === null
        ? item.description
        : undefined,
    isDefault: Boolean(item.isDefault),
    level: Number(item.level ?? 0) || 0,
    isFixed: Boolean(item.isFixed),
    permissions,
    permissionIds: permissions.map((permission) => permission.permissionId),
    numberOfPermissions: Number(item.numberOfPermissions ?? permissions.length) || 0,
  };
};
