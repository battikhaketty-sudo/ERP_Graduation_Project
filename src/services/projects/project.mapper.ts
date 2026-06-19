import type {
  Project,
  ProjectDetailStats,
  ProjectInvitation,
  ProjectMember,
  ProjectSection,
  ProjectStats,
  TaskStats,
} from "../../types/project";
import { invitationStatusFromApi, projectStatusFromApi, roleLabelFromApi } from "./project.enums";
import { extractRowNumber } from "../../utils/tableRowNumber";
import { buildTaskStatsFromTasks } from "./taskStorage";

const formatDate = (value?: string | null) => {
  if (!value) return "";
  return value.slice(0, 10);
};

const hashNumber = (id: string) => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 1000;
  }
  return hash || 101;
};

export const normalizeSection = (
  item: Record<string, unknown>,
  projectId: string,
): ProjectSection => ({
  id: String(item.sectionId ?? item.id ?? crypto.randomUUID()),
  projectId,
  name: String(item.name ?? "بدون اسم"),
  displayOrder: Number(item.displayOrder ?? 0),
  createdAt: formatDate(typeof item.createdAtUtc === "string" ? item.createdAtUtc : null),
});

export const normalizeMember = (item: Record<string, unknown>): ProjectMember => {
  const employeeId = String(item.employeeId ?? item.memberId ?? "");
  return {
    id: String(item.memberId ?? item.employeeId ?? crypto.randomUUID()),
    employeeId,
    employeeName: String(item.employeeName ?? "-"),
    role: roleLabelFromApi(item.role),
    joinedAt: formatDate(typeof item.joinedAtUtc === "string" ? item.joinedAtUtc : null),
    leftAt: formatDate(typeof item.leftAtUtc === "string" ? item.leftAtUtc : null),
    rowNumber: extractRowNumber(item),
  };
};

export const normalizeProjectListItem = (item: Record<string, unknown>): Project => {
  const id = String(item.projectId ?? item.id ?? crypto.randomUUID());

  return {
    id,
    number: extractRowNumber(item) ?? 0,
    name: String(item.name ?? "بدون اسم"),
    managerId: String(item.managerId ?? ""),
    managerName: String(item.managerName ?? "-"),
    assignedEmployeeId: "",
    assignedEmployeeName: "-",
    description: String(item.description ?? ""),
    startDate: formatDate(typeof item.startDate === "string" ? item.startDate : null),
    endDate: formatDate(typeof item.endDate === "string" ? item.endDate : null),
    status: projectStatusFromApi(item.status),
    budget: 0,
    rating: 0,
    goals: [],
    sections: [],
    tasks: [],
  };
};

export const normalizeProjectDetail = (item: Record<string, unknown>): Project => {
  const id = String(item.projectId ?? item.id ?? crypto.randomUUID());
  const sections = Array.isArray(item.sections)
    ? item.sections.map((section) =>
        normalizeSection(section as Record<string, unknown>, id),
      )
    : [];

  return {
    id,
    number: hashNumber(id),
    name: String(item.name ?? "بدون اسم"),
    managerId: String(item.managerId ?? ""),
    managerName: String(item.managerName ?? "-"),
    assignedEmployeeId: "",
    assignedEmployeeName: "-",
    description: String(item.description ?? ""),
    startDate: formatDate(typeof item.startDate === "string" ? item.startDate : null),
    endDate: formatDate(typeof item.endDate === "string" ? item.endDate : null),
    status: projectStatusFromApi(item.status),
    budget: 0,
    rating: 0,
    goals: [],
    sections,
    tasks: [],
    tasksCount: Number(item.tasksCount ?? 0),
    sectionsCount: Number(item.sectionsCount ?? sections.length),
    membersCount: Number(item.membersCount ?? 0),
    createdAt: formatDate(typeof item.createdAtUtc === "string" ? item.createdAtUtc : null),
  };
};

export const normalizeInvitation = (item: Record<string, unknown>): ProjectInvitation => {
  const projectId = String(item.projectId ?? "");
  const id = String(item.invitationId ?? item.id ?? crypto.randomUUID());

  return {
    id,
    projectId,
    projectName: String(item.projectName ?? "بدون اسم"),
    projectNumber: hashNumber(projectId),
    employeeId: String(item.invitedEmployeeId ?? item.employeeId ?? ""),
    employeeName: String(item.invitedEmployeeName ?? item.employeeName ?? "-"),
    role: roleLabelFromApi(item.role),
    message: typeof item.message === "string" ? item.message : undefined,
    status: invitationStatusFromApi(item.status),
    startDate: "",
    endDate: "",
    invitedAt: formatDate(typeof item.invitedAtUtc === "string" ? item.invitedAtUtc : null),
    expiresAt: formatDate(typeof item.expiresAtUtc === "string" ? item.expiresAtUtc : null),
  };
};

export const buildProjectStats = (
  projects: Project[],
  totalProjects: number,
): ProjectStats => {
  const assignees = new Set<string>();

  const totals = projects.reduce(
    (acc, project) => {
      acc.tasks += project.tasksCount ?? project.tasks.length;
      acc.sections += project.sectionsCount ?? project.sections.length;
      if (project.assignedEmployeeId) assignees.add(project.assignedEmployeeId);
      acc.members += project.membersCount ?? 0;
      return acc;
    },
    { tasks: 0, sections: 0, members: 0 },
  );

  return {
    projectsCount: totalProjects,
    tasksCount: totals.tasks,
    sectionsCount: totals.sections,
    assignedEmployeesCount: Math.max(assignees.size, totals.members),
  };
};

export const buildTaskStats = (project: Project): TaskStats =>
  buildTaskStatsFromTasks(project.tasks, project.sections);

export const buildProjectDetailStats = (project: Project, taskStats: TaskStats): ProjectDetailStats => ({
  membersCount: project.membersCount ?? 0,
  tasksCount: project.tasksCount ?? project.tasks.length,
  sectionsCount: project.sectionsCount ?? project.sections.length,
  completedTasksCount: taskStats.completed,
});
