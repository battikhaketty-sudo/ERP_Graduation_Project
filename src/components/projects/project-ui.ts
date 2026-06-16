export const inputClass =
  "h-11 w-full rounded-xl border border-hr-border bg-white px-4 text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20";

export const textareaClass =
  "min-h-[110px] w-full rounded-xl border border-hr-border bg-white px-4 py-3 text-sm text-hr-text outline-none transition placeholder:text-hr-muted focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20";

export const modalOverlayClass = "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4";

export const modalCardClass =
  "max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-card sm:p-8";

export const PROJECT_STATUS_LABELS = {
  not_started: "لم يبدأ بعد",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
} as const;

export const INVITATION_STATUS_LABELS = {
  pending: "قيد الانتظار",
  accepted: "مقبول",
  rejected: "مرفوض",
} as const;

export const PRIORITY_LABELS = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
} as const;
