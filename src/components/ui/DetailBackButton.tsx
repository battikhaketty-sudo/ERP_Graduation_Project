import { ChevronRight } from "lucide-react";

type DetailBackButtonProps = {
  label: string;
  onClick: () => void;
  className?: string;
  variant?: "default" | "onPrimary";
};

export function DetailBackButton({
  label,
  onClick,
  className = "",
  variant = "default",
}: DetailBackButtonProps) {
  if (variant === "onPrimary") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-white/25 ${className}`}
      >
        <ChevronRight className="size-5 shrink-0" />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-4 inline-flex items-center gap-2 rounded-xl border border-[#C8E9F7] bg-[#E9F6FC] px-4 py-2.5 text-sm font-semibold text-[#1B91C4] shadow-sm transition hover:bg-[#DDF1FA] ${className}`}
    >
      <ChevronRight className="size-5 shrink-0" />
      {label}
    </button>
  );
}
