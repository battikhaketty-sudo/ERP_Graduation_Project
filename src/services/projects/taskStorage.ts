import type { ProjectTask, TaskFormPayload, TaskStats } from "../../types/project";

const STORAGE_KEY = "hr_project_tasks";

type TaskStore = Record<string, ProjectTask[]>;

const readStore = (): TaskStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TaskStore;
  } catch {
    return {};
  }
};

const writeStore = (store: TaskStore) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

export const getProjectTasks = (projectId: string): ProjectTask[] => {
  const tasks = readStore()[projectId] ?? [];
  return JSON.parse(JSON.stringify(tasks)) as ProjectTask[];
};

export const addProjectTask = (projectId: string, payload: TaskFormPayload): ProjectTask => {
  const store = readStore();
  const tasks = store[projectId] ?? [];
  const task: ProjectTask = {
    id: crypto.randomUUID(),
    projectId,
    sectionId: payload.sectionId,
    number: tasks.length + 1,
    name: payload.title.trim(),
    title: payload.title.trim(),
    description: payload.description.trim(),
    priority: payload.priority,
    expectedHours: payload.expectedHours,
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: payload.dueDate,
    assigneeIds: payload.assigneeIds,
    assigneeNames: payload.assigneeNames,
  };

  store[projectId] = [task, ...tasks];
  writeStore(store);
  return task;
};

export const deleteProjectTask = (projectId: string, taskId: string) => {
  const store = readStore();
  store[projectId] = (store[projectId] ?? []).filter((task) => task.id !== taskId);
  writeStore(store);
};

export const buildTaskStatsFromTasks = (
  tasks: ProjectTask[],
  sections: Array<{ id: string; name: string }>,
): TaskStats => {
  const today = new Date().toISOString().slice(0, 10);
  const completedSectionIds = new Set(
    sections.filter((section) => section.name.includes("مكتمل")).map((section) => section.id),
  );
  const progressSectionIds = new Set(
    sections
      .filter((section) => section.name.includes("قيد") || section.name.includes("تنفيذ"))
      .map((section) => section.id),
  );

  let completed = 0;
  let inProgress = 0;
  let late = 0;

  tasks.forEach((task) => {
    if (completedSectionIds.has(task.sectionId)) {
      completed += 1;
      return;
    }
    if (progressSectionIds.has(task.sectionId)) {
      inProgress += 1;
      if (task.dueDate && task.dueDate < today) late += 1;
      return;
    }
    if (task.dueDate && task.dueDate < today) late += 1;
  });

  return {
    total: tasks.length,
    inProgress,
    completed,
    late,
  };
};
