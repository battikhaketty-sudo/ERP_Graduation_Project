export type AppPermission = {
  id: string;
  name: string;
  description?: string | null;
  resourceType: string;
  isFixed: boolean;
};

export type PermissionFormPayload = {
  name: string;
  description?: string | null;
  resourceType: string;
};

export type PermissionsQuery = {
  page?: number;
  limit?: number;
  name?: string;
  resourceType?: string;
};
