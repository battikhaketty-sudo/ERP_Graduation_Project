import type {
  Project,
  ProjectDetailStats,
  ProjectInvitation,
  ProjectMember,
  ProjectSection,
  ProjectStats,
  ProjectTask,
  ProjectTaskDetail,
  ProjectTaskGraphEdge,
  TaskAssignment,
  TaskDependency,
  TaskStats,
  TaskTransition,
} from "../../types/project";
import {
  invitationStatusFromApi,
  projectStatusFromApi,
  roleLabelFromApi,
  taskDependencyTypeFromApi,
  taskPriorityFromApi,
} from "./project.enums";
import { extractRowNumber } from "../../utils/tableRowNumber";
import { readApiBoolean } from "../../utils/readIsFixed";
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
    isFinalSection: readApiBoolean(item, "isFinalSection", "IsFinalSection"),
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
  const employeeId = readId(item.employeeId, item.EmployeeId);
  const userId = readId(item.userId, item.UserId);
  const memberId = readId(item.memberId, item.MemberId, item.id, item.Id);
  const assignmentId = memberId || employeeId || userId;
  if (!assignmentId) return null;

  return {
    id: assignmentId,
    employeeId: employeeId || assignmentId,
    userId: userId || undefined,
    employeeName: String(
      item.employeeName ?? item.EmployeeName ?? "-",
    ).slice(0, 200),
    role: roleLabelFromApi(item.role ?? item.Role),
    joinedAt: formatDate(
      typeof item.joinedAtUtc === "string"
        ? item.joinedAtUtc
        : typeof item.JoinedAtUtc === "string"
          ? item.JoinedAtUtc
          : null,
    ),
    leftAt: formatDate(
      typeof item.leftAtUtc === "string"
        ? item.leftAtUtc
        : typeof item.LeftAtUtc === "string"
          ? item.LeftAtUtc
          : null,
    ),
    rowNumber: extractRowNumber(item),
  };
};

/** Active project members only — left members cannot be assigned to tasks. */
export const isActiveProjectMember = (member: ProjectMember) => !member.leftAt?.trim();

export const memberLookupIds = (member: ProjectMember) =>
  [member.id, member.employeeId, member.userId].filter(
    (value): value is string => Boolean(value),
  );

export const toActiveAssigneeOptions = (members: ProjectMember[]) => {
  const options: Array<{ id: string; name: string }> = [];
  const seen = new Set<string>();

  for (const member of members) {
    if (!isActiveProjectMember(member)) continue;
    const id = member.userId || member.employeeId || member.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const lookupId of memberLookupIds(member)) seen.add(lookupId);
    options.push({ id, name: member.employeeName || id });
  }

  return options;
};

export const memberMatchesAssignment = (
  member: ProjectMember,
  assignment: { memberId?: string; employeeId?: string },
) => {
  const memberIds = new Set(memberLookupIds(member));
  return [assignment.memberId, assignment.employeeId].some(
    (value) => value && memberIds.has(value),
  );
};

export const assigneesFromMembers = (
  members: ProjectMember[],
  assignments: Array<{ memberId?: string; employeeId?: string; employeeName?: string }>,
) => {
  const options: Array<{ id: string; name: string }> = [];
  const seen = new Set<string>();

  for (const assignment of assignments) {
    const member = members.find(
      (item) => isActiveProjectMember(item) && memberMatchesAssignment(item, assignment),
    );
    if (!member) continue;
    const sendId = assignment.memberId || member.userId || member.id;
    if (!sendId || seen.has(sendId)) continue;
    seen.add(sendId);
    for (const lookupId of memberLookupIds(member)) seen.add(lookupId);
    options.push({
      id: sendId,
      name: member.employeeName || assignment.employeeName || sendId,
    });
  }

  return options;
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
  fallbackProjectId?: string,
): ProjectInvitation | null => {
  const projectId = readId(
    item.projectId,
    item.ProjectId,
    item.projectID,
    fallbackProjectId,
  );
  const id = readId(item.invitationId, item.InvitationId, item.id, item.Id);
  if (!id || !projectId) return null;

  return {
    id,
    projectId,
    projectName: String(item.projectName ?? item.ProjectName ?? "Untitled").slice(
      0,
      200,
    ),
    projectNumber: projectId,
    employeeId: String(
      item.invitedEmployeeId ??
        item.InvitedEmployeeId ??
        item.employeeId ??
        item.EmployeeId ??
        "",
    ),
    employeeName: String(
      item.invitedEmployeeName ??
        item.InvitedEmployeeName ??
        item.employeeName ??
        item.EmployeeName ??
        "-",
    ).slice(0, 200),
    role: roleLabelFromApi(item.role ?? item.Role),
    message:
      typeof item.message === "string"
        ? item.message.slice(0, 2000)
        : typeof item.Message === "string"
          ? item.Message.slice(0, 2000)
          : undefined,
    status: invitationStatusFromApi(item.status ?? item.Status),
    respondedAt: formatDate(
      typeof item.respondedAtUtc === "string"
        ? item.respondedAtUtc
        : typeof item.RespondedAtUtc === "string"
          ? item.RespondedAtUtc
          : typeof item.respondedAt === "string"
            ? item.respondedAt
            : typeof item.RespondedAt === "string"
              ? item.RespondedAt
              : typeof item.acceptedAtUtc === "string"
                ? item.acceptedAtUtc
                : typeof item.AcceptedAtUtc === "string"
                  ? item.AcceptedAtUtc
                  : typeof item.rejectedAtUtc === "string"
                    ? item.rejectedAtUtc
                    : typeof item.RejectedAtUtc === "string"
                      ? item.RejectedAtUtc
                      : null,
    ),
    invitedAt: formatDate(
      typeof item.invitedAtUtc === "string"
        ? item.invitedAtUtc
        : typeof item.InvitedAtUtc === "string"
          ? item.InvitedAtUtc
          : null,
    ),
    expiresAt: formatDate(
      typeof item.expiresAtUtc === "string"
        ? item.expiresAtUtc
        : typeof item.ExpiresAtUtc === "string"
          ? item.ExpiresAtUtc
          : null,
    ),
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
  lateTasksCount: taskStats.late,
});

const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  return value.slice(0, 10);
};

export const normalizeTaskListItem = (
  item: Record<string, unknown>,
  fallbackProjectId = "",
): ProjectTask | null => {
  const id = readId(item.id, item.Id, item.taskId, item.TaskId);
  if (!id) return null;

  const title = String(item.title ?? item.Title ?? "").slice(0, 200);
  const sectionId = readId(
    item.projectSectionId,
    item.ProjectSectionId,
    item.sectionId,
  );
  const dependencyCount = Number(item.dependencyCount ?? item.DependencyCount ?? 0) || 0;
  const assignmentCount = Number(item.assignmentCount ?? item.AssignmentCount ?? 0) || 0;
  const transitionCount = Number(item.transitionCount ?? item.TransitionCount ?? 0) || 0;

  return {
    id,
    projectId: fallbackProjectId,
    sectionId,
    sectionName: String(
      item.projectSectionName ?? item.ProjectSectionName ?? "",
    ).slice(0, 200),
    number: Number(item.number ?? item.Number ?? 0) || 0,
    name: title,
    title,
    description: String(item.description ?? item.Description ?? "").slice(0, 5000),
    priority: taskPriorityFromApi(item.priority ?? item.Priority),
    expectedHours: Math.max(
      0,
      Number(item.estimatedHours ?? item.EstimatedHours ?? 0) || 0,
    ),
    startDate: formatDateTime(
      typeof item.startDate === "string"
        ? item.startDate
        : typeof item.StartDate === "string"
          ? item.StartDate
          : null,
    ),
    dueDate: formatDateTime(
      typeof item.dueDate === "string"
        ? item.dueDate
        : typeof item.DueDate === "string"
          ? item.DueDate
          : null,
    ),
    createdAt: formatDateTime(
      typeof item.createdAtUtc === "string"
        ? item.createdAtUtc
        : typeof item.CreatedAtUtc === "string"
          ? item.CreatedAtUtc
          : null,
    ),
    assigneeIds: [],
    assigneeNames: [],
    dependsOnTaskIds: [],
    dependencyCount,
    assignmentCount,
    transitionCount,
  };
};

const normalizeTaskAssignment = (
  item: Record<string, unknown>,
): TaskAssignment | null => {
  const memberId = readId(item.memberId, item.MemberId);
  const employeeId = readId(item.employeeId, item.EmployeeId);
  const assignmentId = memberId || employeeId;
  if (!assignmentId) return null;
  return {
    memberId: assignmentId,
    employeeId: employeeId || assignmentId,
    employeeName: String(
      item.employeeName ?? item.EmployeeName ?? "-",
    ).slice(0, 200),
    assignedAt: formatDateTime(
      typeof item.assignedAtUtc === "string"
        ? item.assignedAtUtc
        : typeof item.AssignedAtUtc === "string"
          ? item.AssignedAtUtc
          : null,
    ),
  };
};

const normalizeTaskDependency = (
  item: Record<string, unknown>,
): TaskDependency | null => {
  const taskId = readId(item.taskId, item.TaskId, item.predecessorId);
  if (!taskId) return null;
  return {
    taskId,
    taskTitle: String(item.taskTitle ?? item.TaskTitle ?? taskId).slice(0, 200),
    dependencyType: taskDependencyTypeFromApi(
      item.dependencyType ?? item.DependencyType ?? item.type,
    ),
    createdAt: formatDateTime(
      typeof item.createdAtUtc === "string"
        ? item.createdAtUtc
        : typeof item.CreatedAtUtc === "string"
          ? item.CreatedAtUtc
          : null,
    ),
  };
};

const normalizeTaskTransition = (
  item: Record<string, unknown>,
  taskId: string,
  index: number,
): TaskTransition => {
  const fromSectionId = readId(item.fromSectionId, item.FromSectionId);
  const toSectionId = readId(item.toSectionId, item.ToSectionId);
  const employeeId = readId(item.employeeId, item.EmployeeId);
  const createdAtUtc = String(
    item.createdAtUtc ?? item.CreatedAtUtc ?? "",
  );
  return {
    id: readId(item.id, item.Id) || `${taskId}-${fromSectionId}-${toSectionId}-${index}`,
    taskId,
    memberId: employeeId,
    memberName: String(item.employeeName ?? item.EmployeeName ?? "-").slice(0, 200),
    fromSectionId,
    fromSectionName: String(
      item.fromSectionName ?? item.FromSectionName ?? fromSectionId,
    ).slice(0, 200),
    toSectionId,
    toSectionName: String(
      item.toSectionName ?? item.ToSectionName ?? toSectionId,
    ).slice(0, 200),
    createdAtUtc,
  };
};

export const normalizeTaskDetail = (
  item: Record<string, unknown>,
  fallbackProjectId = "",
): ProjectTaskDetail | null => {
  const base = normalizeTaskListItem(item, fallbackProjectId);
  if (!base) return null;

  const startDate = formatDateTime(
    typeof item.startDateUtc === "string"
      ? item.startDateUtc
      : typeof item.StartDateUtc === "string"
        ? item.StartDateUtc
        : typeof item.startDate === "string"
          ? item.startDate
          : null,
  );
  const dueDate = formatDateTime(
    typeof item.dueDateUtc === "string"
      ? item.dueDateUtc
      : typeof item.DueDateUtc === "string"
        ? item.DueDateUtc
        : typeof item.dueDate === "string"
          ? item.dueDate
          : null,
  );

  const assignments = Array.isArray(item.assignments)
    ? item.assignments
        .map((row) => normalizeTaskAssignment(row as Record<string, unknown>))
        .filter((row): row is TaskAssignment => Boolean(row))
    : Array.isArray(item.Assignments)
      ? item.Assignments.map((row) =>
          normalizeTaskAssignment(row as Record<string, unknown>),
        ).filter((row): row is TaskAssignment => Boolean(row))
      : [];

  const dependencies = Array.isArray(item.dependencies)
    ? item.dependencies
        .map((row) => normalizeTaskDependency(row as Record<string, unknown>))
        .filter((row): row is TaskDependency => Boolean(row))
    : Array.isArray(item.Dependencies)
      ? item.Dependencies.map((row) =>
          normalizeTaskDependency(row as Record<string, unknown>),
        ).filter((row): row is TaskDependency => Boolean(row))
      : [];

  const rawTransitions = Array.isArray(item.transitions)
    ? item.transitions
    : Array.isArray(item.Transitions)
      ? item.Transitions
      : [];
  const transitions = rawTransitions.map((row, index) =>
    normalizeTaskTransition(row as Record<string, unknown>, base.id, index),
  );

  return {
    ...base,
    sectionId: readId(
      item.projectSectionId,
      item.ProjectSectionId,
      base.sectionId,
    ),
    sectionName: String(
      item.projectSectionName ?? item.ProjectSectionName ?? base.sectionName ?? "",
    ).slice(0, 200),
    startDate: startDate || base.startDate,
    dueDate: dueDate || base.dueDate,
    assigneeIds: assignments.map((row) => row.memberId).filter(Boolean),
    assigneeNames: assignments.map((row) => row.employeeName),
    dependsOnTaskIds: dependencies.map((row) => row.taskId),
    dependencyCount: dependencies.length,
    assignmentCount: assignments.length,
    transitionCount: transitions.length,
    assignments,
    dependencies,
    transitions,
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const stubGraphTask = (
  projectId: string,
  id: string,
  title = "",
): ProjectTask => ({
  id,
  projectId,
  sectionId: "",
  number: 0,
  name: title,
  title: title || id,
  description: "",
  priority: "medium",
  expectedHours: 0,
  startDate: "",
  dueDate: "",
  assigneeIds: [],
  assigneeNames: [],
  dependsOnTaskIds: [],
});

const readNestedTask = (
  item: Record<string, unknown>,
  fallbackProjectId: string,
  ...keys: string[]
): ProjectTask | null => {
  for (const key of keys) {
    const nested = asRecord(item[key]);
    if (!nested) continue;
    const task = normalizeTaskListItem(nested, fallbackProjectId);
    if (task) return task;
  }
  return null;
};

export const normalizeProjectTaskGraphEdge = (
  item: Record<string, unknown>,
  fallbackProjectId = "",
): ProjectTaskGraphEdge | null => {
  const task = readNestedTask(
    item,
    fallbackProjectId,
    "task",
    "Task",
    "dependentTask",
    "DependentTask",
    "successor",
    "Successor",
    "currentTask",
    "CurrentTask",
  );
  const predecessor = readNestedTask(
    item,
    fallbackProjectId,
    "predecessor",
    "Predecessor",
    "previousTask",
    "PreviousTask",
    "dependsOnTask",
    "DependsOnTask",
    "fromTask",
    "FromTask",
  );

  const taskId = readId(
    item.taskId,
    item.TaskId,
    item.dependentTaskId,
    item.DependentTaskId,
    item.successorId,
    item.SuccessorId,
    item.toTaskId,
    item.ToTaskId,
    task?.id,
  );
  const predecessorId = readId(
    item.predecessorTaskId,
    item.PredecessorTaskId,
    item.predecessorId,
    item.PredecessorId,
    item.dependsOnTaskId,
    item.DependsOnTaskId,
    item.fromTaskId,
    item.FromTaskId,
    item.previousTaskId,
    item.PreviousTaskId,
    predecessor?.id,
  );

  if (!taskId || !predecessorId || taskId === predecessorId) return null;

  const taskTitle = String(
    item.taskTitle ??
      item.TaskTitle ??
      item.title ??
      item.Title ??
      task?.title ??
      taskId,
  ).slice(0, 200);
  const predecessorTitle = String(
    item.predecessorTitle ??
      item.PredecessorTitle ??
      item.predecessorTaskTitle ??
      item.PredecessorTaskTitle ??
      item.previousTaskTitle ??
      item.PreviousTaskTitle ??
      predecessor?.title ??
      predecessorId,
  ).slice(0, 200);

  const taskFromRow =
    task ??
    (taskId
      ? {
          ...stubGraphTask(fallbackProjectId, taskId, taskTitle),
          priority: taskPriorityFromApi(
            item.priority ?? item.Priority ?? item.priorityName ?? item.PriorityName,
          ),
        }
      : null);

  return {
    id:
      readId(item.id, item.Id) || `${predecessorId}->${taskId}`,
    taskId,
    taskTitle,
    predecessorId,
    predecessorTitle,
    dependencyType: taskDependencyTypeFromApi(
      item.dependencyType ??
        item.DependencyType ??
        item.dependencyTypeName ??
        item.DependencyTypeName ??
        item.type ??
        item.Type,
    ),
    task: taskFromRow
      ? { ...taskFromRow, title: taskFromRow.title || taskTitle, name: taskFromRow.name || taskTitle }
      : null,
    predecessor: predecessor
      ? {
          ...predecessor,
          title: predecessor.title || predecessorTitle,
          name: predecessor.name || predecessorTitle,
        }
      : null,
  };
};

const upsertGraphTask = (
  byId: Map<string, ProjectTask>,
  incoming: ProjectTask | null | undefined,
) => {
  if (!incoming?.id) return;
  const prev = byId.get(incoming.id);
  if (!prev) {
    byId.set(incoming.id, incoming);
    return;
  }
  byId.set(incoming.id, {
    ...incoming,
    ...prev,
    title: prev.title || incoming.title,
    name: prev.name || incoming.name,
    sectionId: prev.sectionId || incoming.sectionId,
    sectionName: prev.sectionName || incoming.sectionName,
    description: prev.description || incoming.description,
    startDate: prev.startDate || incoming.startDate,
    dueDate: prev.dueDate || incoming.dueDate,
    priority: prev.priority || incoming.priority,
  });
};

/** Merge dependency edges + isolated tasks into a draw-ready task list. */
export const mergeProjectTaskGraph = (input: {
  projectId: string;
  edges: ProjectTaskGraphEdge[];
  isolatedTasks: ProjectTask[];
  seedTasks?: ProjectTask[];
}): ProjectTask[] => {
  const byId = new Map<string, ProjectTask>();
  const depsByTask = new Map<string, string[]>();

  (input.seedTasks ?? []).forEach((task) => upsertGraphTask(byId, task));
  input.isolatedTasks.forEach((task) =>
    upsertGraphTask(byId, { ...task, dependsOnTaskIds: [], dependencyCount: 0 }),
  );

  input.edges.forEach((edge) => {
    upsertGraphTask(byId, edge.task);
    upsertGraphTask(byId, edge.predecessor);
    if (!byId.has(edge.taskId)) {
      upsertGraphTask(
        byId,
        stubGraphTask(input.projectId, edge.taskId, edge.taskTitle),
      );
    }
    if (!byId.has(edge.predecessorId)) {
      upsertGraphTask(
        byId,
        stubGraphTask(input.projectId, edge.predecessorId, edge.predecessorTitle),
      );
    }

    const next = depsByTask.get(edge.taskId) ?? [];
    if (!next.includes(edge.predecessorId)) next.push(edge.predecessorId);
    depsByTask.set(edge.taskId, next);
  });

  return [...byId.values()].map((task) => {
    const dependsOnTaskIds = depsByTask.get(task.id) ?? [];
    return {
      ...task,
      projectId: task.projectId || input.projectId,
      dependsOnTaskIds,
      dependencyCount: dependsOnTaskIds.length,
    };
  });
};
