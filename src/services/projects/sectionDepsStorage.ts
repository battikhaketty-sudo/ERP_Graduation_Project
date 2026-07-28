import { PROJECT_SECTION_DEPS_KEY } from "./localProjectData";

/** projectId → sectionId → prerequisite section ids */
type SectionDepsStore = Record<string, Record<string, string[]>>;

const readStore = (): SectionDepsStore => {
  try {
    const raw = localStorage.getItem(PROJECT_SECTION_DEPS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const store: SectionDepsStore = {};
    for (const [projectId, sections] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!projectId || !sections || typeof sections !== "object") continue;
      const map: Record<string, string[]> = {};
      for (const [sectionId, deps] of Object.entries(
        sections as Record<string, unknown>,
      )) {
        if (!sectionId || !Array.isArray(deps)) continue;
        map[sectionId] = [
          ...new Set(deps.map(String).filter((id) => id && id !== sectionId)),
        ];
      }
      store[projectId] = map;
    }
    return store;
  } catch {
    return {};
  }
};

const writeStore = (store: SectionDepsStore) => {
  try {
    localStorage.setItem(PROJECT_SECTION_DEPS_KEY, JSON.stringify(store));
  } catch {
    // ignore storage failures
  }
};

export const getSectionDependsOn = (
  projectId: string,
  sectionId: string,
): string[] => {
  const deps = readStore()[projectId]?.[sectionId];
  return deps ? [...deps] : [];
};

export const getProjectSectionDeps = (
  projectId: string,
): Record<string, string[]> => {
  const map = readStore()[projectId];
  if (!map) return {};
  return Object.fromEntries(
    Object.entries(map).map(([id, deps]) => [id, [...deps]]),
  );
};

export const setSectionDependsOn = (
  projectId: string,
  sectionId: string,
  dependsOnSectionIds: string[],
) => {
  const store = readStore();
  const projectMap = { ...(store[projectId] ?? {}) };
  const cleaned = [
    ...new Set(
      dependsOnSectionIds
        .map(String)
        .filter((id) => id && id !== sectionId),
    ),
  ];
  if (cleaned.length) {
    projectMap[sectionId] = cleaned;
  } else {
    delete projectMap[sectionId];
  }
  if (Object.keys(projectMap).length) {
    store[projectId] = projectMap;
  } else {
    delete store[projectId];
  }
  writeStore(store);
};

/** Drop a section and strip it from every other section's deps. */
export const removeSectionFromDeps = (
  projectId: string,
  sectionId: string,
) => {
  const store = readStore();
  const projectMap = store[projectId];
  if (!projectMap) return;

  const next: Record<string, string[]> = {};
  for (const [id, deps] of Object.entries(projectMap)) {
    if (id === sectionId) continue;
    const filtered = deps.filter((depId) => depId !== sectionId);
    if (filtered.length) next[id] = filtered;
  }

  if (Object.keys(next).length) {
    store[projectId] = next;
  } else {
    delete store[projectId];
  }
  writeStore(store);
};

export const clearProjectSectionDeps = (projectId: string) => {
  const store = readStore();
  if (!(projectId in store)) return;
  delete store[projectId];
  writeStore(store);
};

/** Keep only deps that still reference existing section ids. */
export const pruneProjectSectionDeps = (
  projectId: string,
  validSectionIds: string[],
) => {
  const store = readStore();
  const projectMap = store[projectId];
  if (!projectMap) return;

  const valid = new Set(validSectionIds);
  const next: Record<string, string[]> = {};
  for (const [id, deps] of Object.entries(projectMap)) {
    if (!valid.has(id)) continue;
    const filtered = deps.filter((depId) => valid.has(depId) && depId !== id);
    if (filtered.length) next[id] = filtered;
  }

  if (Object.keys(next).length) {
    store[projectId] = next;
  } else {
    delete store[projectId];
  }
  writeStore(store);
};
