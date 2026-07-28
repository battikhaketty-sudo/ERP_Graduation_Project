import api from "../api";
import type {
  InvitationFormPayload,
  MemberFormPayload,
  Project,
  ProjectFormPayload,
  ProjectInvitation,
  ProjectSection,
  ProjectStats,
  SectionFormPayload,
  TaskFormPayload,
  TaskStats,
} from "../../types/project";
import {
  assertMutationSuccess,
  assertSuccess,
  unwrapData,
  unwrapEntity,
  unwrapPage,
  unwrapPagedMeta,
} from "../../utils/apiResponse";
import { sortNewestFirst } from "../../utils/listOrder";
import { projectStatusToApi, roleIdFromLabel } from "./project.enums";
import {
  buildTaskStats,
  filterProjectSections,
  normalizeInvitation,
  normalizeMember,
  normalizeProjectDetail,
  normalizeProjectListItem,
  normalizeSection,
} from "./project.mapper";
import {
  clearSectionOwnership,
  getOwnedSectionIds,
  isOwnershipInitialized,
  markOwnershipInitialized,
  registerSectionOwnership,
  sameSectionIdSet,
  unregisterSectionOwnership,
} from "./sectionOwnership";
import {
  clearProjectSectionDeps,
  getProjectSectionDeps,
  pruneProjectSectionDeps,
  removeSectionFromDeps,
  setSectionDependsOn,
} from "./sectionDepsStorage";
import { sanitizeSectionDependsOn } from "./sectionDependencies";
import {
  addProjectTask,
  clearProjectTasks,
  countAllLocalTasks,
  deleteProjectTask,
  deleteTasksForSection,
  getProjectTasks,
  addTaskDependency,
  removeTaskDependency,
  updateProjectTask,
} from "./taskStorage";
import {
  clearProjectFlowAnchors,
  FLOW_END_ID,
  FLOW_START_ID,
  isFlowTerminalId,
  linkFlowAnchor,
  pruneProjectFlowAnchors,
  unlinkFlowAnchor,
} from "./flowAnchors";
import {
  clearProjectPoints,
  removeTaskPoints,
  syncTaskCompletionPoints,
} from "./performancePoints";

type ProjectsQuery = {
  page?: number;
  limit?: number;
  name?: string;
};

type MembersQuery = {
  page?: number;
  limit?: number;
  employeeName?: string;
  role?: number;
};

type InvitationsQuery = {
  page?: number;
  limit?: number;
  employeeName?: string;
  projectName?: string;
};

/** Cache leak probe for this browser session to avoid N× extra section fetches. */
let sectionLeakCache: boolean | null = null;
let sectionLeakProbe: Promise<boolean> | null = null;

const attachLocalTasks = (project: Project): Project => {
  const tasks = getProjectTasks(project.id, project.sections);
  return {
    ...project,
    tasks,
    tasksCount: Math.max(project.tasksCount ?? 0, tasks.length),
  };
};

const attachSectionDependencies = (
  projectId: string,
  sections: ProjectSection[],
): ProjectSection[] => {
  const depsMap = getProjectSectionDeps(projectId);
  const withDeps = sections.map((section) => ({
    ...section,
    dependsOnSectionIds: depsMap[section.id] ?? section.dependsOnSectionIds ?? [],
  }));

  return withDeps.map((section) => ({
    ...section,
    dependsOnSectionIds: sanitizeSectionDependsOn({
      sectionId: section.id,
      dependsOnSectionIds: section.dependsOnSectionIds,
      sections: withDeps,
    }),
  }));
};

const persistSectionDependencies = (
  projectId: string,
  sectionId: string,
  dependsOnSectionIds: string[] | undefined,
  sections: ProjectSection[],
) => {
  if (dependsOnSectionIds === undefined) return;

  const base = sections.some((section) => section.id === sectionId)
    ? sections
    : [
        ...sections,
        {
          id: sectionId,
          projectId,
          name: "",
          displayOrder: 0,
          dependsOnSectionIds: [],
        },
      ];

  const cleaned = sanitizeSectionDependsOn({
    sectionId,
    dependsOnSectionIds,
    sections: base,
  });
  setSectionDependsOn(projectId, sectionId, cleaned);
};

const toIsoDate = (value: string) => {
  if (!value) return null;
  return `${value}T00:00:00.000Z`;
};

export const getProjects = async ({ page = 1, limit = 10, name }: ProjectsQuery = {}) => {
  const params: Record<string, string | number> = { Page: page, Limit: limit };
  if (name?.trim()) params.Name = name.trim();

  const response = await api.get("/projects", { params });
  const meta = unwrapPagedMeta(response.data);
  const records = sortNewestFirst(
    unwrapPage<Record<string, unknown>>(response.data)
      .map((item) => normalizeProjectListItem(item))
      .filter((item): item is Project => Boolean(item)),
  );

  return {
    records,
    meta: {
      ...meta,
      totalPages: meta.totalItems
        ? Math.max(1, Math.ceil(meta.totalItems / limit))
        : meta.totalPages,
    },
  };
};

export const getAllProjects = async (name?: string) => {
  const { records } = await getProjects({ page: 1, limit: 100, name });
  return records;
};

export const getProjectById = async (id: string) => {
  const response = await api.get(`/projects/${id}`);
  const data = unwrapEntity<Record<string, unknown>>(response.data);
  const project = normalizeProjectDetail(data);

  try {
    project.sections = await getProjectSections(id);
  } catch {
    // Keep detail sections only if ownership already scopes them.
    if (isOwnershipInitialized(id)) {
      const owned = new Set(getOwnedSectionIds(id));
      project.sections = filterProjectSections(project.sections ?? [], id).filter(
        (section) => owned.has(section.id),
      );
    } else {
      project.sections = [];
    }
  }
  project.sectionsCount = project.sections.length;
  project.sections = attachSectionDependencies(id, project.sections);

  try {
    const membersResponse = await api.get(`/projects/${id}/members`, {
      params: { Page: 1, Limit: 1 },
    });
    const meta = unwrapPagedMeta(membersResponse.data);
    if (meta.totalItems) {
      project.membersCount = meta.totalItems;
    }
  } catch {
    // members count is optional for display
  }

  return attachLocalTasks(project);
};

/** Lightweight stats — no per-project detail fan-out. */
export const getProjectStats = async (): Promise<ProjectStats> => {
  const { records, meta } = await getProjects({ page: 1, limit: 100 });
  const projectIds = records.map((project) => project.id);
  const tasksCount = countAllLocalTasks(projectIds);
  const sectionsCount = projectIds.reduce(
    (sum, id) => sum + getOwnedSectionIds(id).length,
    0,
  );

  const assignees = new Set<string>();
  projectIds.forEach((id) => {
    getProjectTasks(id).forEach((task) => {
      task.assigneeIds.forEach((employeeId) => {
        if (employeeId) assignees.add(employeeId);
      });
    });
  });

  return {
    projectsCount: meta.totalItems || records.length,
    tasksCount,
    sectionsCount,
    assignedEmployeesCount: assignees.size,
  };
};

export const getTaskStats = async (projectId: string): Promise<TaskStats> => {
  // Prefer local tasks to avoid a second full project fetch when caller already loaded detail.
  const tasks = getProjectTasks(projectId);
  return buildTaskStats({
    id: projectId,
    number: projectId,
    name: "",
    managerId: "",
    managerName: "",
    assignedEmployeeId: "",
    assignedEmployeeName: "",
    description: "",
    startDate: "",
    endDate: "",
    status: "not_started",
    budget: 0,
    rating: 0,
    goals: [],
    sections: [],
    tasks,
  });
};

export const addProject = async (payload: ProjectFormPayload) => {
  const response = await api.post("/projects", {
    managerId: payload.managerId,
    name: payload.name.trim(),
    description: payload.description.trim(),
    startDate: toIsoDate(payload.startDate),
    endDate: toIsoDate(payload.endDate),
    status: projectStatusToApi(payload.status),
  });

  assertSuccess(response.data);
  const createdId = unwrapData<string>(response.data);
  if (!createdId) {
    throw new Error("Project created but id was not returned");
  }

  markOwnershipInitialized(String(createdId), []);
  return getProjectById(String(createdId));
};

export const updateProject = async (id: string, payload: Partial<ProjectFormPayload>) => {
  const response = await api.put(`/projects/${id}`, {
    managerId: payload.managerId,
    name: payload.name?.trim(),
    description: payload.description?.trim(),
    startDate: payload.startDate ? toIsoDate(payload.startDate) : null,
    endDate: payload.endDate ? toIsoDate(payload.endDate) : null,
    status: payload.status ? projectStatusToApi(payload.status) : undefined,
  });

  assertMutationSuccess(response.data, "فشل تحديث المشروع.");
  return getProjectById(id);
};

export const deleteProject = async (id: string) => {
  const response = await api.delete(`/projects/${id}`);
  assertMutationSuccess(response.data, "فشل حذف المشروع.");
  clearSectionOwnership(id);
  clearProjectTasks(id);
  clearProjectPoints(id);
  clearProjectFlowAnchors(id);
  clearProjectSectionDeps(id);
  return { success: true as const };
};

const fetchRawProjectSections = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}/sections`);
  assertSuccess(response.data);
  const data = unwrapData<Record<string, unknown>[]>(response.data);
  const raw = Array.isArray(data)
    ? data
    : unwrapPage<Record<string, unknown>>(response.data);
  return filterProjectSections(
    raw.map((item) => normalizeSection(item, projectId)),
    projectId,
  );
};

const detectGlobalSectionLeak = async (
  projectId: string,
  sectionIds: string[],
): Promise<boolean> => {
  if (sectionLeakCache !== null) return sectionLeakCache;
  if (sectionLeakProbe) return sectionLeakProbe;

  sectionLeakProbe = (async () => {
    try {
      const { records } = await getProjects({ page: 1, limit: 20 });
      const other = records.find((project) => project.id !== projectId);
      if (!other) {
        sectionLeakCache = true;
        return true;
      }
      const otherSections = await fetchRawProjectSections(other.id);
      const leaked = sameSectionIdSet(
        sectionIds,
        otherSections.map((section) => section.id),
      );
      sectionLeakCache = leaked;
      return leaked;
    } catch {
      sectionLeakCache = true;
      return true;
    } finally {
      sectionLeakProbe = null;
    }
  })();

  return sectionLeakProbe;
};

/**
 * Backend SectionItem has no projectId. Some environments return every project's
 * sections from GET /projects/{id}/sections. Keep only sections owned by this
 * project (local registry), and detect the leak before adopting unknown lists.
 */
export const getProjectSections = async (projectId: string) => {
  const sections = await fetchRawProjectSections(projectId);

  let scoped: ProjectSection[];

  if (isOwnershipInitialized(projectId)) {
    const owned = new Set(getOwnedSectionIds(projectId));
    scoped = sections.filter((section) => owned.has(section.id));
  } else if (!sections.length) {
    markOwnershipInitialized(projectId, []);
    scoped = sections;
  } else {
    const leaked = await detectGlobalSectionLeak(
      projectId,
      sections.map((section) => section.id),
    );

    if (leaked) {
      markOwnershipInitialized(projectId, []);
      scoped = [];
    } else {
      markOwnershipInitialized(
        projectId,
        sections.map((section) => section.id),
      );
      scoped = sections;
    }
  }

  pruneProjectSectionDeps(
    projectId,
    scoped.map((section) => section.id),
  );
  return attachSectionDependencies(projectId, scoped);
};

export const addSection = async (projectId: string, payload: SectionFormPayload) => {
  const response = await api.post(`/projects/${projectId}/sections`, {
    name: payload.name.trim().slice(0, 200),
    displayOrder: payload.displayOrder,
  });

  assertMutationSuccess(response.data, "فشل إضافة القسم.");
  let createdSectionId = "";
  const createdId = unwrapData<string>(response.data);
  if (createdId) {
    createdSectionId = String(createdId);
    registerSectionOwnership(projectId, createdSectionId);
  } else {
    const before = new Set(getOwnedSectionIds(projectId));
    const after = await fetchRawProjectSections(projectId);
    const name = payload.name.trim();
    const match =
      after
        .filter(
          (section) =>
            !before.has(section.id) &&
            section.name.trim() === name &&
            section.displayOrder === payload.displayOrder,
        )
        .sort((left, right) =>
          String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")),
        )[0] ??
      after.find(
        (section) => !before.has(section.id) && section.name.trim() === name,
      );
    if (match) {
      createdSectionId = match.id;
      registerSectionOwnership(projectId, match.id);
    } else {
      markOwnershipInitialized(projectId);
    }
  }

  if (createdSectionId) {
    const sections = await getProjectSections(projectId);
    persistSectionDependencies(
      projectId,
      createdSectionId,
      payload.dependsOnSectionIds ?? [],
      sections,
    );
  }

  return getProjectById(projectId);
};

export const updateSection = async (
  projectId: string,
  sectionId: string,
  payload: SectionFormPayload,
) => {
  if (isOwnershipInitialized(projectId)) {
    const owned = getOwnedSectionIds(projectId);
    if (!owned.includes(sectionId)) {
      throw new Error("Section does not belong to this project");
    }
  }

  const response = await api.put(`/projects/${projectId}/sections/${sectionId}`, {
    name: payload.name.trim().slice(0, 200),
    displayOrder: payload.displayOrder,
  });

  assertMutationSuccess(response.data, "فشل تحديث القسم.");

  const sections = await getProjectSections(projectId);
  persistSectionDependencies(
    projectId,
    sectionId,
    payload.dependsOnSectionIds,
    sections,
  );

  return getProjectById(projectId);
};

export const deleteSection = async (projectId: string, sectionId: string) => {
  if (isOwnershipInitialized(projectId)) {
    const owned = getOwnedSectionIds(projectId);
    if (!owned.includes(sectionId)) {
      throw new Error("Section does not belong to this project");
    }
  }

  const response = await api.delete(`/projects/${projectId}/sections/${sectionId}`);
  assertMutationSuccess(response.data, "فشل حذف القسم.");
  unregisterSectionOwnership(projectId, sectionId);
  removeSectionFromDeps(projectId, sectionId);

  const removedTasks = deleteTasksForSection(projectId, sectionId);
  removedTasks.forEach((task) => removeTaskPoints(task.id));
  pruneProjectFlowAnchors(
    projectId,
    getProjectTasks(projectId).map((task) => task.id),
  );

  return getProjectById(projectId);
};

export const getProjectMembers = async (projectId: string, query: MembersQuery = {}) => {
  const params: Record<string, string | number> = {
    Page: query.page ?? 1,
    Limit: query.limit ?? 10,
  };
  if (query.employeeName?.trim()) params.EmployeeName = query.employeeName.trim();
  if (query.role !== undefined) params.Role = query.role;

  const response = await api.get(`/projects/${projectId}/members`, { params });
  const meta = unwrapPagedMeta(response.data);
  const records = sortNewestFirst(
    unwrapPage<Record<string, unknown>>(response.data)
      .map((item) => normalizeMember(item))
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  );

  return {
    records,
    meta: {
      ...meta,
      totalPages: meta.totalItems
        ? Math.max(1, Math.ceil(meta.totalItems / (query.limit ?? 10)))
        : meta.totalPages,
    },
  };
};

export const updateMember = async (
  projectId: string,
  memberId: string,
  payload: MemberFormPayload,
) => {
  const response = await api.put(`/projects/${projectId}/members/${memberId}`, {
    role: roleIdFromLabel(payload.role),
  });

  assertMutationSuccess(response.data, "فشل تحديث العضو.");
};

export const deleteMember = async (projectId: string, memberId: string) => {
  const response = await api.delete(`/projects/${projectId}/members/${memberId}`);
  assertMutationSuccess(response.data, "فشل حذف العضو.");
};

export const getProjectInvitations = async (
  projectId: string,
  query: InvitationsQuery = {},
) => {
  const params: Record<string, string | number> = {
    Page: query.page ?? 1,
    Limit: query.limit ?? 50,
  };
  if (query.employeeName?.trim()) params.EmployeeName = query.employeeName.trim();
  if (query.projectName?.trim()) params.ProjectName = query.projectName.trim();

  const response = await api.get(`/projects/${projectId}/invitations`, { params });
  return sortNewestFirst(
    unwrapPage<Record<string, unknown>>(response.data)
      .map((item) =>
        normalizeInvitation({
          ...item,
          projectId: String(item.projectId ?? projectId),
        }),
      )
      .filter((item): item is ProjectInvitation => Boolean(item)),
  );
};

const dedupeInvitationsById = (invitations: ProjectInvitation[]) => {
  const unique = new Map<string, ProjectInvitation>();
  for (const invitation of invitations) {
    if (!unique.has(invitation.id)) {
      unique.set(invitation.id, invitation);
    }
  }
  return [...unique.values()];
};

export const getAllInvitations = async (query: InvitationsQuery = {}) => {
  const projects = await getAllProjects(query.projectName);
  const invitationGroups = await Promise.all(
    projects.map((project) =>
      getProjectInvitations(project.id, {
        employeeName: query.employeeName,
        limit: 50,
      }).catch(() => [] as ProjectInvitation[]),
    ),
  );

  const merged = invitationGroups.flatMap((group, index) => {
    const scopedProjectId = projects[index]?.id;
    if (!scopedProjectId) return [];

    return group.filter(
      (invitation) =>
        !invitation.projectId || invitation.projectId === scopedProjectId,
    );
  });

  return sortNewestFirst(dedupeInvitationsById(merged));
};

export const addInvitation = async (payload: InvitationFormPayload) => {
  const response = await api.post(`/projects/${payload.projectId}/invitations`, {
    invitedEmployeeId: payload.employeeId,
    role: roleIdFromLabel(payload.role),
    message: (payload.message ?? "").slice(0, 2000),
    expiresAtUtc: payload.expiresAt ? toIsoDate(payload.expiresAt) : null,
  });

  assertMutationSuccess(response.data, "فشل إرسال الدعوة.");
};

export const acceptInvitation = async (projectId: string, invitationId: string) => {
  const response = await api.post(
    `/projects/${projectId}/invitations/${invitationId}/accept`,
  );
  assertMutationSuccess(response.data, "فشل قبول الدعوة.");
};

export const rejectInvitation = async (projectId: string, invitationId: string) => {
  const response = await api.post(
    `/projects/${projectId}/invitations/${invitationId}/reject`,
  );
  assertMutationSuccess(response.data, "فشل رفض الدعوة.");
};

export const cancelInvitation = async (projectId: string, invitationId: string) => {
  const response = await api.post(
    `/projects/${projectId}/invitations/${invitationId}/cancel`,
  );
  assertMutationSuccess(response.data, "فشل إلغاء الدعوة.");
};

export const updateInvitationStatus = async (
  invitation: ProjectInvitation,
  status: ProjectInvitation["status"],
) => {
  if (status === "accepted") {
    await acceptInvitation(invitation.projectId, invitation.id);
    return;
  }
  if (status === "rejected") {
    await rejectInvitation(invitation.projectId, invitation.id);
    return;
  }
  if (status === "cancelled") {
    await cancelInvitation(invitation.projectId, invitation.id);
  }
};

export const addTask = async (projectId: string, payload: TaskFormPayload) => {
  const task = addProjectTask(projectId, payload);
  const project = await getProjectById(projectId);
  syncTaskCompletionPoints({
    projectId,
    projectName: project.name,
    previous: null,
    next: task,
  });
  return project;
};

export const updateTask = async (
  projectId: string,
  taskId: string,
  payload: TaskFormPayload,
) => {
  const previous =
    getProjectTasks(projectId).find((task) => task.id === taskId) ?? null;
  const updated = updateProjectTask(projectId, taskId, payload);
  const project = await getProjectById(projectId);
  syncTaskCompletionPoints({
    projectId,
    projectName: project.name,
    previous,
    next: updated,
  });
  return project;
};

export const deleteTask = async (projectId: string, taskId: string) => {
  deleteProjectTask(projectId, taskId);
  removeTaskPoints(taskId);
  pruneProjectFlowAnchors(
    projectId,
    getProjectTasks(projectId).map((task) => task.id),
  );
  return getProjectById(projectId);
};

export const linkTaskDependency = async (
  projectId: string,
  fromTaskId: string,
  toTaskId: string,
) => {
  const taskIds = getProjectTasks(projectId).map((task) => task.id);

  if (isFlowTerminalId(fromTaskId) || isFlowTerminalId(toTaskId)) {
    if (fromTaskId === FLOW_START_ID && toTaskId === FLOW_END_ID) {
      throw new Error("Cannot link start directly to end");
    }
    if (fromTaskId === FLOW_END_ID || toTaskId === FLOW_START_ID) {
      throw new Error("Invalid start/end direction");
    }
    linkFlowAnchor(projectId, fromTaskId, toTaskId, taskIds);
    return getProjectById(projectId);
  }

  const before =
    getProjectTasks(projectId).find((task) => task.id === toTaskId)
      ?.dependsOnTaskIds ?? [];
  const updated = addTaskDependency(projectId, fromTaskId, toTaskId);
  if (!updated) {
    throw new Error("Invalid task dependency");
  }
  if (
    !updated.dependsOnTaskIds.includes(fromTaskId) &&
    !before.includes(fromTaskId)
  ) {
    throw new Error("Dependency would create a cycle");
  }
  return getProjectById(projectId);
};

export const unlinkTaskDependency = async (
  projectId: string,
  fromTaskId: string,
  toTaskId: string,
) => {
  if (isFlowTerminalId(fromTaskId) || isFlowTerminalId(toTaskId)) {
    unlinkFlowAnchor(projectId, fromTaskId, toTaskId);
    return getProjectById(projectId);
  }

  removeTaskDependency(projectId, fromTaskId, toTaskId);
  return getProjectById(projectId);
};
