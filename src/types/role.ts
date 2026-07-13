export type RolePermissionAssignment = {
  permissionId: string;
  isFixed: boolean;
};

export type AppRole = {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  level: number;
  isFixed: boolean;
  numberOfPermissions: number;
  permissionIds: string[];
  permissions: RolePermissionAssignment[];
};

export type RoleFormPayload = {
  name: string;
  description?: string | null;
  isDefault: boolean;
  level: number;
  permissionIds?: string[];
};

export type RolesQuery = {
  page?: number;
  limit?: number;
  name?: string;
};
