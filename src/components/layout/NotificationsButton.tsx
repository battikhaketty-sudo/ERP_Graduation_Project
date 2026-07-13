import { Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { getUnreadNotificationCount } from "../../data/notifications";
import { usePreferences } from "../../context/PreferencesContext";
import { useTranslation } from "../../i18n";

export function NotificationsButton() {
  const { locale } = usePreferences();
  const { t } = useTranslation();
  const location = useLocation();
  const count = getUnreadNotificationCount(locale);
  const isActive = location.pathname === ROUTES.notifications;

  return (
    <Link
      to={ROUTES.notifications}
      aria-label={
        count > 0
          ? t("header.unreadNotifications", { count: String(count) })
          : t("header.notifications")
      }
      className={[
        "relative flex size-[38px] shrink-0 items-center justify-center rounded-full transition-colors",
        isActive
          ? "bg-hr-hover text-hr-primary"
          : "text-hr-muted hover:bg-hr-hover hover:text-hr-text",
      ].join(" ")}
    >
      <Bell className="size-[22px]" strokeWidth={1.75} />
      {count > 0 ? (
        <span
          className="absolute -top-0.5 -end-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#EB5757] px-1 text-[11px] font-bold leading-none text-white ring-2 ring-hr-header-bg"
          aria-hidden
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
