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
  const [usersResult, projectStats, departmentsResult, invitations] = await Promise.allSettled([
    getUsers({ page: 1, limit: 1 }),
    getProjectStats(),
    getDepartments({ page: 1, limit: 1 }),
    getAllInvitations(),
  ]);

  const users = usersResult.status === "fulfilled" ? usersResult.value : null;
  const projects = projectStats.status === "fulfilled" ? projectStats.value : null;
  const departments = departmentsResult.status === "fulfilled" ? departmentsResult.value : null;
  const invitationRows = invitations.status === "fulfilled" ? invitations.value : [];

  return {
    membersCount: users?.meta.totalItems ?? users?.records.length ?? 0,
    tasksCount: projects?.tasksCount ?? 0,
    departmentsCount: departments?.meta.totalItems ?? departments?.records.length ?? 0,
    pendingInvitationsCount: invitationRows.filter((invitation) => invitation.status === "pending")
      .length,
  };
};
