import { getPermissions } from "../permissions";
import { getRoles } from "../roles";
import { getUsers } from "../users";

export type AccessStats = {
  usersCount: number;
  rolesCount: number;
  permissionsCount: number;
};

const countFrom = (result: {
  meta?: { totalItems?: number };
  records: unknown[];
}) => result.meta?.totalItems ?? result.records.length ?? 0;

export const getAccessStats = async (): Promise<AccessStats> => {
  const [usersResult, rolesResult, permissionsResult] = await Promise.allSettled([
    getUsers({ page: 1, limit: 1 }),
    getRoles({ page: 1, limit: 1 }),
    getPermissions({ page: 1, limit: 1 }),
  ]);

  return {
    usersCount:
      usersResult.status === "fulfilled" ? countFrom(usersResult.value) : 0,
    rolesCount:
      rolesResult.status === "fulfilled" ? countFrom(rolesResult.value) : 0,
    permissionsCount:
      permissionsResult.status === "fulfilled"
        ? countFrom(permissionsResult.value)
        : 0,
  };
};
