import type { Notification } from "../types/notification";
import type { Locale } from "../utils/preferencesStorage";
import { getNotificationsState } from "../services/notificationsStorage";

const arNotifications: Notification[] = [
  {
    id: "1",
    title: "طلب إجازة جديد",
    description: "قدّم أحمد محمد طلب إجازة لمدة 3 أيام. يرجى المراجعة والموافقة.",
    date: "10.09.2023",
    read: false,
  },
  {
    id: "2",
    title: "تحديث سياسة الحضور",
    description: "تم تحديث سياسة الحضور والانصراف. يرجى الاطلاع على التفاصيل في قسم HR.",
    date: "10.09.2023",
    read: false,
  },
  {
    id: "3",
    title: "موظف جديد",
    description: "تمت إضافة موظف جديد إلى قسم التطوير. راجع ملف الموظف للاطلاع على التفاصيل.",
    date: "10.09.2023",
    read: false,
  },
  {
    id: "4",
    title: "تذكير: تقييم الأداء",
    description: "موعد تقييم الأداء الربع سنوي يقترب. يرجى إعداد التقييمات قبل نهاية الأسبوع.",
    date: "09.09.2023",
    read: false,
  },
  {
    id: "5",
    title: "دعوة مشروع",
    description: "تمت دعوتك للانضمام إلى مشروع ERP. افتح صفحة المشاريع للرد على الدعوة.",
    date: "08.09.2023",
    read: true,
  },
  {
    id: "6",
    title: "تغيير جدول العمل",
    description: "تم تحديث جدول العمل الافتراضي للمؤسسة اعتباراً من الأسبوع القادم.",
    date: "07.09.2023",
    read: true,
  },
];

const enNotifications: Notification[] = [
  {
    id: "1",
    title: "New leave request",
    description: "Ahmed Mohammed submitted a 3-day leave request. Please review and approve.",
    date: "10.09.2023",
    read: false,
  },
  {
    id: "2",
    title: "Attendance policy update",
    description: "The attendance policy has been updated. See HR for details.",
    date: "10.09.2023",
    read: false,
  },
  {
    id: "3",
    title: "New employee",
    description: "A new employee was added to the Development department. Review their profile for details.",
    date: "10.09.2023",
    read: false,
  },
  {
    id: "4",
    title: "Reminder: performance review",
    description: "The quarterly performance review deadline is approaching. Please submit reviews by end of week.",
    date: "09.09.2023",
    read: false,
  },
  {
    id: "5",
    title: "Project invitation",
    description: "You were invited to join the ERP project. Open Projects to respond.",
    date: "08.09.2023",
    read: true,
  },
  {
    id: "6",
    title: "Work schedule change",
    description: "The default company work schedule will change starting next week.",
    date: "07.09.2023",
    read: true,
  },
];

export function getNotificationsSeed(locale: Locale): Notification[] {
  return locale === "en" ? enNotifications : arNotifications;
}

/** Seed + local read/delete overrides. */
export function getNotifications(locale: Locale): Notification[] {
  const { readIds, deletedIds } = getNotificationsState();
  const readSet = new Set(readIds);
  const deletedSet = new Set(deletedIds);

  return getNotificationsSeed(locale)
    .filter((item) => !deletedSet.has(item.id))
    .map((item) => ({
      ...item,
      read: readSet.has(item.id) || Boolean(item.read),
    }));
}

export function getUnreadNotificationCount(locale: Locale): number {
  return getNotifications(locale).filter((item) => !item.read).length;
}

/** @deprecated Use getNotificationsSeed(locale) */
export const notificationsSeed = arNotifications;
