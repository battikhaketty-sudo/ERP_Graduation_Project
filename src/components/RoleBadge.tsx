import type { WorkRole } from "../types/employee";

const roleLabels: Record<WorkRole, string> = {
  Test: "مختبر جودة",
  Front_end: "مطور أمامي",
  UI_UX: "مصمم واجهات",
  Back_end: "مطور خلفي",
};

const roleStyles: Record<WorkRole, string> = {
  Test: "bg-role-test-bg text-role-test-text",
  Front_end: "bg-role-frontend-bg text-role-frontend-text",
  UI_UX: "bg-role-uiux-bg text-role-uiux-text",
  Back_end: "bg-role-backend-bg text-role-backend-text",
};

type RoleBadgeProps = {
  role: WorkRole;
};

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={`inline-flex min-w-fit items-center justify-center rounded-md px-2 sm:px-3 py-1 text-xs font-medium ${roleStyles[role]}`}
    >
      {roleLabels[role]}
    </span>
  );
}
