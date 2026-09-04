import api from "../api";
import type {
  InvitationFormPayload,
  MemberFormPayload,
  Project,
  ProjectFormPayload,
  ProjectInvitation,
  ProjectSection,
  ProjectStats,
  ProjectTask,
  ProjectTaskDetail,
  ProjectTaskGraphEdge,
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
import { fetchAllPages } from "../../utils/fetchAllPages";
import {
  projectStatusToApi,
  roleIdFromLabel,
  sortTasksByPriority,
  taskDependencyTypeToApi,
  taskPriorityToApi,
} from "./project.enums";
import { toEndOfLocalDayIso } from "../../utils/manualDate";
import { calendarDateToUtcIso } from "../../utils/syriaTime";
import {
  buildTaskStatsFromTasks,
  filterProjectSections,
  normalizeInvitation,
  normalizeMember,
  normalizeProjectDetail,
  normalizeProjectListItem,
  normalizeSection,
  mergeProjectTaskGraph,
  normalizeProjectTaskGraphEdge,
  normalizeTaskDetail,
  normalizeTaskListItem,
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

const toIsoDate = (value: string) => {
  if (!value) return null;
  return calendarDateToUtcIso(value, false) || null;
};

const pickDefined = <T,>(next: T | undefined, previous: T | undefined, fallback: T): T =>
  next !== undefined ? next : previous !== undefined ? previous : fallback;

const toSectionCommandBody = (
  payload: Partial<SectionFormPayload>,
  current?: Pick<ProjectSection, "name" | "displayOrder" | "isFinalSection"> | null,
) => ({
  name: pickDefined(payload.name, current?.name, "").trim().slice(0, 200),
  displayOrder: pickDefined(payload.displayOrder, current?.displayOrder, 1),
  isFinalSection: Boolean(
    pickDefined(payload.isFinalSection, current?.isFinalSection, false),
  ),
});

const toProjectCommandBody = (
  payload: Partial<ProjectFormPayload>,
  current?: Pick<
    Project,
    "managerId" | "name" | "description" | "startDate" | "endDate" | "status"
  > | null,
) => ({
  managerId: pickDefined(payload.managerId, current?.managerId, ""),
  name: pickDefined(payload.name, current?.name, "").trim(),
  description: pickDefined(payload.description, current?.description, "").trim(),
  startDate: toIsoDate(pickDefined(payload.startDate, current?.startDate, "")),
  endDate: toIsoDate(pickDefined(payload.endDate, current?.endDate, "")),
  status: projectStatusToApi(
    pickDefined(payload.status, current?.status, "not_started"),
  ),
});

const mergeTaskFormPayload = (
  payload: Partial<TaskFormPayload>,
  current?: ProjectTask | null,
): TaskFormPayload => ({
  title: pickDefined(payload.title, current?.title, ""),
  description: pickDefined(payload.description, current?.description, ""),
  sectionId: pickDefined(payload.sectionId, current?.sectionId, ""),
  expectedHours: pickDefined(payload.expectedHours, current?.expectedHours, 0),
  startDate: pickDefined(payload.startDate, current?.startDate, ""),
  dueDate: pickDefined(payload.dueDate, current?.dueDate, ""),
  priority: pickDefined(payload.priority, current?.priority, "medium"),
  assigneeIds: pickDefined(payload.assigneeIds, current?.assigneeIds, []),
  assigneeNames: pickDefined(payload.assigneeNames, current?.assigneeNames, []),
  dependsOnTaskIds: pickDefined(
    payload.dependsOnTaskIds ??
      payload.dependencies?.map((item) => item.predecessorId),
    current?.dependsOnTaskIds,
    [],
  ),
  dependencies: pickDefined(
    payload.dependencies ??
      payload.dependsOnTaskIds?.map((predecessorId) => ({
        predecessorId,
        type: "finish_to_start" as const,
      })),
    current?.dependsOnTaskIds?.map((predecessorId) => ({
      predecessorId,
      type: "finish_to_start" as const,
    })),
    [],
  ),
});

type TasksQuery = {
  projectId?: string;
  projectSectionId?: string;
  page?: number;
  limit?: number;
  /** When true, GET /project-tasks returns tasks that have no predecessors. */
  withoutDependencies?: boolean;
  /** When set, GET /project-tasks filters by Completed. */
  completed?: boolean;
  /** Keep the page order from GET /project-tasks. */
  preserveApiOrder?: boolean;
};

const toTaskCommandBody = (payload: TaskFormPayload) => {
  const assignments = [
    ...new Set((payload.assigneeIds ?? []).map(String).filter(Boolean)),
  ];
  const dependencies = (
    payload.dependencies?.length
      ? payload.dependencies
      : (payload.dependsOnTaskIds ?? []).map((predecessorId) => ({
          predecessorId,
          type: "finish_to_start" as const,
        }))
  ).map((item) => ({
    predecessorId: item.predecessorId,
    type: taskDependencyTypeToApi(item.type),
  }));

  return {
    projectSectionId: payload.sectionId,
    title: payload.title.trim(),
    description: payload.description.trim() || null,
    priority: taskPriorityToApi(payload.priority),
    estimatedHours: payload.expectedHours,
    startDate: toIsoDate(payload.startDate),
    dueDate: payload.dueDate ? toIsoDate(payload.dueDate) : null,
    ...(dependencies.length ? { dependencies } : { dependencies: [] }),
    ...(assignments.length ? { assignments } : { assignments: [] }),
  };
};

export const listProjectTasks = async (query: TasksQuery = {}) => {
  const params: Record<string, string | number | boolean> = {
    Page: query.page ?? 1,
    Limit: query.limit ?? 50,
  };
  if (query.projectId) params.ProjectId = query.projectId;
  if (query.projectSectionId) params.ProjectSectionId = query.projectSectionId;
  if (query.withoutDependencies) params.WithoutDependencies = true;
  if (query.completed !== undefined) params.Completed = query.completed;

  const response = await api.get("/project-tasks", { params });
  const meta = unwrapPagedMeta(response.data);
  const mapped = unwrapPage<Record<string, unknown>>(response.data)
    .map((item) => normalizeTaskListItem(item, query.projectId ?? ""))
    .filter((item): item is ProjectTask => Boolean(item));
  const records = query.preserveApiOrder
    ? mapped
    : sortTasksByPriority(mapped);

  return {
    records,
    meta: {
      ...meta,
      totalPages: meta.totalItems
        ? Math.max(1, Math.ceil(meta.totalItems / (query.limit ?? 50)))
        : meta.totalPages,
    },
  };
};

export const getProjectTaskById = async (
  taskId: string,
  fallbackProjectId = "",
): Promise<ProjectTaskDetail> => {
  const response = await api.get(`/project-tasks/${taskId}`);
  const data = unwrapEntity<Record<string, unknown>>(response.data);
  const task = normalizeTaskDetail(data, fallbackProjectId);
  if (!task) {
    throw new Error("Task payload missing");
  }
  return task;
};

const unwrapTaskDependencyRows = (
  payload: unknown,
): Record<string, unknown>[] => {
  const page = unwrapPage<Record<string, unknown>>(payload);
  if (page.length) return page;

  const data = unwrapData<unknown>(payload);
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (!data || typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  for (const key of [
    "dependencies",
    "Dependencies",
    "edges",
    "Edges",
    "items",
    "Items",
  ]) {
    const rows = obj[key];
    if (Array.isArray(rows)) return rows as Record<string, unknown>[];
  }
  return [];
};

export const listProjectTaskDependencies = async (projectId: string) => {
  const response = await api.get("/project-tasks/dependencies", {
    params: { ProjectId: projectId },
  });
  const records = unwrapTaskDependencyRows(response.data)
    .map((item) => normalizeProjectTaskGraphEdge(item, projectId))
    .filter((item): item is ProjectTaskGraphEdge => Boolean(item));

  return { records };
};

const restrictGraphToTaskIds = (
  tasks: ProjectTask[],
  allowedIds: Set<string>,
) =>
  tasks
    .filter((task) => allowedIds.has(task.id))
    .map((task) => {
      const dependsOnTaskIds = task.dependsOnTaskIds.filter((id) =>
        allowedIds.has(id),
      );
      return {
        ...task,
        dependsOnTaskIds,
        dependencyCount: dependsOnTaskIds.length,
      };
    });

/** Incomplete tasks + predecessor edges for the project flow graph. */
export const getProjectTaskGraph = async (
  projectId: string,
  seedTasks: ProjectTask[] = [],
): Promise<ProjectTask[]> => {
  const [edgesResult, incompleteResult] = await Promise.allSettled([
    listProjectTaskDependencies(projectId),
    fetchAllPages(
      (page, limit) =>
        listProjectTasks({
          projectId,
          completed: false,
          page,
          limit,
        }),
      100,
    ),
  ]);

  if (edgesResult.status === "rejected") {
    throw edgesResult.reason;
  }

  const edges = edgesResult.value.records;
  const incompleteTasks =
    incompleteResult.status === "fulfilled" ? incompleteResult.value : seedTasks;
  const incompleteIds = new Set(incompleteTasks.map((task) => task.id));

  return sortTasksByPriority(
    restrictGraphToTaskIds(
      mergeProjectTaskGraph({
        projectId,
        edges,
        isolatedTasks: incompleteTasks,
        seedTasks: incompleteTasks,
      }),
      incompleteIds,
    ),
  );
};

const attachApiTasks = async (project: Project): Promise<Project> => {
  try {
    const { records, meta } = await listProjectTasks({
      projectId: project.id,
      page: 1,
      limit: 20,
    });
    return {
      ...project,
      tasks: sortTasksByPriority(records),
      tasksCount: project.tasksCount ?? (Number.isFinite(meta.totalItems) ? meta.totalItems : undefined),
    };
  } catch {
    return { ...project, tasks: project.tasks ?? [] };
  }
};

export const getProjects = async ({ page = 1, limit = 10, name }: ProjectsQuery = {}) => {
  const params: Record<string, string | number> = { Page: page, Limit: limit };
  if (name?.trim()) params.Name = name.trim();

  const response = await api.get("/projects", { params });
  const meta = unwrapPagedMeta(response.data);
  const records = unwrapPage<Record<string, unknown>>(response.data)
    .map((item) => normalizeProjectListItem(item))
    .filter((item): item is Project => Boolean(item));

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
  return attachApiTasks(project);
};

/** List-page totals only from APIs that actually return a count. */
export const getProjectStats = async (): Promise<ProjectStats> => {
  const { records, meta } = await getProjects({ page: 1, limit: 100 });
  const stats: ProjectStats = {
    projectsCount: meta.totalItems || records.length,
  };

  try {
    const tasksResult = await listProjectTasks({ page: 1, limit: 1 });
    if (Number.isFinite(tasksResult.meta.totalItems)) {
      stats.tasksCount = tasksResult.meta.totalItems;
    }
  } catch {
    // GET /projects has no tasksCount; skip the card rather than inventing 0.
  }

  return stats;
};

export const getTaskStats = async (projectId: string): Promise<TaskStats> => {
  try {
    const [{ records }, sections] = await Promise.all([
      listProjectTasks({
        projectId,
        page: 1,
        limit: 100,
      }),
      getProjectSections(projectId).catch(() => [] as ProjectSection[]),
    ]);
    return buildTaskStatsFromTasks(records, sections);
  } catch {
    return { total: 0, late: 0 };
  }
};

export const addProject = async (payload: ProjectFormPayload) => {
  const response = await api.post("/projects", toProjectCommandBody(payload));

  assertSuccess(response.data);
  const createdId = unwrapData<string>(response.data);
  if (!createdId) {
    throw new Error("Project created but id was not returned");
  }

  markOwnershipInitialized(String(createdId), []);

  return getProjectById(String(createdId));
};

export const updateProject = async (id: string, payload: Partial<ProjectFormPayload>) => {
  const current = await getProjectById(id);
  const response = await api.put(`/projects/${id}`, toProjectCommandBody(payload, current));

  assertMutationSuccess(response.data, "فشل تحديث المشروع.");
  return getProjectById(id);
};

export const deleteProject = async (id: string) => {
  const response = await api.delete(`/projects/${id}`);
  assertMutationSuccess(response.data, "فشل حذف المشروع.");
  clearSectionOwnership(id);
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

  return scoped;
};

export const getSectionById = async (projectId: string, sectionId: string) => {
  const response = await api.get(`/projects/${projectId}/sections/${sectionId}`);
  const entity = unwrapEntity<Record<string, unknown>>(response.data);
  const raw =
    entity && typeof entity === "object" && !entity.sectionId && !entity.id
      ? ((entity.section ?? entity.data ?? entity) as Record<string, unknown>)
      : entity;
  return normalizeSection(
    (raw ?? {}) as Record<string, unknown>,
    projectId,
  );
};

export const addSection = async (projectId: string, payload: SectionFormPayload) => {
  const response = await api.post(
    `/projects/${projectId}/sections`,
    toSectionCommandBody(payload),
  );

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

  return getProjectById(projectId);
};

export const updateSection = async (
  projectId: string,
  sectionId: string,
  payload: Partial<SectionFormPayload>,
) => {
  if (isOwnershipInitialized(projectId)) {
    const owned = getOwnedSectionIds(projectId);
    if (!owned.includes(sectionId)) {
      throw new Error("Section does not belong to this project");
    }
  }

  let current: ProjectSection | null = null;
  const needsCurrent =
    payload.name === undefined ||
    payload.displayOrder === undefined ||
    payload.isFinalSection === undefined;
  if (needsCurrent) {
    try {
      current = await getSectionById(projectId, sectionId);
    } catch {
      current = null;
    }
  }

  const response = await api.put(
    `/projects/${projectId}/sections/${sectionId}`,
    toSectionCommandBody(payload, current),
  );

  assertMutationSuccess(response.data, "فشل تحديث القسم.");

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
  const records = unwrapPage<Record<string, unknown>>(response.data)
    .map((item) => normalizeMember(item))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

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

export const getAllProjectMembers = async (projectId: string) =>
  fetchAllPages((page, limit) => getProjectMembers(projectId, { page, limit }));

/** Projects where this employee already appears as a member (id or userId). */
export const findProjectsForEmployee = async (employee: {
  id: string;
  userId?: string;
}) => {
  const lookup = new Set(
    [employee.id, employee.userId].map((value) => value?.trim()).filter(Boolean) as string[],
  );
  if (!lookup.size) return [];

  const projects = await getAllProjects();
  const matches = await Promise.all(
    projects.map(async (project) => {
      try {
        const result = await getProjectMembers(project.id, { page: 1, limit: 50 });
        const expected = result.meta.totalItems || result.records.length;
        if (result.records.length >= 20 && expected <= 2) {
          return null;
        }
        const hit = result.records.some((member) =>
          [member.id, member.employeeId, member.userId].some(
            (id) => id && lookup.has(id),
          ),
        );
        return hit ? { id: project.id, name: project.name } : null;
      } catch {
        return null;
      }
    }),
  );

  return matches.filter((item): item is { id: string; name: string } => Boolean(item));
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
  return unwrapPage<Record<string, unknown>>(response.data)
    .map((item) => normalizeInvitation(item, projectId))
    .filter((item): item is ProjectInvitation => Boolean(item))
    .filter((item) => item.projectId === projectId);
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

  return dedupeInvitationsById(merged);
};

export const getMyInvitationsPage = async (page = 1, limit = 50) => {
  const response = await api.get("/projects/invitations/my", {
    params: { Page: page, Limit: limit },
  });
  const meta = unwrapPagedMeta(response.data);
  const records = unwrapPage<Record<string, unknown>>(response.data)
    .map((item) => normalizeInvitation(item))
    .filter((item): item is ProjectInvitation => Boolean(item));

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

/** Incoming invitations for the signed-in employee. */
export const getMyInvitations = async () => {
  const records = await fetchAllPages(
    (page, limit) => getMyInvitationsPage(page, limit),
    50,
  );
  return dedupeInvitationsById(records);
};

export const addInvitation = async (payload: InvitationFormPayload) => {
  const response = await api.post(`/projects/${payload.projectId}/invitations`, {
    invitedEmployeeId: payload.employeeId,
    role: roleIdFromLabel(payload.role),
    message: (payload.message ?? "").slice(0, 2000),
    expiresAtUtc: payload.expiresAt
      ? toEndOfLocalDayIso(payload.expiresAt) ?? toIsoDate(payload.expiresAt)
      : null,
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
  const response = await api.post("/project-tasks", toTaskCommandBody(payload));
  assertMutationSuccess(response.data, "فشل إضافة المهمة.");
  return getProjectById(projectId);
};

export const updateTask = async (
  projectId: string,
  taskId: string,
  payload: Partial<TaskFormPayload>,
) => {
  let current: ProjectTask | null = null;
  const needsCurrent =
    payload.title === undefined ||
    payload.description === undefined ||
    payload.sectionId === undefined ||
    payload.expectedHours === undefined ||
    payload.startDate === undefined ||
    payload.dueDate === undefined ||
    payload.priority === undefined ||
    payload.assigneeIds === undefined ||
    payload.dependsOnTaskIds === undefined ||
    payload.dependencies === undefined;
  if (needsCurrent) {
    try {
      current = await getProjectTaskById(taskId, projectId);
    } catch {
      current = null;
    }
  }

  const response = await api.put(
    `/project-tasks/${taskId}`,
    toTaskCommandBody(mergeTaskFormPayload(payload, current)),
  );
  assertMutationSuccess(response.data, "فشل تحديث المهمة.");
  return getProjectById(projectId);
};

export const deleteTask = async (projectId: string, taskId: string) => {
  const response = await api.delete(`/project-tasks/${taskId}`);
  assertMutationSuccess(response.data, "فشل حذف المهمة.");
  return getProjectById(projectId);
};

export const linkTaskDependency = async (
  projectId: string,
  fromTaskId: string,
  toTaskId: string,
) => {
  const project = await getProjectById(projectId);
  const target = project.tasks.find((task) => task.id === toTaskId);
  if (!target || !project.tasks.some((task) => task.id === fromTaskId)) {
    throw new Error("Invalid task dependency");
  }

  const nextDeps = [...new Set([...(target.dependsOnTaskIds ?? []), fromTaskId])];
  await updateTask(projectId, toTaskId, {
    title: target.title,
    description: target.description,
    sectionId: target.sectionId,
    expectedHours: target.expectedHours,
    startDate: target.startDate,
    dueDate: target.dueDate,
    priority: target.priority,
    assigneeIds: target.assigneeIds,
    assigneeNames: target.assigneeNames,
    dependsOnTaskIds: nextDeps,
  });
  return getProjectById(projectId);
};

export const unlinkTaskDependency = async (
  projectId: string,
  fromTaskId: string,
  toTaskId: string,
) => {
  const project = await getProjectById(projectId);
  const target = project.tasks.find((task) => task.id === toTaskId);
  if (!target) return project;

  await updateTask(projectId, toTaskId, {
    title: target.title,
    description: target.description,
    sectionId: target.sectionId,
    expectedHours: target.expectedHours,
    startDate: target.startDate,
    dueDate: target.dueDate,
    priority: target.priority,
    assigneeIds: target.assigneeIds,
    assigneeNames: target.assigneeNames,
    dependsOnTaskIds: (target.dependsOnTaskIds ?? []).filter((id) => id !== fromTaskId),
  });
  return getProjectById(projectId);
};
