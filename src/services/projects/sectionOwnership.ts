import { PROJECT_SECTION_IDS_KEY } from "./localProjectData";

type OwnershipEntry = {
  initialized: boolean;
  ids: string[];
};

type OwnershipStore = Record<string, OwnershipEntry>;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const normalizeEntry = (value: unknown): OwnershipEntry | null => {
  if (isStringArray(value)) {
    // Legacy shape: bare id array means already initialized.
    return {
      initialized: true,
      ids: [...new Set(value.filter(Boolean))],
    };
  }
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const ids = isStringArray(record.ids)
    ? [...new Set(record.ids.filter(Boolean))]
    : [];
  return {
    initialized: Boolean(record.initialized) || ids.length > 0,
    ids,
  };
};

const readStore = (): OwnershipStore => {
  try {
    const raw = localStorage.getItem(PROJECT_SECTION_IDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const store: OwnershipStore = {};
    for (const [projectId, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!projectId) continue;
      const entry = normalizeEntry(value);
      if (entry) store[projectId] = entry;
    }
    return store;
  } catch {
    return {};
  }
};

const writeStore = (store: OwnershipStore) => {
  localStorage.setItem(PROJECT_SECTION_IDS_KEY, JSON.stringify(store));
};

export const getOwnedSectionIds = (projectId: string): string[] => {
  return [...(readStore()[projectId]?.ids ?? [])];
};

/** True once this project has been scoped (even if it has zero sections). */
export const isOwnershipInitialized = (projectId: string): boolean => {
  return Boolean(readStore()[projectId]?.initialized);
};

/** @deprecated Prefer isOwnershipInitialized — kept for call-site clarity. */
export const hasOwnedSections = (projectId: string): boolean =>
  isOwnershipInitialized(projectId);

export const markOwnershipInitialized = (
  projectId: string,
  sectionIds: string[] = [],
) => {
  if (!projectId) return;
  const store = readStore();
  const current = new Set(store[projectId]?.ids ?? []);
  for (const id of sectionIds) {
    if (id) current.add(id);
  }
  store[projectId] = { initialized: true, ids: [...current] };
  writeStore(store);
};

export const registerSectionOwnership = (projectId: string, sectionId: string) => {
  if (!projectId || !sectionId) return;
  const store = readStore();
  const current = new Set(store[projectId]?.ids ?? []);
  current.add(sectionId);
  store[projectId] = { initialized: true, ids: [...current] };
  writeStore(store);
};

export const registerSectionOwnershipMany = (
  projectId: string,
  sectionIds: string[],
) => {
  markOwnershipInitialized(projectId, sectionIds);
};

export const unregisterSectionOwnership = (projectId: string, sectionId: string) => {
  const store = readStore();
  const current = store[projectId];
  if (!current) return;
  store[projectId] = {
    initialized: true,
    ids: current.ids.filter((id) => id !== sectionId),
  };
  writeStore(store);
};

export const clearSectionOwnership = (projectId: string) => {
  const store = readStore();
  delete store[projectId];
  writeStore(store);
};

/** True when two projects appear to share the exact same section id set (API leak). */
export const sameSectionIdSet = (left: string[], right: string[]) => {
  if (left.length === 0 || right.length === 0) return false;
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
};
