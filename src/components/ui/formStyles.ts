export const inputClass =
  "h-11 w-full rounded-xl border border-hr-border bg-white px-4 text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20";

export const readOnlyClass =
  "h-11 w-full rounded-xl border border-hr-border bg-[#FAFCFE] px-4 text-sm text-hr-text";

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
