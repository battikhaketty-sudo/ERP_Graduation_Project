import api from "../api";
import type {
  InvitationFormPayload,
  MemberFormPayload,
  Project,
  ProjectFormPayload,
  ProjectInvitation,
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
  buildProjectStats,
  buildTaskStats,
  normalizeInvitation,
  normalizeMember,
  normalizeProjectDetail,
  normalizeProjectListItem,
  normalizeSection,
} from "./project.mapper";
import {
  addProjectTask,
  deleteProjectTask,
  getProjectTasks,
} from "./taskStorage";

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

const attachLocalTasks = (project: Project): Project => {
  const tasks = getProjectTasks(project.id);
  return {
    ...project,
    tasks,
    tasksCount: Math.max(project.tasksCount ?? 0, tasks.length),
  };
};
type InvitationsQuery = {
  page?: number;
  limit?: number;
  employeeName?: string;
  projectName?: string;
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
    unwrapPage<Record<string, unknown>>(response.data).map((item) =>
      normalizeProjectListItem(item),
    ),
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

  if (!project.sections.length) {
    try {
      project.sections = await getProjectSections(id);
      project.sectionsCount = project.sections.length;
    } catch {
      // sections are optional for display
    }
  }

  try {
    const membersResponse = await api.get(`/projects/${id}/members`, {
      params: { Page: 1, Limit: 1 },
    });
    const meta = unwrapPagedMeta(membersResponse.data);
    const members = unwrapPage<Record<string, unknown>>(membersResponse.data);
    if (meta.totalItems) {
      project.membersCount = meta.totalItems;
    }
    if (members[0]) {
      project.assignedEmployeeId = String(members[0].employeeId ?? "");
      project.assignedEmployeeName = String(members[0].employeeName ?? "-");
    }
  } catch {
    // members are optional for display
  }

  return attachLocalTasks(project);
};

export const getProjectStats = async (): Promise<ProjectStats> => {
  const { records, meta } = await getProjects({ page: 1, limit: 100 });
  const details = await Promise.all(
    records.slice(0, 20).map(async (project) => {
      try {
        return (await getProjectById(project.id)) as Project & {
          tasksCount?: number;
          sectionsCount?: number;
          membersCount?: number;
        };
      } catch {
        return project;
      }
    }),
  );

  return buildProjectStats(details, meta.totalItems || records.length);
};

export const getTaskStats = async (projectId: string): Promise<TaskStats> => {
  const project = await getProjectById(projectId);
  return buildTaskStats(project);
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
  if (createdId) {
    return getProjectById(createdId);
  }

  const { records } = await getProjects({ page: 1, limit: 1 });
  return records[0];
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
  return { success: true as const };
};

export const getProjectSections = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}/sections`);
  assertSuccess(response.data);
  const data = unwrapData<Record<string, unknown>[]>(response.data);
  if (Array.isArray(data)) {
    return data.map((item) => normalizeSection(item, projectId));
  }
  return unwrapPage<Record<string, unknown>>(response.data).map((item) =>
    normalizeSection(item, projectId),
  );
};

export const addSection = async (projectId: string, payload: SectionFormPayload) => {
  const response = await api.post(`/projects/${projectId}/sections`, {
    name: payload.name.trim(),
    displayOrder: payload.displayOrder,
  });

  assertMutationSuccess(response.data, "فشل إضافة القسم.");
  return getProjectById(projectId);
};

export const updateSection = async (
  projectId: string,
  sectionId: string,
  payload: SectionFormPayload,
) => {
  const response = await api.put(`/projects/${projectId}/sections/${sectionId}`, {
    name: payload.name.trim(),
    displayOrder: payload.displayOrder,
  });

  assertMutationSuccess(response.data, "فشل تحديث القسم.");
  return getProjectById(projectId);
};

export const deleteSection = async (projectId: string, sectionId: string) => {
  const response = await api.delete(`/projects/${projectId}/sections/${sectionId}`);
  assertMutationSuccess(response.data, "فشل حذف القسم.");
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
    unwrapPage<Record<string, unknown>>(response.data).map((item) =>
      normalizeMember(item),
    ),
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
    unwrapPage<Record<string, unknown>>(response.data).map(normalizeInvitation),
  );
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

  return sortNewestFirst(invitationGroups.flat());
};

export const addInvitation = async (payload: InvitationFormPayload) => {
  const response = await api.post(`/projects/${payload.projectId}/invitations`, {
    invitedEmployeeId: payload.employeeId,
    role: roleIdFromLabel(payload.role),
    message: payload.message ?? "",
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
  }
};

export const addTask = async (projectId: string, payload: TaskFormPayload) => {
  addProjectTask(projectId, payload);
  return getProjectById(projectId);
};

export const deleteTask = async (projectId: string, taskId: string) => {
  deleteProjectTask(projectId, taskId);
  return getProjectById(projectId);
};
