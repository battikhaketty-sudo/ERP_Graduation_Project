import { PROJECT_SECTION_EDGE_LABELS_KEY } from "./localProjectData";

/** projectId → edgeId (`from->to`) → label text written by the user */
type EdgeLabelsStore = Record<string, Record<string, string>>;

export const sectionEdgeId = (fromId: string, toId: string) => `${fromId}->${toId}`;

const readStore = (): EdgeLabelsStore => {
  try {
    const raw = localStorage.getItem(PROJECT_SECTION_EDGE_LABELS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const store: EdgeLabelsStore = {};
    for (const [projectId, edges] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!projectId || !edges || typeof edges !== "object") continue;
      const map: Record<string, string> = {};
      for (const [edgeId, label] of Object.entries(
        edges as Record<string, unknown>,
      )) {
        if (!edgeId || typeof label !== "string") continue;
        const trimmed = label.trim();
        if (trimmed) map[edgeId] = trimmed.slice(0, 80);
      }
      if (Object.keys(map).length) store[projectId] = map;
    }
    return store;
  } catch {
    return {};
  }
};

const writeStore = (store: EdgeLabelsStore) => {
  try {
    localStorage.setItem(PROJECT_SECTION_EDGE_LABELS_KEY, JSON.stringify(store));
  } catch {
    // ignore storage failures
  }
};

export const getProjectSectionEdgeLabels = (
  projectId: string,
): Record<string, string> => {
  const map = readStore()[projectId];
  return map ? { ...map } : {};
};

export const getSectionEdgeLabel = (
  projectId: string,
  fromId: string,
  toId: string,
): string => {
  return readStore()[projectId]?.[sectionEdgeId(fromId, toId)] ?? "";
};

/** Set/clear the label on a single edge. */
export const setSectionEdgeLabel = (
  projectId: string,
  fromId: string,
  toId: string,
  label: string,
) => {
  const store = readStore();
  const projectMap = { ...(store[projectId] ?? {}) };
  const edgeId = sectionEdgeId(fromId, toId);
  const trimmed = label.trim().slice(0, 80);
  if (trimmed) {
    projectMap[edgeId] = trimmed;
  } else {
    delete projectMap[edgeId];
  }
  if (Object.keys(projectMap).length) {
    store[projectId] = projectMap;
  } else {
    delete store[projectId];
  }
  writeStore(store);
};

/**
 * Replace all incoming edge labels for a target section
 * (edges from each prerequisite → target).
 */
export const setIncomingSectionEdgeLabels = (
  projectId: string,
  targetSectionId: string,
  labelsBySourceId: Record<string, string>,
  validSourceIds: string[],
) => {
  const store = readStore();
  const projectMap = { ...(store[projectId] ?? {}) };
  const valid = new Set(validSourceIds);
  const suffix = `->${targetSectionId}`;

  for (const edgeId of Object.keys(projectMap)) {
    if (edgeId.endsWith(suffix)) delete projectMap[edgeId];
  }

  for (const sourceId of valid) {
    const trimmed = (labelsBySourceId[sourceId] ?? "").trim().slice(0, 80);
    if (!trimmed) continue;
    projectMap[sectionEdgeId(sourceId, targetSectionId)] = trimmed;
  }

  if (Object.keys(projectMap).length) {
    store[projectId] = projectMap;
  } else {
    delete store[projectId];
  }
  writeStore(store);
};

/** Drop every edge label that touches a deleted section. */
export const removeSectionFromEdgeLabels = (
  projectId: string,
  sectionId: string,
) => {
  const store = readStore();
  const projectMap = store[projectId];
  if (!projectMap) return;

  const next: Record<string, string> = {};
  for (const [edgeId, label] of Object.entries(projectMap)) {
    const [fromId, toId] = edgeId.split("->");
    if (fromId === sectionId || toId === sectionId) continue;
    next[edgeId] = label;
  }

  if (Object.keys(next).length) {
    store[projectId] = next;
  } else {
    delete store[projectId];
  }
  writeStore(store);
};

export const pruneProjectSectionEdgeLabels = (
  projectId: string,
  validSectionIds: string[],
) => {
  const store = readStore();
  const projectMap = store[projectId];
  if (!projectMap) return;

  const valid = new Set(validSectionIds);
  const next: Record<string, string> = {};
  for (const [edgeId, label] of Object.entries(projectMap)) {
    const [fromId, toId] = edgeId.split("->");
    if (!fromId || !toId || !valid.has(fromId) || !valid.has(toId)) continue;
    next[edgeId] = label;
  }

  if (Object.keys(next).length) {
    store[projectId] = next;
  } else {
    delete store[projectId];
  }
  writeStore(store);
};

export const clearProjectSectionEdgeLabels = (projectId: string) => {
  const store = readStore();
  if (!(projectId in store)) return;
  delete store[projectId];
  writeStore(store);
};
