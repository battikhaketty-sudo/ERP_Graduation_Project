import type { ProjectSection, ProjectTask } from "../../types/project";

export type SectionFlowGate = "ready";

export type SectionFlowNodeLayout = {
  sectionId: string;
  layer: number;
  indexInLayer: number;
  x: number;
  y: number;
  gate: SectionFlowGate;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;
const LAYER_GAP_X = 300;
const LAYER_GAP_Y = NODE_HEIGHT + 56;

const knownIds = (sections: ProjectSection[]) =>
  new Set(sections.map((section) => section.id));

/** Drop invalid/self refs and anything that would introduce a cycle. */
export const sanitizeSectionDependsOn = (input: {
  sectionId: string;
  dependsOnSectionIds: string[];
  sections: ProjectSection[];
}): string[] => {
  const ids = knownIds(input.sections);
  const unique = [
    ...new Set(
      input.dependsOnSectionIds
        .map(String)
        .filter((id) => id && id !== input.sectionId && ids.has(id)),
    ),
  ];

  return unique.filter(
    (depId) => !wouldCreateSectionCycle(input.sections, input.sectionId, depId),
  );
};

/**
 * Adding edge fromId → toId means toId depends on fromId.
 * Cycle if fromId already depends (transitively) on toId.
 */
export const wouldCreateSectionCycle = (
  sections: ProjectSection[],
  toId: string,
  fromId: string,
): boolean => {
  if (toId === fromId) return true;

  const byId = new Map(sections.map((section) => [section.id, section]));
  const stack = [fromId];
  const seen = new Set<string>();

  while (stack.length) {
    const current = stack.pop()!;
    if (current === toId) return true;
    if (seen.has(current)) continue;
    seen.add(current);

    const section = byId.get(current);
    for (const dep of section?.dependsOnSectionIds ?? []) {
      if (!seen.has(dep)) stack.push(dep);
    }
  }

  return false;
};

/** Sections marked as final treat their tasks as completed. */
export const isFinalProjectSection = (section?: ProjectSection | null) =>
  Boolean(section?.isFinalSection);

/** A task is completed when its section is a final section. */
export const isTaskCompletedByFinalSection = (
  task: Pick<ProjectTask, "sectionId">,
  sections: ProjectSection[],
) => {
  const section = sections.find((item) => item.id === task.sectionId);
  return isFinalProjectSection(section);
};

/** Keep incomplete tasks only — used for predecessor pickers. */
export const filterIncompleteTasksForPredecessors = (
  tasks: ProjectTask[],
  sections: ProjectSection[],
  options?: { excludeTaskId?: string },
) =>
  tasks.filter((task) => {
    if (options?.excludeTaskId && task.id === options.excludeTaskId) return false;
    return !isTaskCompletedByFinalSection(task, sections);
  });

/** Sections are complete when marked as final (tasks inside are done). */
export const isSectionWorkComplete = (
  sectionId: string,
  _tasks: ProjectTask[],
  sections: ProjectSection[] = [],
): boolean => {
  const section = sections.find((item) => item.id === sectionId);
  return isFinalProjectSection(section);
};

export const areSectionDependenciesSatisfied = (
  _section: Pick<ProjectSection, "dependsOnSectionIds">,
  _sectionsById: Map<string, ProjectSection>,
  _tasks: ProjectTask[],
): boolean => true;

export const getSectionFlowGate = (
  _section: ProjectSection,
  _sectionsById: Map<string, ProjectSection>,
  _tasks: ProjectTask[],
): SectionFlowGate => "ready";

/** Kahn-style layers: sections with no deps first, then dependents. */
export const buildSectionDependencyLayers = (
  sections: ProjectSection[],
): string[][] => {
  const ids = new Set(sections.map((section) => section.id));
  const depsOf = new Map<string, string[]>();
  const dependents = new Map<string, string[]>();

  sections.forEach((section) => {
    const deps = (section.dependsOnSectionIds ?? []).filter((id) => ids.has(id));
    depsOf.set(section.id, deps);
    dependents.set(section.id, []);
  });

  sections.forEach((section) => {
    for (const dep of depsOf.get(section.id) ?? []) {
      dependents.get(dep)?.push(section.id);
    }
  });

  const remaining = new Map(
    sections.map((section) => [
      section.id,
      (depsOf.get(section.id) ?? []).length,
    ]),
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

  const leftover = sections
    .map((section) => section.id)
    .filter((id) => !placed.has(id))
    .sort();
  if (leftover.length) layers.push(leftover);

  return layers;
};

export const layoutSectionDependencyGraph = (
  sections: ProjectSection[],
  tasks: ProjectTask[],
): SectionFlowNodeLayout[] => {
  const byId = new Map(sections.map((section) => [section.id, section]));
  const layers = buildSectionDependencyLayers(sections);
  const layerOf = new Map<string, number>();
  layers.forEach((layer, layerIndex) => {
    layer.forEach((id) => layerOf.set(id, layerIndex));
  });

  const yOf = new Map<string, number>();
  const spread = (count: number) => {
    if (count <= 1) return [0];
    const totalHeight = (count - 1) * LAYER_GAP_Y;
    const startY = -totalHeight / 2;
    return Array.from({ length: count }, (_, i) => startY + i * LAYER_GAP_Y);
  };

  layers.forEach((layer) => {
    const ys = spread(layer.length);
    layer.forEach((id, index) => yOf.set(id, ys[index] ?? 0));
  });

  for (let pass = 0; pass < 3; pass++) {
    layers.forEach((layer) => {
      const scored = layer.map((id) => {
        const section = byId.get(id);
        const parents = (section?.dependsOnSectionIds ?? []).filter((depId: string) =>
          yOf.has(depId),
        );
        const desired = parents.length
          ? parents.reduce((sum: number, depId: string) => sum + (yOf.get(depId) ?? 0), 0) /
            parents.length
          : (yOf.get(id) ?? 0);
        return { id, desired };
      });
      scored.sort(
        (a, b) => a.desired - b.desired || a.id.localeCompare(b.id),
      );
      const ys = spread(scored.length);
      scored.forEach((item, index) => {
        yOf.set(
          item.id,
          scored.length === 1 ? item.desired : (ys[index] ?? 0),
        );
      });
    });
  }

  sections.forEach((section) => {
    const parents = (section.dependsOnSectionIds ?? []).filter((id: string) =>
      yOf.has(id),
    );
    if (parents.length < 2) return;
    const rounded = parents.map((id: string) => Math.round((yOf.get(id) ?? 0) / 10));
    if (new Set(rounded).size === parents.length) {
      const avg =
        parents.reduce((sum: number, id: string) => sum + (yOf.get(id) ?? 0), 0) /
        parents.length;
      yOf.set(section.id, avg);
      return;
    }
    const ordered = [...parents].sort((a, b) => a.localeCompare(b));
    const ys = spread(ordered.length);
    ordered.forEach((id, index) => yOf.set(id, ys[index] ?? 0));
    const avg =
      ordered.reduce((sum: number, id: string) => sum + (yOf.get(id) ?? 0), 0) / ordered.length;
    yOf.set(section.id, avg);
  });

  layers.forEach((layer) => {
    if (layer.length <= 1) return;
    const ordered = [...layer].sort(
      (a, b) =>
        (yOf.get(a) ?? 0) - (yOf.get(b) ?? 0) || a.localeCompare(b),
    );
    const ys = spread(ordered.length);
    ordered.forEach((id, index) => yOf.set(id, ys[index] ?? 0));
  });

  layers.forEach((layer, layerIndex) => {
    if (layer.length !== 1 || layerIndex === 0) return;
    const id = layer[0];
    const section = byId.get(id);
    if (!section) return;
    const parents = (section.dependsOnSectionIds ?? []).filter((depId: string) =>
      layerOf.has(depId),
    );
    const hasSkip = parents.some(
      (depId: string) => (layerOf.get(id) ?? 0) - (layerOf.get(depId) ?? 0) > 1,
    );
    if (!hasSkip || Math.abs(yOf.get(id) ?? 0) > 8) return;
    yOf.set(id, LAYER_GAP_Y * 0.35);
  });

  const layouts: SectionFlowNodeLayout[] = [];
  layers.forEach((layer, layerIndex) => {
    layer.forEach((sectionId, indexInLayer) => {
      const section = byId.get(sectionId);
      if (!section) return;
      layouts.push({
        sectionId,
        layer: layerIndex,
        indexInLayer,
        x: (layerIndex + 1) * LAYER_GAP_X,
        y: yOf.get(sectionId) ?? 0,
        gate: getSectionFlowGate(section, byId, tasks),
      });
    });
  });

  return layouts;
};

export const getSectionTerminalLayout = (
  sections: ProjectSection[],
): {
  start: { x: number; y: number };
  end: { x: number; y: number };
  lastLayer: number;
} => {
  const layers = buildSectionDependencyLayers(sections);
  const lastLayer = Math.max(layers.length, 1);
  return {
    start: { x: 0, y: 0 },
    end: { x: (lastLayer + 1) * LAYER_GAP_X, y: 0 },
    lastLayer,
  };
};

export type SectionDependencyEdgeSpec = {
  id: string;
  source: string;
  target: string;
  span: number;
  fanIndex: number;
  fanCount: number;
};

export const sectionDependencyEdges = (
  sections: ProjectSection[],
): SectionDependencyEdgeSpec[] => {
  const ids = knownIds(sections);
  const layers = buildSectionDependencyLayers(sections);
  const layerOf = new Map<string, number>();
  layers.forEach((layer, layerIndex) => {
    layer.forEach((id) => layerOf.set(id, layerIndex));
  });

  const raw: Array<{ id: string; source: string; target: string; span: number }> =
    [];

  sections.forEach((section) => {
    for (const depId of section.dependsOnSectionIds ?? []) {
      if (!ids.has(depId)) continue;
      const span = Math.max(
        1,
        (layerOf.get(section.id) ?? 0) - (layerOf.get(depId) ?? 0),
      );
      raw.push({
        id: `${depId}->${section.id}`,
        source: depId,
        target: section.id,
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

export const buildAutoSectionTerminalEdges = (
  sections: ProjectSection[],
  startId: string,
  endId: string,
): Array<{ id: string; source: string; target: string }> => {
  if (!sections.length) return [];

  const ids = knownIds(sections);
  const hasDependent = new Set<string>();

  sections.forEach((section) => {
    for (const depId of section.dependsOnSectionIds ?? []) {
      if (ids.has(depId)) hasDependent.add(depId);
    }
  });

  const edges: Array<{ id: string; source: string; target: string }> = [];

  sections.forEach((section) => {
    const deps = (section.dependsOnSectionIds ?? []).filter((id: string) => ids.has(id));
    if (!deps.length) {
      edges.push({
        id: `${startId}->${section.id}`,
        source: startId,
        target: section.id,
      });
    }
    if (!hasDependent.has(section.id)) {
      edges.push({
        id: `${section.id}->${endId}`,
        source: section.id,
        target: endId,
      });
    }
  });

  return edges;
};

export const SECTION_FLOW_NODE_SIZE = { width: NODE_WIDTH, height: NODE_HEIGHT };
