import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildPaginationItems } from "../utils/pagination";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), safeTotalPages);
  const items = buildPaginationItems(safeCurrentPage, safeTotalPages);

  return (
    <div
      className={[
        "flex flex-wrap items-center justify-center gap-1 border-t border-hr-border px-2 py-3 sm:gap-2 sm:px-4 sm:py-4",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
        disabled={safeCurrentPage === 1}
        className="flex size-8 items-center justify-center rounded-lg border border-hr-border bg-white text-hr-muted transition hover:border-hr-primary hover:text-hr-primary disabled:cursor-not-allowed disabled:opacity-40 sm:size-9"
        aria-label="الصفحة السابقة"
      >
        <ChevronRight className="size-4" />
      </button>

      {items.map((item) =>
        item.type === "ellipsis" ? (
          <span
            key={item.key}
            className="flex size-8 items-center justify-center text-sm text-hr-muted sm:size-9"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item.page}
            type="button"
            onClick={() => onPageChange(item.page)}
            className={[
              "flex size-8 items-center justify-center rounded-lg text-xs font-medium transition sm:size-9 sm:text-sm",
              item.page === safeCurrentPage
                ? "bg-hr-primary text-white shadow-sm"
                : "border border-hr-border bg-white text-hr-muted hover:border-hr-primary hover:text-hr-primary",
            ].join(" ")}
            aria-current={item.page === safeCurrentPage ? "page" : undefined}
          >
            {item.page}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
        disabled={safeCurrentPage === safeTotalPages}
        className="flex size-8 items-center justify-center rounded-lg border border-hr-border bg-white text-hr-muted transition hover:border-hr-primary hover:text-hr-primary disabled:cursor-not-allowed disabled:opacity-40 sm:size-9"
        aria-label="الصفحة التالية"
      >
        <ChevronLeft className="size-4" />
      </button>
    </div>
  );
}
