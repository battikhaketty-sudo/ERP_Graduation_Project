import { AlertCircle, CheckCircle } from "lucide-react";

type StatusBannerProps = {
  variant: "success" | "error";
  message: string;
  className?: string;
};

export function StatusBanner({ variant, message, className = "mx-6 mt-4" }: StatusBannerProps) {
  const isSuccess = variant === "success";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${className} ${
        isSuccess
          ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300"
          : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {isSuccess ? (
        <CheckCircle className="size-5 shrink-0" />
      ) : (
        <AlertCircle className="size-5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}
