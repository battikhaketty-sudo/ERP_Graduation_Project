import type { TaskTransition } from "../../types/project";
import { getStoredUser } from "../tokenStorage";
import { PROJECT_TASK_TRANSITIONS_KEY } from "./localProjectData";

type TransitionsStore = Record<string, TaskTransition[]>;

const isTransition = (value: unknown): value is TaskTransition => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.taskId === "string" &&
    typeof item.fromSectionId === "string" &&
    typeof item.toSectionId === "string"
  );
};

const sanitizeTransition = (item: TaskTransition): TaskTransition => ({
  id: String(item.id),
  taskId: String(item.taskId),
  memberId: String(item.memberId || "").slice(0, 200),
  memberName: String(item.memberName || "").slice(0, 200),
  fromSectionId: String(item.fromSectionId),
  fromSectionName: String(item.fromSectionName || "").slice(0, 200),
  toSectionId: String(item.toSectionId),
  toSectionName: String(item.toSectionName || "").slice(0, 200),
  createdAtUtc: String(item.createdAtUtc || new Date().toISOString()),
});

const readStore = (): TransitionsStore => {
  try {
    const raw = localStorage.getItem(PROJECT_TASK_TRANSITIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const store: TransitionsStore = {};
    for (const [projectId, list] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!projectId || !Array.isArray(list)) continue;
      store[projectId] = list.filter(isTransition).map(sanitizeTransition);
    }
    return store;
  } catch {
    return {};
  }
};

const writeStore = (store: TransitionsStore) => {
  localStorage.setItem(PROJECT_TASK_TRANSITIONS_KEY, JSON.stringify(store));
};

const currentActor = () => {
  const user = getStoredUser();
  return {
    memberId: user?.email?.trim() || "unknown",
    memberName: user?.name?.trim() || user?.email?.trim() || "Unknown",
  };
};

export const getTaskTransitions = (
  projectId: string,
  taskId: string,
): TaskTransition[] =>
  (readStore()[projectId] ?? [])
    .filter((item) => item.taskId === taskId)
    .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc));

export const recordTaskSectionTransition = (input: {
  projectId: string;
  taskId: string;
  fromSectionId: string;
  fromSectionName: string;
  toSectionId: string;
  toSectionName: string;
  memberId?: string;
  memberName?: string;
}): TaskTransition | null => {
  if (!input.projectId || !input.taskId) return null;
  if (!input.fromSectionId || !input.toSectionId) return null;
  if (input.fromSectionId === input.toSectionId) return null;

  const actor = currentActor();
  const entry = sanitizeTransition({
    id: crypto.randomUUID(),
    taskId: input.taskId,
    memberId: input.memberId?.trim() || actor.memberId,
    memberName: input.memberName?.trim() || actor.memberName,
    fromSectionId: input.fromSectionId,
    fromSectionName: input.fromSectionName || input.fromSectionId,
    toSectionId: input.toSectionId,
    toSectionName: input.toSectionName || input.toSectionId,
    createdAtUtc: new Date().toISOString(),
  });

  const store = readStore();
  const list = store[input.projectId] ?? [];
  store[input.projectId] = [entry, ...list];
  writeStore(store);
  return entry;
};

export const removeTaskTransitions = (projectId: string, taskId: string) => {
  const store = readStore();
  const list = store[projectId] ?? [];
  if (!list.length) return;
  store[projectId] = list.filter((item) => item.taskId !== taskId);
  writeStore(store);
};

export const removeTransitionsForTasks = (
  projectId: string,
  taskIds: string[],
) => {
  if (!taskIds.length) return;
  const ids = new Set(taskIds);
  const store = readStore();
  const list = store[projectId] ?? [];
  store[projectId] = list.filter((item) => !ids.has(item.taskId));
  writeStore(store);
};

export const clearProjectTaskTransitions = (projectId: string) => {
  const store = readStore();
  delete store[projectId];
  writeStore(store);
};
