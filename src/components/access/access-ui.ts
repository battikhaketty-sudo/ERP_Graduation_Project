import { STATUS_BADGE_CLASS } from "../ui/formStyles";

export const yesNoBadgeClass = (value: boolean) =>
  value ? STATUS_BADGE_CLASS.success : STATUS_BADGE_CLASS.error;

export const tablePanelClass =
  "min-w-0 overflow-hidden rounded-2xl border border-hr-border bg-hr-surface shadow-card";

export const tableScrollClass = "min-w-0 max-w-full overflow-hidden";
