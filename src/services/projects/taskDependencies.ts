import type { ProjectTask, TaskStatus } from "../../types/project";

export type TaskFlowGate = "completed" | "ready" | "blocked";

export type TaskFlowNodeLayout = {
  taskId: string;
  layer: number;
  indexInLayer: number;
  x: number;
  y: number;
  gate: TaskFlowGate;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;
const LAYER_GAP_X = 280;
const LAYER_GAP_Y = 130;

const taskStatus = (task: ProjectTask): TaskStatus =>
  task.status === "completed" || task.status === "in_progress" || task.status === "todo"
    ? task.status
    : "todo";

const knownIds = (tasks: ProjectTask[]) => new Set(tasks.map((task) => task.id));

/** Drop invalid/self refs and anything that would introduce a cycle. */
export const sanitizeDependsOn = (input: {
  taskId: string;
  dependsOnTaskIds: string[];
  tasks: ProjectTask[];
}): string[] => {
  const ids = knownIds(input.tasks);
  const unique = [
    ...new Set(
      input.dependsOnTaskIds
        .map(String)
        .filter((id) => id && id !== input.taskId && ids.has(id)),
    ),
  ];

  return unique.filter((depId) => {
    // Would depId → … → taskId already exist if we add taskId depends on depId?
    // Cycle if depId can reach taskId through existing edges, OR if taskId can reach depId.
    return !wouldCreateCycle(input.tasks, input.taskId, depId);
  });
};

/**
 * Adding edge `fromId → toId` means toId depends on fromId.
 * Cycle if toId can already reach fromId in the dependency graph
 * (following dependsOn edges as reverse? Wait:
 *
 * dependsOn: C.dependsOn = [A,B] means edges A→C and B→C (prerequisite → dependent).
 * Cycle if fromId is reachable from toId by walking dependsOn forward
 * (toId → … → fromId), i.e. fromId already depends (transitively) on toId.
 */
export const wouldCreateCycle = (
  tasks: ProjectTask[],
  toId: string,
  fromId: string,
): boolean => {
  if (toId === fromId) return true;

  const byId = new Map(tasks.map((task) => [task.id, task]));
  const stack = [fromId];
  const seen = new Set<string>();

  while (stack.length) {
    const current = stack.pop()!;
    if (current === toId) return true;
    if (seen.has(current)) continue;
    seen.add(current);

    const task = byId.get(current);
    for (const dep of task?.dependsOnTaskIds ?? []) {
      if (!seen.has(dep)) stack.push(dep);
    }
  }

  return false;
};

export const getTaskGate = (
  task: ProjectTask,
  tasksById: Map<string, ProjectTask>,
): TaskFlowGate => {
  if (taskStatus(task) === "completed") return "completed";

  if (!areDependenciesSatisfied(task, tasksById)) return "blocked";
  return "ready";
};

/** All prerequisite tasks exist and are completed. */
export const areDependenciesSatisfied = (
  task: Pick<ProjectTask, "dependsOnTaskIds">,
  tasksById: Map<string, ProjectTask>,
): boolean => {
  const deps = (task.dependsOnTaskIds ?? []).filter((id) => tasksById.has(id));
  if (!deps.length) return true;
  return deps.every((id) => {
    const dep = tasksById.get(id);
    return dep ? taskStatus(dep) === "completed" : true;
  });
};

export const getBlockingDependencyTitles = (
  task: Pick<ProjectTask, "dependsOnTaskIds">,
  tasks: ProjectTask[],
): string[] => {
  const byId = new Map(tasks.map((item) => [item.id, item]));
  return (task.dependsOnTaskIds ?? [])
    .map((id) => byId.get(id))
    .filter((dep): dep is ProjectTask => Boolean(dep))
    .filter((dep) => taskStatus(dep) !== "completed")
    .map((dep) => dep.title || dep.name);
};

/**
 * Starting or completing a task is only allowed when every dependency is completed.
 * `todo` is always allowed (park / reset).
 */
export const canSetTaskStatus = (
  task: Pick<ProjectTask, "id" | "dependsOnTaskIds">,
  nextStatus: TaskStatus,
  tasks: ProjectTask[],
): boolean => {
  if (nextStatus === "todo") return true;
  const byId = new Map(tasks.map((item) => [item.id, item]));
  return areDependenciesSatisfied(task, byId);
};

/** Downgrade illegal in_progress/completed statuses when deps are incomplete. */
export const enforceDependencyStatuses = (tasks: ProjectTask[]): ProjectTask[] => {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  let changed = false;

  const next = tasks.map((task) => {
    if (taskStatus(task) === "todo") return task;
    if (areDependenciesSatisfied(task, byId)) return task;
    changed = true;
    return { ...task, status: "todo" as TaskStatus };
  });

  return changed ? next : tasks;
};

/** Kahn-style layers: tasks with no deps first, then dependents. */
export const buildDependencyLayers = (tasks: ProjectTask[]): string[][] => {
  const ids = new Set(tasks.map((task) => task.id));
  const depsOf = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();

  tasks.forEach((task) => {
    const deps = (task.dependsOnTaskIds ?? []).filter((id) => ids.has(id));
    depsOf.set(task.id, deps);
    dependents.set(task.id, []);
  });

  tasks.forEach((task) => {
    for (const dep of depsOf.get(task.id) ?? []) {
      dependents.get(dep)?.push(task.id);
    }
  });

  const remaining = new Map(
    tasks.map((task) => [task.id, (depsOf.get(task.id) ?? []).length]),
  );
  const layers: string[][] = [];
  let frontier = [...remaining.entries()]
    .filter(([, count]) => count === 0)
    .map(([id]) => id)
    .sort();

  const placed = new Set<string>();

  while (frontier.length) {
    layers.push(frontier);
    frontier.forEach((id) => placed.add(id));

    const next: string[] = [];
    frontier.forEach((id) => {
      for (const child of dependents.get(id) ?? []) {
        if (placed.has(child)) continue;
        const left = (remaining.get(child) ?? 1) - 1;
        remaining.set(child, left);
        if (left === 0) next.push(child);
      }
    });
    frontier = [...new Set(next)].sort();
  }

  // Cycles / leftovers: append as final layer so nothing disappears.
  const leftover = tasks
    .map((task) => task.id)
    .filter((id) => !placed.has(id))
    .sort();
  if (leftover.length) layers.push(leftover);

  return layers;
};

export const layoutTaskDependencyGraph = (
  tasks: ProjectTask[],
): TaskFlowNodeLayout[] => {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const layers = buildDependencyLayers(tasks);
  const layouts: TaskFlowNodeLayout[] = [];

  layers.forEach((layer, layerIndex) => {
    const totalHeight = layer.length * LAYER_GAP_Y;
    const startY = -totalHeight / 2 + LAYER_GAP_Y / 2;

    layer.forEach((taskId, indexInLayer) => {
      const task = byId.get(taskId);
      if (!task) return;
      layouts.push({
        taskId,
        layer: layerIndex,
        indexInLayer,
        // Offset by 1 so Start can sit at layer 0.
        x: (layerIndex + 1) * LAYER_GAP_X,
        y: startY + indexInLayer * LAYER_GAP_Y,
        gate: getTaskGate(task, byId),
      });
    });
  });

  return layouts;
};

export const getTerminalLayout = (
  tasks: ProjectTask[],
): { start: { x: number; y: number }; end: { x: number; y: number }; lastLayer: number } => {
  const layers = buildDependencyLayers(tasks);
  const lastLayer = Math.max(layers.length, 1);
  return {
    start: { x: 0, y: 0 },
    end: { x: (lastLayer + 1) * LAYER_GAP_X, y: 0 },
    lastLayer,
  };
};

export const dependencyEdges = (
  tasks: ProjectTask[],
): Array<{ id: string; source: string; target: string }> => {
  const ids = knownIds(tasks);
  const edges: Array<{ id: string; source: string; target: string }> = [];

  tasks.forEach((task) => {
    for (const depId of task.dependsOnTaskIds ?? []) {
      if (!ids.has(depId)) continue;
      edges.push({
        id: `${depId}->${task.id}`,
        source: depId,
        target: task.id,
      });
    }
  });

  return edges;
};

/**
 * Display-only terminals: Start → entry tasks (no deps), exit tasks (no dependents) → End.
 * Used until the backend graph API supplies nodes/edges.
 */
export const buildAutoTerminalEdges = (
  tasks: ProjectTask[],
  startId: string,
  endId: string,
): Array<{ id: string; source: string; target: string }> => {
  if (!tasks.length) return [];

  const ids = knownIds(tasks);
  const hasDependent = new Set<string>();

  tasks.forEach((task) => {
    for (const depId of task.dependsOnTaskIds ?? []) {
      if (ids.has(depId)) hasDependent.add(depId);
    }
  });

  const edges: Array<{ id: string; source: string; target: string }> = [];

  tasks.forEach((task) => {
    const deps = (task.dependsOnTaskIds ?? []).filter((id) => ids.has(id));
    if (!deps.length) {
      edges.push({
        id: `${startId}->${task.id}`,
        source: startId,
        target: task.id,
      });
    }
    if (!hasDependent.has(task.id)) {
      edges.push({
        id: `${task.id}->${endId}`,
        source: task.id,
        target: endId,
      });
    }
  });

  return edges;
};

export const TASK_FLOW_NODE_SIZE = { width: NODE_WIDTH, height: NODE_HEIGHT };
export const TASK_FLOW_LAYER_GAP_X = LAYER_GAP_X;
