import { STATUS_BADGE_CLASS } from "../ui/formStyles";

export type RoleLevelKey = "high" | "medium" | "low";

export const getRoleLevelKey = (level: number): RoleLevelKey => {
  if (level >= 7) return "high";
  if (level >= 4) return "medium";
  return "low";
};

export const ROLE_LEVEL_OPTIONS: Array<{ value: number; key: RoleLevelKey }> = [
  { value: 2, key: "low" },
  { value: 5, key: "medium" },
  { value: 8, key: "high" },
];

export const normalizeRoleLevel = (level: number): number => {
  if (level >= 7) return 8;
  if (level >= 4) return 5;
  return level > 0 ? level : 2;
};

export const ROLE_LEVEL_BADGE_CLASS: Record<RoleLevelKey, string> = {
  high: STATUS_BADGE_CLASS.error,
  medium: STATUS_BADGE_CLASS.warning,
  low: STATUS_BADGE_CLASS.info,
};

export const yesNoBadgeClass = (value: boolean) =>
  value ? STATUS_BADGE_CLASS.success : STATUS_BADGE_CLASS.error;

export const tablePanelClass =
  "min-w-0 overflow-hidden rounded-2xl border border-hr-border bg-hr-surface shadow-card";

export const tableScrollClass = "min-w-0 max-w-full overflow-x-auto";
