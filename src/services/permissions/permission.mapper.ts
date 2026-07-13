import type { AppPermission } from "../../types/permission";

export const normalizePermission = (item: Record<string, unknown>): AppPermission => ({
  id: String(item.id ?? item.permissionId ?? ""),
  name: String(item.name ?? item.permissionName ?? "بدون اسم"),
  description:
    typeof item.description === "string" || item.description === null
      ? item.description
      : undefined,
  resourceType: String(item.resourceType ?? item.resource ?? ""),
  isFixed: Boolean(item.isFixed),
});
