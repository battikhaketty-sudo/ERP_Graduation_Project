import type { Project, ProjectTask, TaskPriority } from "../../types/project";
import { PROJECT_POINTS_KEY } from "./localProjectData";

export type PerformancePointsEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId: string;
  projectName: string;
  taskId: string;
  taskTitle: string;
  points: number;
  reason: "task_completed";
  createdAt: string;
};

export type EmployeePointsSummary = {
  employeeId: string;
  employeeName: string;
  totalPoints: number;
  completedTasks: number;
};

export type ProjectEmployeePointsRow = EmployeePointsSummary & {
  allProjectsPoints: number;
  allProjectsTasks: number;
};

type PointsStore = {
  entries: PerformancePointsEntry[];
};

const PRIORITY_POINTS: Record<TaskPriority, number> = {
  low: 5,
  medium: 10,
  high: 20,
  urgent: 30,
};

const isEntry = (value: unknown): value is PerformancePointsEntry => {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.employeeId === "string" &&
    typeof entry.projectId === "string" &&
    typeof entry.taskId === "string" &&
    typeof entry.points === "number" &&
    Number.isFinite(entry.points)
  );
};

const readStore = (): PointsStore => {
  try {
    const raw = localStorage.getItem(PROJECT_POINTS_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return { entries: [] };
    const entries = (parsed as PointsStore).entries;
    return {
      entries: Array.isArray(entries)
        ? entries.filter(isEntry).map((entry) => ({
            ...entry,
            employeeName: String(entry.employeeName || entry.employeeId).slice(0, 200),
            projectName: String(entry.projectName || "").slice(0, 200),
            taskTitle: String(entry.taskTitle || "").slice(0, 200),
            points: Math.max(0, Math.min(1000, Number(entry.points) || 0)),
            reason: "task_completed" as const,
          }))
        : [],
    };
  } catch {
    return { entries: [] };
  }
};

const writeStore = (store: PointsStore) => {
  localStorage.setItem(PROJECT_POINTS_KEY, JSON.stringify(store));
};

export const clearProjectPoints = (projectId: string) => {
  const store = readStore();
  store.entries = store.entries.filter((entry) => entry.projectId !== projectId);
  writeStore(store);
};

export const pointsForPriority = (priority: TaskPriority): number =>
  PRIORITY_POINTS[priority] ?? PRIORITY_POINTS.medium;

const awardKey = (taskId: string, employeeId: string) => `${taskId}:${employeeId}`;

export const syncTaskCompletionPoints = (input: {
  projectId: string;
  projectName: string;
  previous?: ProjectTask | null;
  next: ProjectTask;
}): PerformancePointsEntry[] => {
  const wasCompleted = input.previous?.status === "completed";
  const isCompleted = input.next.status === "completed";

  const store = readStore();

  // Task left completed → remove its awards
  if (wasCompleted && !isCompleted) {
    store.entries = store.entries.filter((entry) => entry.taskId !== input.next.id);
    writeStore(store);
    return [];
  }

  if (!isCompleted) return [];

  const points = pointsForPriority(input.next.priority);
  const createdAt = new Date().toISOString();
  const assigneeIds = input.next.assigneeIds ?? [];
  const assigneeNames = input.next.assigneeNames ?? [];
  const currentAssigneeSet = new Set(assigneeIds.filter(Boolean));

  // Drop awards for people no longer assigned to this completed task
  store.entries = store.entries.filter(
    (entry) =>
      entry.taskId !== input.next.id || currentAssigneeSet.has(entry.employeeId),
  );

  const awarded = new Set(
    store.entries
      .filter((entry) => entry.taskId === input.next.id)
      .map((entry) => awardKey(entry.taskId, entry.employeeId)),
  );

  const added: PerformancePointsEntry[] = [];

  assigneeIds.forEach((employeeId, index) => {
    if (!employeeId) return;

    if (awarded.has(awardKey(input.next.id, employeeId))) {
      // Keep entry, refresh points/title/name
      store.entries = store.entries.map((entry) =>
        entry.taskId === input.next.id && entry.employeeId === employeeId
          ? {
              ...entry,
              points,
              taskTitle: input.next.title || input.next.name,
              employeeName: assigneeNames[index] || entry.employeeName,
            }
          : entry,
      );
      return;
    }

    const entry: PerformancePointsEntry = {
      id: crypto.randomUUID(),
      employeeId,
      employeeName: assigneeNames[index] || employeeId,
      projectId: input.projectId,
      projectName: input.projectName,
      taskId: input.next.id,
      taskTitle: input.next.title || input.next.name,
      points,
      reason: "task_completed",
      createdAt,
    };
    store.entries.unshift(entry);
    added.push(entry);
  });

  writeStore(store);
  return added;
};

export const removeTaskPoints = (taskId: string) => {
  const store = readStore();
  store.entries = store.entries.filter((entry) => entry.taskId !== taskId);
  writeStore(store);
};

/** Align stored points with current assignees on completed tasks (fixes stale awards). */
export const reconcileProjectPoints = (project: Project) => {
  const tasks = project.tasks ?? [];
  const completedTaskIds = new Set(
    tasks.filter((task) => task.status === "completed").map((task) => task.id),
  );

  const store = readStore();
  // Remove awards for tasks that are no longer completed or no longer exist
  store.entries = store.entries.filter(
    (entry) =>
      entry.projectId !== project.id || completedTaskIds.has(entry.taskId),
  );
  writeStore(store);

  tasks.forEach((task) => {
    if (task.status !== "completed") return;
    syncTaskCompletionPoints({
      projectId: project.id,
      projectName: project.name,
      previous: { ...task, status: "completed" },
      next: task,
    });
  });
};

export const getProjectPointsEntries = (projectId: string): PerformancePointsEntry[] =>
  readStore().entries.filter((entry) => entry.projectId === projectId);

export const getProjectPointsLeaderboard = (
  projectId: string,
): EmployeePointsSummary[] => {
  const map = new Map<string, EmployeePointsSummary>();

  getProjectPointsEntries(projectId).forEach((entry) => {
    const current = map.get(entry.employeeId) ?? {
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      totalPoints: 0,
      completedTasks: 0,
    };
    current.totalPoints += entry.points;
    current.completedTasks += 1;
    current.employeeName = entry.employeeName || current.employeeName;
    map.set(entry.employeeId, current);
  });

  return [...map.values()].sort((a, b) => b.totalPoints - a.totalPoints);
};

export const getAllPointsLeaderboard = (): EmployeePointsSummary[] => {
  const map = new Map<string, EmployeePointsSummary>();

  readStore().entries.forEach((entry) => {
    const current = map.get(entry.employeeId) ?? {
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      totalPoints: 0,
      completedTasks: 0,
    };
    current.totalPoints += entry.points;
    current.completedTasks += 1;
    current.employeeName = entry.employeeName || current.employeeName;
    map.set(entry.employeeId, current);
  });

  return [...map.values()].sort((a, b) => b.totalPoints - a.totalPoints);
};

/** Project ranking plus each employee's total across all projects. */
export const getProjectPointsLeaderboardWithGlobal = (
  projectId: string,
): ProjectEmployeePointsRow[] => {
  const globalById = new Map(
    getAllPointsLeaderboard().map((row) => [row.employeeId, row]),
  );

  return getProjectPointsLeaderboard(projectId).map((row) => {
    const global = globalById.get(row.employeeId);
    return {
      ...row,
      allProjectsPoints: global?.totalPoints ?? row.totalPoints,
      allProjectsTasks: global?.completedTasks ?? row.completedTasks,
    };
  });
};
