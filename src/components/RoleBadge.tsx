import type { WorkRole } from "../types/employee";
import { useTranslation } from "../i18n";

const roleStyles: Record<WorkRole, string> = {
  Test: "bg-role-test-bg/90 text-role-test-text dark:bg-emerald-950/50 dark:text-emerald-300",
  Front_end: "bg-role-frontend-bg/90 text-role-frontend-text dark:bg-red-950/50 dark:text-red-300",
  UI_UX: "bg-role-uiux-bg/90 text-role-uiux-text dark:bg-blue-950/50 dark:text-blue-300",
  Back_end: "bg-role-backend-bg/90 text-role-backend-text dark:bg-violet-950/50 dark:text-violet-300",
};

type RoleBadgeProps = {
  role: WorkRole;
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex min-w-fit items-center justify-center rounded-md px-2 sm:px-3 py-1 text-xs font-medium ${roleStyles[role]}`}
    >
      {t(`badges.workRoles.${role}`)}
    </span>
  );
}
