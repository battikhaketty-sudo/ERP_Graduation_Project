import { getDepartments } from "../hrApi";
import { getAllInvitations, getProjectStats } from "../projects";
import { getUsers } from "../users";

export type AccessStats = {
  membersCount: number;
  tasksCount: number;
  departmentsCount: number;
  pendingInvitationsCount: number;
};

export const getAccessStats = async (): Promise<AccessStats> => {
  const [usersResult, projectStats, departmentsResult, invitations] = await Promise.all([
    getUsers({ page: 1, limit: 1 }),
    getProjectStats(),
    getDepartments({ page: 1, limit: 1 }),
    getAllInvitations().catch(() => []),
  ]);

  return {
    membersCount: usersResult.meta.totalItems ?? usersResult.records.length,
    tasksCount: projectStats.tasksCount,
    departmentsCount: departmentsResult.meta.totalItems ?? departmentsResult.records.length,
    pendingInvitationsCount: invitations.filter((invitation) => invitation.status === "pending")
      .length,
  };
};
