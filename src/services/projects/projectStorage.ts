import { seedInvitations, seedProjects } from "../../data/projectSeed";
import type {
  InvitationFormPayload,
  Project,
  ProjectFormPayload,
  ProjectInvitation,
  ProjectSection,
  ProjectStats,
  SectionFormPayload,
  TaskFormPayload,
  TaskStats,
} from "../../types/project";

const STORAGE_KEY = "hr_projects_store";

type ProjectStore = {
  projects: Project[];
  invitations: ProjectInvitation[];
  nextProjectNumber: number;
};

const readStore = (): ProjectStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        projects: seedProjects,
        invitations: seedInvitations,
        nextProjectNumber: 104,
      };
    }
    return JSON.parse(raw) as ProjectStore;
  } catch {
    return {
      projects: seedProjects,
      invitations: seedInvitations,
      nextProjectNumber: 104,
    };
  }
};

const writeStore = (store: ProjectStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const getAllProjects = (): Project[] => clone(readStore().projects);

export const getProjectById = (id: string): Project | null => {
  const project = readStore().projects.find((item) => item.id === id);
  return project ? clone(project) : null;
};

export const getAllInvitations = (): ProjectInvitation[] => clone(readStore().invitations);

export const getProjectStats = (): ProjectStats => {
  const store = readStore();
  const assignees = new Set<string>();

  store.projects.forEach((project) => {
    if (project.assignedEmployeeId) assignees.add(project.assignedEmployeeId);
    project.tasks.forEach((task) => {
      task.assigneeIds.forEach((id) => assignees.add(id));
    });
  });

  return {
    projectsCount: store.projects.length,
    tasksCount: store.projects.reduce((sum, project) => sum + project.tasks.length, 0),
    sectionsCount: store.projects.reduce((sum, project) => sum + project.sections.length, 0),
    assignedEmployeesCount: assignees.size,
  };
};

export const getTaskStats = (projectId: string): TaskStats => {
  const project = readStore().projects.find((item) => item.id === projectId);
  if (!project) return { total: 0, inProgress: 0, completed: 0, late: 0 };

  const today = new Date().toISOString().slice(0, 10);
  const completedSectionIds = new Set(
    project.sections.filter((section) => section.name.includes("مكتمل")).map((s) => s.id),
  );
  const progressSectionIds = new Set(
    project.sections
      .filter((section) => section.name.includes("قيد") || section.name.includes("تنفيذ"))
      .map((s) => s.id),
  );

  let completed = 0;
  let inProgress = 0;
  let late = 0;

  project.tasks.forEach((task) => {
    if (completedSectionIds.has(task.sectionId)) {
      completed += 1;
      return;
    }
    if (progressSectionIds.has(task.sectionId)) {
      inProgress += 1;
      if (task.dueDate < today) late += 1;
      return;
    }
    if (task.dueDate < today) late += 1;
  });

  return {
    total: project.tasks.length,
    inProgress,
    completed,
    late,
  };
};

export const addProject = (payload: ProjectFormPayload): Project => {
  const store = readStore();
  const id = crypto.randomUUID();
  const project: Project = {
    id,
    number: id,
    name: payload.name.trim(),
    managerId: payload.managerId,
    managerName: payload.managerName,
    assignedEmployeeId: payload.assignedEmployeeId,
    assignedEmployeeName: payload.assignedEmployeeName,
    description: payload.description.trim(),
    startDate: payload.startDate,
    endDate: payload.endDate,
    status: payload.status,
    budget: payload.budget,
    rating: 0,
    goals: [],
    sections: [
      { id: crypto.randomUUID(), projectId: id, name: "جديد", displayOrder: 1 },
      { id: crypto.randomUUID(), projectId: id, name: "قيد التنفيذ", displayOrder: 2 },
      { id: crypto.randomUUID(), projectId: id, name: "مكتمل", displayOrder: 3 },
    ],
    tasks: [],
  };

  store.projects.unshift(project);
  store.nextProjectNumber += 1;
  writeStore(store);
  return clone(project);
};

export const updateProject = (id: string, payload: Partial<ProjectFormPayload>): Project => {
  const store = readStore();
  const index = store.projects.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("المشروع غير موجود");

  store.projects[index] = {
    ...store.projects[index],
    ...payload,
    name: payload.name?.trim() ?? store.projects[index].name,
    description: payload.description?.trim() ?? store.projects[index].description,
  };

  writeStore(store);
  return clone(store.projects[index]);
};

export const deleteProject = (id: string) => {
  const store = readStore();
  store.projects = store.projects.filter((item) => item.id !== id);
  store.invitations = store.invitations.filter((item) => item.projectId !== id);
  writeStore(store);
};

export const addInvitation = (payload: InvitationFormPayload): ProjectInvitation => {
  const store = readStore();
  const project = store.projects.find((item) => item.id === payload.projectId);
  if (!project) throw new Error("المشروع غير موجود");

  const invitation: ProjectInvitation = {
    id: crypto.randomUUID(),
    projectId: project.id,
    projectName: project.name,
    projectNumber: project.number,
    employeeId: payload.employeeId,
    employeeName: payload.employeeName,
    role: payload.role,
    message: payload.message,
    status: "pending",
    startDate: project.startDate,
    endDate: project.endDate,
    invitedAt: new Date().toISOString().slice(0, 10),
    expiresAt: payload.expiresAt,
  };

  store.invitations.unshift(invitation);
  writeStore(store);
  return clone(invitation);
};

export const updateInvitationStatus = (
  id: string,
  status: ProjectInvitation["status"],
): ProjectInvitation => {
  const store = readStore();
  const index = store.invitations.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("الدعوة غير موجودة");

  store.invitations[index] = { ...store.invitations[index], status };
  writeStore(store);
  return clone(store.invitations[index]);
};

export const addSection = (projectId: string, payload: SectionFormPayload): ProjectSection => {
  const store = readStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("المشروع غير موجود");

  const section: ProjectSection = {
    id: crypto.randomUUID(),
    projectId,
    name: payload.name.trim(),
    displayOrder: payload.displayOrder,
  };

  project.sections.push(section);
  project.sections.sort((a, b) => a.displayOrder - b.displayOrder);
  writeStore(store);
  return clone(section);
};

export const addTask = (projectId: string, payload: TaskFormPayload) => {
  const store = readStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("المشروع غير موجود");

  const section = project.sections.find((item) => item.id === payload.sectionId);
  const task = {
    id: crypto.randomUUID(),
    projectId,
    sectionId: payload.sectionId,
    number: project.tasks.length + 1,
    name: section?.name ?? "جديد",
    title: payload.title.trim(),
    description: payload.description.trim(),
    priority: payload.priority,
    expectedHours: payload.expectedHours,
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: payload.dueDate,
    assigneeIds: payload.assigneeIds,
    assigneeNames: payload.assigneeNames,
  };

  project.tasks.unshift(task);
  writeStore(store);
  return clone(task);
};

export const deleteTask = (projectId: string, taskId: string) => {
  const store = readStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("المشروع غير موجود");

  project.tasks = project.tasks.filter((task) => task.id !== taskId);
  writeStore(store);
};

export const resetProjectStore = () => {
  localStorage.removeItem(STORAGE_KEY);
};
