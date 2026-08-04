import type { ProjectTask, TaskFormPayload, TaskStats } from "../../types/project";
import { PROJECT_TASKS_KEY } from "./localProjectData";
import { sanitizeDependsOn } from "./taskDependencies";

type TaskStore = Record<string, ProjectTask[]>;

const VALID_PRIORITIES = new Set(["low", "medium", "high", "urgent"]);

const isTask = (value: unknown): value is ProjectTask => {
  if (!value || typeof value !== "object") return false;
  const task = value as Record<string, unknown>;
  return (
    typeof task.id === "string" &&
    typeof task.projectId === "string" &&
    typeof task.sectionId === "string" &&
    typeof task.title === "string"
  );
};

const sanitizeTask = (task: ProjectTask): ProjectTask => ({
  id: String(task.id),
  projectId: String(task.projectId),
  sectionId: String(task.sectionId),
  number: Number(task.number) || 0,
  name: String(task.name || task.title || "").slice(0, 200),
  title: String(task.title || task.name || "").slice(0, 200),
  description: String(task.description || "").slice(0, 5000),
  priority: VALID_PRIORITIES.has(task.priority) ? task.priority : "medium",
  expectedHours: Math.max(0, Number(task.expectedHours) || 0),
  startDate: String(task.startDate || ""),
  dueDate: String(task.dueDate || ""),
  assigneeIds: Array.isArray(task.assigneeIds)
    ? task.assigneeIds.map(String).filter(Boolean)
    : [],
  assigneeNames: Array.isArray(task.assigneeNames)
    ? task.assigneeNames.map(String)
    : [],
  dependsOnTaskIds: Array.isArray(task.dependsOnTaskIds)
    ? [...new Set(task.dependsOnTaskIds.map(String).filter(Boolean))]
    : [],
});

const readStore = (): TaskStore => {
  try {
    const raw = localStorage.getItem(PROJECT_TASKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const store: TaskStore = {};
    for (const [projectId, tasks] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!projectId || !Array.isArray(tasks)) continue;
      store[projectId] = tasks.filter(isTask).map(sanitizeTask);
    }
    return store;
  } catch {
    return {};
  }
};

const writeStore = (store: TaskStore) => {
  localStorage.setItem(PROJECT_TASKS_KEY, JSON.stringify(store));
};

export const getProjectTasks = (
  projectId: string,
  sections: Array<{ id: string; name: string }> = [],
): ProjectTask[] => {
  const store = readStore();
  const raw = store[projectId] ?? [];
  const normalized = raw.map(sanitizeTask);

  const sectionIds = new Set(sections.map((section) => section.id).filter(Boolean));
  const fallbackSectionId = sections[0]?.id ?? "";
  let sectionChanged = false;

  const reconciled = normalized.map((task) => {
    if (!sectionIds.size) return task;
    if (task.sectionId && sectionIds.has(task.sectionId)) return task;
    if (!fallbackSectionId || task.sectionId === fallbackSectionId) return task;
    sectionChanged = true;
    return { ...task, sectionId: fallbackSectionId };
  });

  if (sectionChanged) {
    store[projectId] = reconciled;
    writeStore(store);
  }

  return reconciled;
};

export const clearProjectTasks = (projectId: string) => {
  const store = readStore();
  delete store[projectId];
  writeStore(store);
};

export const deleteTasksForSection = (projectId: string, sectionId: string) => {
  const store = readStore();
  const tasks = store[projectId] ?? [];
  const removed = tasks.filter((task) => task.sectionId === sectionId);
  const removedIds = new Set(removed.map((task) => task.id));
  store[projectId] = tasks
    .filter((task) => task.sectionId !== sectionId)
    .map((task) => ({
      ...task,
      dependsOnTaskIds: (task.dependsOnTaskIds ?? []).filter(
        (id) => !removedIds.has(id),
      ),
    }));
  writeStore(store);
  return removed;
};

export const addProjectTask = (projectId: string, payload: TaskFormPayload): ProjectTask => {
  const store = readStore();
  const tasks = store[projectId] ?? [];
  const taskId = crypto.randomUUID();
  const dependsOnTaskIds = sanitizeDependsOn({
    taskId,
    dependsOnTaskIds: payload.dependsOnTaskIds ?? [],
    tasks,
  });

  const task = sanitizeTask({
    id: taskId,
    projectId,
    sectionId: payload.sectionId,
    number: tasks.length + 1,
    name: payload.title.trim(),
    title: payload.title.trim(),
    description: payload.description.trim(),
    priority: payload.priority,
    expectedHours: payload.expectedHours,
    startDate: payload.startDate || new Date().toISOString().slice(0, 10),
    dueDate: payload.dueDate,
    assigneeIds: payload.assigneeIds,
    assigneeNames: payload.assigneeNames,
    dependsOnTaskIds,
  });

  store[projectId] = [task, ...tasks];
  writeStore(store);
  return task;
};

export const deleteProjectTask = (projectId: string, taskId: string) => {
  const store = readStore();
  store[projectId] = (store[projectId] ?? [])
    .filter((task) => task.id !== taskId)
    .map((task) => ({
      ...task,
      dependsOnTaskIds: (task.dependsOnTaskIds ?? []).filter((id) => id !== taskId),
    }));
  writeStore(store);
};

export const updateProjectTask = (
  projectId: string,
  taskId: string,
  payload: TaskFormPayload,
): ProjectTask => {
  const store = readStore();
  const tasks = store[projectId] ?? [];
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index < 0) throw new Error("Task not found");

  const current = tasks[index];
  const dependsOnTaskIds = sanitizeDependsOn({
    taskId,
    dependsOnTaskIds:
      payload.dependsOnTaskIds !== undefined
        ? payload.dependsOnTaskIds
        : (current.dependsOnTaskIds ?? []),
    tasks,
  });

  const updated = sanitizeTask({
    ...current,
    sectionId: payload.sectionId,
    name: payload.title.trim(),
    title: payload.title.trim(),
    description: payload.description.trim(),
    priority: payload.priority,
    expectedHours: payload.expectedHours,
    startDate: payload.startDate || current.startDate,
    dueDate: payload.dueDate,
    assigneeIds: payload.assigneeIds,
    assigneeNames: payload.assigneeNames,
    dependsOnTaskIds,
  });

  tasks[index] = updated;
  store[projectId] = tasks;
  writeStore(store);
  return { ...updated };
};

/** Add a dependency edge: `fromId` before `toId` (arrow from → to). */
export const addTaskDependency = (
  projectId: string,
  fromId: string,
  toId: string,
): ProjectTask | null => {
  if (!fromId || !toId || fromId === toId) return null;
  const store = readStore();
  const tasks = store[projectId] ?? [];
  const target = tasks.find((task) => task.id === toId);
  if (!target || !tasks.some((task) => task.id === fromId)) return null;

  const nextDeps = sanitizeDependsOn({
    taskId: toId,
    dependsOnTaskIds: [...(target.dependsOnTaskIds ?? []), fromId],
    tasks,
  });

  if (
    nextDeps.length === (target.dependsOnTaskIds ?? []).length &&
    (target.dependsOnTaskIds ?? []).includes(fromId)
  ) {
    return target;
  }

  const index = tasks.findIndex((task) => task.id === toId);
  const updated = sanitizeTask({ ...target, dependsOnTaskIds: nextDeps });
  tasks[index] = updated;
  store[projectId] = tasks;
  writeStore(store);
  return updated;
};

export const removeTaskDependency = (
  projectId: string,
  fromId: string,
  toId: string,
): ProjectTask | null => {
  const store = readStore();
  const tasks = store[projectId] ?? [];
  const index = tasks.findIndex((task) => task.id === toId);
  if (index < 0) return null;

  const target = tasks[index];
  const updated = sanitizeTask({
    ...target,
    dependsOnTaskIds: (target.dependsOnTaskIds ?? []).filter((id) => id !== fromId),
  });
  tasks[index] = updated;
  store[projectId] = tasks;
  writeStore(store);
  return updated;
};

export const countAllLocalTasks = (projectIds: string[]): number =>
  projectIds.reduce((sum, id) => sum + (readStore()[id]?.length ?? 0), 0);

export const buildTaskStatsFromTasks = (tasks: ProjectTask[]): TaskStats => {
  const today = new Date().toISOString().slice(0, 10);
  let late = 0;

  tasks.forEach((task) => {
    if (task.dueDate && task.dueDate < today) late += 1;
  });

  return {
    total: tasks.length,
    late,
  };
};
