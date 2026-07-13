export const cardSurfaceClass = "hr-card";
export const panelClass = "hr-panel";
export const modalClass = "hr-modal";
export const modalBodyClass = "hr-modal-body";
export const modalHeaderClass = "hr-modal-header";
export const modalFooterClass = "hr-modal-footer";
export const tableHeadRowClass = "hr-table-head";
export const tableRowClass = (index: number) =>
  index % 2 ? "hr-table-row-alt" : "hr-table-row";
export const iconBtnClass = "hr-icon-btn";
export const accentBtnClass = "hr-accent-btn";
export const alertErrorClass = "hr-alert-error";
export const alertSuccessClass = "hr-alert-success";
export const infoBoxClass = "hr-info-box";
export const infoBannerClass = "hr-info-banner";
export const dashedZoneClass = "hr-dashed-zone";
export const cancelBtnClass = "hr-btn-cancel";
export const cancelBtnLgClass = "hr-btn-cancel-lg";
export const closeBtnClass = "hr-close-btn";
export const detailFooterClass = "hr-detail-footer";
export const subtlePanelClass = "hr-subtle-panel";

export const inputClass =
  "h-11 w-full rounded-xl border border-hr-border bg-hr-input-bg px-4 text-start text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20";

export const inputErrorClass =
  "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-800 dark:focus:border-red-500";

export const fieldInputClass = (
  hasError: boolean,
  variant: "input" | "textarea" | "readonly" = "input",
) => {
  const base =
    variant === "textarea" ? textareaClass : variant === "readonly" ? readOnlyClass : inputClass;
  return [base, hasError ? inputErrorClass : ""].filter(Boolean).join(" ");
};

export const selectClass = inputClass;

export const textareaClass =
  "min-h-[100px] w-full rounded-xl border border-hr-border bg-hr-input-bg px-4 py-3 text-start text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20";

export const readOnlyClass =
  "h-11 w-full rounded-xl border border-hr-border bg-hr-hover px-4 text-start text-sm text-hr-text";

export const EMPLOYEE_TABS_CLASS = {
  bar: "flex gap-1 overflow-x-auto border-b border-hr-border",
  tab: (active: boolean) =>
    [
      "shrink-0 px-4 py-3 text-sm font-medium transition",
      active
        ? "border-b-2 border-brand-accent text-brand-accent"
        : "text-hr-muted hover:text-hr-text",
    ].join(" "),
};

export const STATUS_BADGE_CLASS = {
  success:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  error: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  neutral: "bg-hr-hover text-hr-muted",
} as const;
