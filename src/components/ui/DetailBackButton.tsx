import { ArrowLeft } from "lucide-react";
import { useTranslation } from "../../i18n";

type DetailBackButtonProps = {
  /** Full destination description for accessibility (screen readers + tooltip). */
  label: string;
  onClick: () => void;
  className?: string;
  /** Kept for compatibility; visual style is unified across surfaces. */
  variant?: "default" | "onPrimary";
};

/**
 * Shared back control for all detail pages.
 * Stays pinned at the top of the scrolling detail panel.
 */
export function DetailBackButton({
  label,
  onClick,
  className = "",
}: DetailBackButtonProps) {
  const { t } = useTranslation();

  return (
    <div
      className={[
        "sticky top-0 z-30 -mx-4 mb-4 border-b border-hr-border/60",
        "bg-hr-bg/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        className={[
          "group inline-flex h-10 items-center gap-2 rounded-xl border border-hr-border",
          "bg-hr-surface px-3 text-sm font-semibold text-hr-text shadow-sm",
          "transition hover:border-hr-primary hover:bg-hr-hover hover:text-hr-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hr-primary/40",
        ].join(" ")}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-hr-primary/10 text-hr-primary transition group-hover:bg-hr-primary group-hover:text-white">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        </span>
        <span className="max-w-[14rem] truncate sm:max-w-none">
          {t("common.back")}
        </span>
      </button>
    </div>
  );
}
