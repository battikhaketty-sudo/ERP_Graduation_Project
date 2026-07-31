import { useEffect, useState, useCallback } from "react";
import {
  getNotifications,
  getUnreadNotificationCount,
} from "../data/notifications";
import {
  deleteNotifications,
  markNotificationsRead,
  subscribeNotificationsState,
} from "../services/notificationsStorage";
import type { Locale } from "../utils/preferencesStorage";
import type { Notification } from "../types/notification";

export function useNotifications(locale: Locale) {
  const [version, setVersion] = useState(0);

  useEffect(() => subscribeNotificationsState(() => setVersion((v) => v + 1)), []);

  const notifications: Notification[] = getNotifications(locale);
  // version forces re-read after storage updates
  void version;

  const unreadCount = getUnreadNotificationCount(locale);

  const markRead = useCallback((ids: string[]) => {
    markNotificationsRead(ids);
  }, []);

  const remove = useCallback((ids: string[]) => {
    deleteNotifications(ids);
  }, []);

  return { notifications, unreadCount, markRead, remove };
}
