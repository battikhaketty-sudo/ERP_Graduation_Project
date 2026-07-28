import type { ProjectSection, ProjectTask } from "../../types/project";

export type SectionFlowGate = "completed" | "ready" | "blocked";

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
const LAYER_GAP_X = 280;
const LAYER_GAP_Y = 130;

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

/** Section is "done" only when it has tasks and every task is completed. */
export const isSectionWorkComplete = (
  sectionId: string,
  tasks: ProjectTask[],
): boolean => {
  const sectionTasks = tasks.filter((task) => task.sectionId === sectionId);
  if (!sectionTasks.length) return false;
  return sectionTasks.every((task) => task.status === "completed");
};

export const areSectionDependenciesSatisfied = (
  section: Pick<ProjectSection, "dependsOnSectionIds">,
  sectionsById: Map<string, ProjectSection>,
  tasks: ProjectTask[],
): boolean => {
  const deps = (section.dependsOnSectionIds ?? []).filter((id) =>
    sectionsById.has(id),
  );
  if (!deps.length) return true;
  return deps.every((id) => isSectionWorkComplete(id, tasks));
};

export const getSectionFlowGate = (
  section: ProjectSection,
  sectionsById: Map<string, ProjectSection>,
  tasks: ProjectTask[],
): SectionFlowGate => {
  if (isSectionWorkComplete(section.id, tasks)) return "completed";
  if (!areSectionDependenciesSatisfied(section, sectionsById, tasks)) {
    return "blocked";
  }
  return "ready";
};

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
  const layouts: SectionFlowNodeLayout[] = [];

  layers.forEach((layer, layerIndex) => {
    const totalHeight = layer.length * LAYER_GAP_Y;
    const startY = -totalHeight / 2 + LAYER_GAP_Y / 2;

    layer.forEach((sectionId, indexInLayer) => {
      const section = byId.get(sectionId);
      if (!section) return;
      layouts.push({
        sectionId,
        layer: layerIndex,
        indexInLayer,
        x: (layerIndex + 1) * LAYER_GAP_X,
        y: startY + indexInLayer * LAYER_GAP_Y,
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

export const sectionDependencyEdges = (
  sections: ProjectSection[],
): Array<{ id: string; source: string; target: string }> => {
  const ids = knownIds(sections);
  const edges: Array<{ id: string; source: string; target: string }> = [];

  sections.forEach((section) => {
    for (const depId of section.dependsOnSectionIds ?? []) {
      if (!ids.has(depId)) continue;
      edges.push({
        id: `${depId}->${section.id}`,
        source: depId,
        target: section.id,
      });
    }
  });

  return edges;
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
    const deps = (section.dependsOnSectionIds ?? []).filter((id) => ids.has(id));
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
