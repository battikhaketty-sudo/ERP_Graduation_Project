import type { Employee } from "../types/employee";

const STORAGE_KEY = "hr-archived-employees";

const readStore = (): Map<string, Employee> => {
  if (typeof window === "undefined") return new Map();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();

    const parsed = JSON.parse(raw) as Employee[];
    if (!Array.isArray(parsed)) return new Map();

    return new Map(
      parsed
        .filter((employee) => employee?.id)
        .map((employee) => [employee.id, { ...employee, isArchived: true }]),
    );
  } catch {
    return new Map();
  }
};

const writeStore = (store: Map<string, Employee>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...store.values()]));
};

let cache = readStore();

export const getArchivedEmployeeIds = () => new Set(cache.keys());

export const getArchivedEmployees = (): Employee[] =>
  [...cache.values()].sort((a, b) => b.id.localeCompare(a.id));

export const addArchivedEmployee = (employee: Employee) => {
  cache.set(employee.id, { ...employee, isArchived: true });
  writeStore(cache);
};

export const removeArchivedEmployee = (id: string) => {
  cache.delete(id);
  writeStore(cache);
};

export const isLocallyArchived = (id: string) => cache.has(id);
