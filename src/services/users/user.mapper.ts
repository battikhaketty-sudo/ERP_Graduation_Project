import type { UserAccount, UserRoleAssignment } from "../../types/user";
import { readIsFixed } from "../../utils/readIsFixed";

export const normalizeUserRoleAssignment = (
  item: Record<string, unknown>,
): UserRoleAssignment => ({
  roleId: String(
    item.roleId ?? item.RoleId ?? item.id ?? item.Id ?? "",
  ).trim(),
  isFixed: readIsFixed(item),
});

export const normalizeUser = (item: Record<string, unknown>): UserAccount => {
  const roleItems = Array.isArray(item.roles)
    ? item.roles
    : Array.isArray(item.Roles)
      ? item.Roles
      : Array.isArray(item.userRoles)
        ? item.userRoles
        : Array.isArray(item.roleAssignments)
          ? item.roleAssignments
          : [];

  const roles = roleItems.map((role) =>
    normalizeUserRoleAssignment(role as Record<string, unknown>),
  );

  const rolesCountValue = item.rolesCount ?? item.RolesCount ?? item.roleCount;
  const rolesCount =
    typeof rolesCountValue === "number"
      ? rolesCountValue
      : Number(rolesCountValue) || roles.length;

  return {
    id: String(item.id ?? ""),
    email: String(item.email ?? ""),
    isActive: Boolean(item.isActive ?? true),
    emailConfirmed: Boolean(item.emailConfirmed ?? false),
    createdAtUtc:
      typeof item.createdAtUtc === "string"
        ? item.createdAtUtc.slice(0, 10)
        : undefined,
    roles,
    rolesCount,
  };
};
