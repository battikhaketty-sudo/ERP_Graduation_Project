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

const readId = (...candidates: unknown[]): string => {
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const value = String(candidate).trim();
    if (value) return value;
  }
  return "";
};

export const normalizeSection = (
  item: Record<string, unknown>,
  fallbackProjectId: string,
): ProjectSection | null => {
  const id = readId(item.sectionId, item.id);
  if (!id) return null;

  const rawProjectId = item.projectId ?? item.ProjectId ?? item.projectID;
  const projectId =
    rawProjectId != null && String(rawProjectId).trim()
      ? String(rawProjectId)
      : fallbackProjectId;

  return {
    id,
    projectId,
    name: String(item.name ?? "Untitled").slice(0, 200),
    displayOrder: Number(item.displayOrder ?? 0) || 0,
    createdAt: formatDate(
      typeof item.createdAtUtc === "string" ? item.createdAtUtc : null,
    ),
    dependsOnSectionIds: [],
  };
};

/** Keep only sections that belong to the given project. */
export const filterProjectSections = (
  sections: Array<ProjectSection | null | undefined>,
  projectId: string,
): ProjectSection[] => {
  const seen = new Set<string>();
  return sections
    .filter((section): section is ProjectSection => Boolean(section?.id))
    .filter((section) => {
      if (section.projectId && section.projectId !== projectId) return false;
      if (seen.has(section.id)) return false;
      seen.add(section.id);
      return true;
    })
    .map((section) => ({ ...section, projectId }))
    .sort((left, right) => left.displayOrder - right.displayOrder);
};

export const normalizeMember = (item: Record<string, unknown>): ProjectMember | null => {
  const employeeId = readId(item.employeeId, item.memberId);
  const id = readId(item.memberId, item.employeeId);
  if (!id || !employeeId) return null;

  return {
    id,
    employeeId,
    employeeName: String(item.employeeName ?? "-").slice(0, 200),
    role: roleLabelFromApi(item.role),
    joinedAt: formatDate(typeof item.joinedAtUtc === "string" ? item.joinedAtUtc : null),
    leftAt: formatDate(typeof item.leftAtUtc === "string" ? item.leftAtUtc : null),
    rowNumber: extractRowNumber(item),
  };
};

export const normalizeProjectListItem = (item: Record<string, unknown>): Project | null => {
  const id = readId(item.projectId, item.id);
  if (!id) return null;

  return {
    id,
    number: id,
    name: String(item.name ?? "Untitled").slice(0, 200),
    managerId: String(item.managerId ?? ""),
    managerName: String(item.managerName ?? "-").slice(0, 200),
    assignedEmployeeId: "",
    assignedEmployeeName: "-",
    description: String(item.description ?? "").slice(0, 5000),
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
  const id = readId(item.projectId, item.id);
  if (!id) {
    throw new Error("Project id missing from API response");
  }

  const sections = filterProjectSections(
    Array.isArray(item.sections)
      ? item.sections.map((section) =>
          normalizeSection(section as Record<string, unknown>, id),
        )
      : [],
    id,
  );

  return {
    id,
    number: id,
    name: String(item.name ?? "Untitled").slice(0, 200),
    managerId: String(item.managerId ?? ""),
    managerName: String(item.managerName ?? "-").slice(0, 200),
    assignedEmployeeId: "",
    assignedEmployeeName: "-",
    description: String(item.description ?? "").slice(0, 5000),
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

export const normalizeInvitation = (
  item: Record<string, unknown>,
): ProjectInvitation | null => {
  const projectId = readId(item.projectId);
  const id = readId(item.invitationId, item.id);
  if (!id || !projectId) return null;

  return {
    id,
    projectId,
    projectName: String(item.projectName ?? "Untitled").slice(0, 200),
    projectNumber: projectId,
    employeeId: String(item.invitedEmployeeId ?? item.employeeId ?? ""),
    employeeName: String(item.invitedEmployeeName ?? item.employeeName ?? "-").slice(
      0,
      200,
    ),
    role: roleLabelFromApi(item.role),
    message: typeof item.message === "string" ? item.message.slice(0, 2000) : undefined,
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

export const buildProjectDetailStats = (
  project: Project,
  taskStats: TaskStats,
): ProjectDetailStats => ({
  membersCount: project.membersCount ?? 0,
  tasksCount: project.tasksCount ?? project.tasks.length,
  sectionsCount: project.sectionsCount ?? project.sections.length,
  completedTasksCount: taskStats.completed,
});
