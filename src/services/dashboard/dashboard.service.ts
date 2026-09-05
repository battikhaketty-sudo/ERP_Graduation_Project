import { getEmployees } from "../employees";
import {
  getMyInvitationsPage,
  getProjects,
  listProjectTasks,
} from "../projects";
import type { Project, ProjectInvitation, ProjectTask } from "../../types/project";

export type DashboardSummary = {
  projectsCount: number;
  tasksCount: number;
  employeesCount: number;
  invitationsCount: number;
  projects: Project[];
  tasks: ProjectTask[];
  invitations: ProjectInvitation[];
};

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const [projectsResult, tasksResult, employeesResult, invitationsResult] =
    await Promise.all([
      getProjects({ page: 1, limit: 8 }),
      listProjectTasks({ page: 1, limit: 8, preserveApiOrder: true }),
      getEmployees(1, 1, { archived: false }),
      getMyInvitationsPage(1, 8),
    ]);

  return {
    projectsCount: projectsResult.meta.totalItems ?? projectsResult.records.length,
    tasksCount: tasksResult.meta.totalItems ?? tasksResult.records.length,
    employeesCount: employeesResult.totalCount ?? employeesResult.data.length,
    invitationsCount:
      invitationsResult.meta.totalItems ?? invitationsResult.records.length,
    projects: projectsResult.records,
    tasks: tasksResult.records,
    invitations: invitationsResult.records,
  };
};
