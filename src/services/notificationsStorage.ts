const STORAGE_KEY = "hr_notifications_state";

type NotificationsState = {
  readIds: string[];
  deletedIds: string[];
};

type Listener = () => void;

const listeners = new Set<Listener>();

const emptyState = (): NotificationsState => ({
  readIds: [],
  deletedIds: [],
});

const readState = (): NotificationsState => {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<NotificationsState>;
    return {
      readIds: Array.isArray(parsed.readIds)
        ? parsed.readIds.map(String)
        : [],
      deletedIds: Array.isArray(parsed.deletedIds)
        ? parsed.deletedIds.map(String)
        : [],
    };
  } catch {
    return emptyState();
  }
};

const writeState = (state: NotificationsState) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
  listeners.forEach((listener) => listener());
};

export const subscribeNotificationsState = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getNotificationsState = () => readState();

export const markNotificationsRead = (ids: string[]) => {
  if (!ids.length) return;
  const state = readState();
  const next = new Set(state.readIds);
  ids.forEach((id) => next.add(id));
  writeState({ ...state, readIds: [...next] });
};

export const deleteNotifications = (ids: string[]) => {
  if (!ids.length) return;
  const state = readState();
  const deleted = new Set(state.deletedIds);
  const read = new Set(state.readIds);
  ids.forEach((id) => {
    deleted.add(id);
    read.delete(id);
  });
  writeState({
    readIds: [...read],
    deletedIds: [...deleted],
  });
};

export const clearNotificationsState = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
};
