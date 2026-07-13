export type UserRoleAssignment = {
  roleId: string;
  isFixed: boolean;
};

export type UserAccount = {
  id: string;
  email: string;
  isActive: boolean;
  emailConfirmed: boolean;
  createdAtUtc?: string;
  roles: UserRoleAssignment[];
  rolesCount: number;
};

export type UsersQuery = {
  page?: number;
  limit?: number;
  email?: string;
  activation?: boolean;
  emailConfirmed?: boolean;
};
