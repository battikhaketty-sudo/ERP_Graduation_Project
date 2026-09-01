import { Link, useLocation } from "react-router-dom";
import { ROUTES } from "../../constants/routes";
import { useTranslation } from "../../i18n";
import type { AuthUser } from "../../types/auth";

type UserProfileButtonProps = {
  user: AuthUser | null;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserProfileButton({ user }: UserProfileButtonProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const displayName = user?.name?.trim() || t("header.profileMenu");
  const initials = getInitials(displayName);
  const isActive = location.pathname === ROUTES.profile;

  return (
    <Link
      to={ROUTES.profile}
      className={[
        "relative flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[#D6EBFA] text-sm font-semibold text-[#2F80ED] transition hover:ring-2 hover:ring-hr-primary/40",
        isActive ? "ring-2 ring-hr-primary" : "",
      ].join(" ")}
      title={t("header.profileMenu")}
      aria-label={t("header.profileMenu")}
      aria-current={isActive ? "page" : undefined}
    >
      <span aria-hidden>{initials}</span>
      <span
        className="absolute bottom-0 end-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-hr-header-bg"
        title={t("header.online")}
        aria-label={t("header.online")}
      />
    </Link>
  );
}
