import { PROJECT_FLOW_ANCHORS_KEY } from "./localProjectData";

export const FLOW_START_ID = "__flow_start__";
export const FLOW_END_ID = "__flow_end__";

export type ProjectFlowAnchors = {
  /** Task ids that Start connects to (Start → Task). */
  fromStart: string[];
  /** Task ids that connect to End (Task → End). */
  toEnd: string[];
};

type AnchorStore = Record<string, ProjectFlowAnchors>;

const emptyAnchors = (): ProjectFlowAnchors => ({
  fromStart: [],
  toEnd: [],
});

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const readStore = (): AnchorStore => {
  try {
    const raw = localStorage.getItem(PROJECT_FLOW_ANCHORS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const store: AnchorStore = {};
    for (const [projectId, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!projectId || !value || typeof value !== "object") continue;
      const record = value as Record<string, unknown>;
      store[projectId] = {
        fromStart: isStringArray(record.fromStart)
          ? [...new Set(record.fromStart.filter(Boolean))]
          : [],
        toEnd: isStringArray(record.toEnd)
          ? [...new Set(record.toEnd.filter(Boolean))]
          : [],
      };
    }
    return store;
  } catch {
    return {};
  }
};

const writeStore = (store: AnchorStore) => {
  localStorage.setItem(PROJECT_FLOW_ANCHORS_KEY, JSON.stringify(store));
};

export const getProjectFlowAnchors = (projectId: string): ProjectFlowAnchors => {
  return readStore()[projectId] ?? emptyAnchors();
};

export const clearProjectFlowAnchors = (projectId: string) => {
  const store = readStore();
  delete store[projectId];
  writeStore(store);
};

/** Drop anchors that point at deleted tasks. */
export const pruneProjectFlowAnchors = (
  projectId: string,
  validTaskIds: string[],
) => {
  const valid = new Set(validTaskIds);
  const store = readStore();
  const current = store[projectId] ?? emptyAnchors();
  store[projectId] = {
    fromStart: current.fromStart.filter((id) => valid.has(id)),
    toEnd: current.toEnd.filter((id) => valid.has(id)),
  };
  writeStore(store);
  return store[projectId];
};

export const linkFlowAnchor = (
  projectId: string,
  fromId: string,
  toId: string,
  validTaskIds: string[],
): ProjectFlowAnchors => {
  const valid = new Set(validTaskIds);
  const store = readStore();
  const current = store[projectId] ?? emptyAnchors();

  if (fromId === FLOW_START_ID && valid.has(toId)) {
    store[projectId] = {
      ...current,
      fromStart: [...new Set([...current.fromStart, toId])],
    };
    writeStore(store);
    return store[projectId];
  }

  if (toId === FLOW_END_ID && valid.has(fromId)) {
    store[projectId] = {
      ...current,
      toEnd: [...new Set([...current.toEnd, fromId])],
    };
    writeStore(store);
    return store[projectId];
  }

  throw new Error("Invalid start/end connection");
};

export const unlinkFlowAnchor = (
  projectId: string,
  fromId: string,
  toId: string,
): ProjectFlowAnchors => {
  const store = readStore();
  const current = store[projectId] ?? emptyAnchors();

  if (fromId === FLOW_START_ID) {
    store[projectId] = {
      ...current,
      fromStart: current.fromStart.filter((id) => id !== toId),
    };
    writeStore(store);
    return store[projectId];
  }

  if (toId === FLOW_END_ID) {
    store[projectId] = {
      ...current,
      toEnd: current.toEnd.filter((id) => id !== fromId),
    };
    writeStore(store);
    return store[projectId];
  }

  return current;
};

export const isFlowTerminalId = (id: string) =>
  id === FLOW_START_ID || id === FLOW_END_ID;

export const flowAnchorEdges = (
  anchors: ProjectFlowAnchors,
  visibleTaskIds: Set<string>,
): Array<{ id: string; source: string; target: string }> => {
  const edges: Array<{ id: string; source: string; target: string }> = [];

  anchors.fromStart.forEach((taskId) => {
    if (!visibleTaskIds.has(taskId)) return;
    edges.push({
      id: `${FLOW_START_ID}->${taskId}`,
      source: FLOW_START_ID,
      target: taskId,
    });
  });

  anchors.toEnd.forEach((taskId) => {
    if (!visibleTaskIds.has(taskId)) return;
    edges.push({
      id: `${taskId}->${FLOW_END_ID}`,
      source: taskId,
      target: FLOW_END_ID,
    });
  });

  return edges;
};
