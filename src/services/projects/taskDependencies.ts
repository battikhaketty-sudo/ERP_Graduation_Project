import type { ProjectSection, ProjectTask } from "../../types/project";

/** Visual terminals for the task-dependency graph only (not API entities). */
export const FLOW_START_ID = "__flow_start__";
export const FLOW_END_ID = "__flow_end__";

/** Display-only gate — tasks no longer have a completion status. */
export type TaskFlowGate = "ready";

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
const LAYER_GAP_X = 300;
/** Must stay > NODE_HEIGHT so siblings in one layer never overlap. */
const LAYER_GAP_Y = NODE_HEIGHT + 56;

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

  return unique.filter((depId) => !wouldCreateCycle(input.tasks, input.taskId, depId));
};

/**
 * Adding edge `fromId → toId` means toId depends on fromId.
 * Cycle if fromId already depends (transitively) on toId.
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
  _task: ProjectTask,
  _tasksById: Map<string, ProjectTask>,
): TaskFlowGate => "ready";

export const getBlockingDependencyTitles = (
  _task: Pick<ProjectTask, "dependsOnTaskIds">,
  _tasks: ProjectTask[],
): string[] => [];

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

  const leftover = tasks
    .map((task) => task.id)
    .filter((id) => !placed.has(id))
    .sort();
  if (leftover.length) layers.push(leftover);

  return layers;
};

const spreadLayerYs = (count: number, gap: number) => {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const totalHeight = (count - 1) * gap;
  const startY = -totalHeight / 2;
  return Array.from({ length: count }, (_, index) => startY + index * gap);
};

export const layoutTaskDependencyGraph = (
  tasks: ProjectTask[],
): TaskFlowNodeLayout[] => {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const layers = buildDependencyLayers(tasks);
  const layerOf = new Map<string, number>();
  layers.forEach((layer, layerIndex) => {
    layer.forEach((id) => layerOf.set(id, layerIndex));
  });

  const yOf = new Map<string, number>();

  layers.forEach((layer) => {
    const ys = spreadLayerYs(layer.length, LAYER_GAP_Y);
    layer.forEach((id, index) => yOf.set(id, ys[index] ?? 0));
  });

  for (let pass = 0; pass < 3; pass++) {
    layers.forEach((layer) => {
      const scored = layer.map((id) => {
        const task = byId.get(id);
        const parents = (task?.dependsOnTaskIds ?? []).filter((depId) =>
          yOf.has(depId),
        );
        const desired = parents.length
          ? parents.reduce((sum, depId) => sum + (yOf.get(depId) ?? 0), 0) /
            parents.length
          : (yOf.get(id) ?? 0);
        return { id, desired };
      });
      scored.sort(
        (a, b) => a.desired - b.desired || a.id.localeCompare(b.id),
      );
      const ys = spreadLayerYs(scored.length, LAYER_GAP_Y);
      scored.forEach((item, index) => {
        yOf.set(item.id, scored.length === 1 ? item.desired : (ys[index] ?? 0));
      });
    });
  }

  tasks.forEach((task) => {
    const parents = (task.dependsOnTaskIds ?? []).filter((id) => yOf.has(id));
    if (parents.length < 2) return;

    const rounded = parents.map((id) => Math.round((yOf.get(id) ?? 0) / 10));
    const unique = new Set(rounded);
    if (unique.size === parents.length) {
      const avg =
        parents.reduce((sum, id) => sum + (yOf.get(id) ?? 0), 0) / parents.length;
      yOf.set(task.id, avg);
      return;
    }

    const ordered = [...parents].sort((a, b) => a.localeCompare(b));
    const ys = spreadLayerYs(ordered.length, LAYER_GAP_Y);
    ordered.forEach((id, index) => yOf.set(id, ys[index] ?? 0));
    const avg =
      ordered.reduce((sum, id) => sum + (yOf.get(id) ?? 0), 0) / ordered.length;
    yOf.set(task.id, avg);
  });

  layers.forEach((layer) => {
    if (layer.length <= 1) return;
    const ordered = [...layer].sort(
      (a, b) =>
        (yOf.get(a) ?? 0) - (yOf.get(b) ?? 0) || a.localeCompare(b),
    );
    const ys = spreadLayerYs(ordered.length, LAYER_GAP_Y);
    ordered.forEach((id, index) => yOf.set(id, ys[index] ?? 0));
  });

  layers.forEach((layer, layerIndex) => {
    if (layer.length !== 1 || layerIndex === 0) return;
    const id = layer[0];
    const task = byId.get(id);
    if (!task) return;
    const parents = (task.dependsOnTaskIds ?? []).filter((depId) =>
      layerOf.has(depId),
    );
    const hasSkip = parents.some(
      (depId) => (layerOf.get(id) ?? 0) - (layerOf.get(depId) ?? 0) > 1,
    );
    if (!hasSkip) return;
    if (Math.abs(yOf.get(id) ?? 0) > 8) return;
    yOf.set(id, LAYER_GAP_Y * 0.35);
  });

  const layouts: TaskFlowNodeLayout[] = [];
  layers.forEach((layer, layerIndex) => {
    layer.forEach((taskId, indexInLayer) => {
      const task = byId.get(taskId);
      if (!task) return;
      layouts.push({
        taskId,
        layer: layerIndex,
        indexInLayer,
        x: (layerIndex + 1) * LAYER_GAP_X,
        y: yOf.get(taskId) ?? 0,
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

export type DependencyEdgeSpec = {
  id: string;
  source: string;
  target: string;
  span: number;
  fanIndex: number;
  fanCount: number;
};

export const dependencyEdges = (
  tasks: ProjectTask[],
): DependencyEdgeSpec[] => {
  const ids = knownIds(tasks);
  const layers = buildDependencyLayers(tasks);
  const layerOf = new Map<string, number>();
  layers.forEach((layer, layerIndex) => {
    layer.forEach((id) => layerOf.set(id, layerIndex));
  });

  const raw: Array<{ id: string; source: string; target: string; span: number }> =
    [];

  tasks.forEach((task) => {
    for (const depId of task.dependsOnTaskIds ?? []) {
      if (!ids.has(depId)) continue;
      const span = Math.max(
        1,
        (layerOf.get(task.id) ?? 0) - (layerOf.get(depId) ?? 0),
      );
      raw.push({
        id: `${depId}->${task.id}`,
        source: depId,
        target: task.id,
        span,
      });
    }
  });

  const fanCountByTarget = new Map<string, number>();
  raw.forEach((edge) => {
    fanCountByTarget.set(
      edge.target,
      (fanCountByTarget.get(edge.target) ?? 0) + 1,
    );
  });
  const fanIndexByTarget = new Map<string, number>();

  return raw.map((edge) => {
    const fanCount = fanCountByTarget.get(edge.target) ?? 1;
    const fanIndex = fanIndexByTarget.get(edge.target) ?? 0;
    fanIndexByTarget.set(edge.target, fanIndex + 1);
    return { ...edge, fanIndex, fanCount };
  });
};

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

export const isTaskCompletedByFinalSection = (
  task: Pick<ProjectTask, "sectionId">,
  sections: Array<Pick<ProjectSection, "id" | "isFinalSection">>,
) =>
  Boolean(
    sections.find((section) => section.id === task.sectionId)?.isFinalSection,
  );

export const filterIncompleteTasksForPredecessors = (
  tasks: ProjectTask[],
  sections: Array<Pick<ProjectSection, "id" | "isFinalSection">>,
  options?: { excludeTaskId?: string },
) =>
  tasks.filter((task) => {
    if (options?.excludeTaskId && task.id === options.excludeTaskId) return false;
    return !isTaskCompletedByFinalSection(task, sections);
  });
