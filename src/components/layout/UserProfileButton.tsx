import type { AuthUser } from "../../types/auth";
import { useTranslation } from "../../i18n";

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
  const displayName = user?.name?.trim() || t("header.profileMenu");
  const initials = getInitials(displayName);

  return (
    <div
      className="relative flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[#D6EBFA] text-sm font-semibold text-[#2F80ED]"
      title={displayName}
      aria-label={displayName}
    >
      <span aria-hidden>{initials}</span>
      <span
        className="absolute bottom-0 end-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-hr-header-bg"
        title={t("header.online")}
        aria-label={t("header.online")}
      />
    </div>
  );
}
