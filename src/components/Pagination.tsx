import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages =
    pages.length <= 5
      ? pages
      : [
          currentPage - 2,
          currentPage - 1,
          currentPage,
          currentPage + 1,
          currentPage + 2,
        ].filter((p) => p >= 1 && p <= totalPages);

  return (
    <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 border-t border-hr-border px-2 py-3 sm:px-4 sm:py-4">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex size-8 sm:size-9 items-center justify-center rounded-lg border border-hr-border bg-white text-hr-muted transition hover:border-hr-primary hover:text-hr-primary disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="الصفحة السابقة"
      >
        <ChevronRight className="size-4" />
      </button>

      {visiblePages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={[
            "flex size-8 sm:size-9 items-center justify-center rounded-lg text-xs sm:text-sm font-medium transition",
            page === currentPage
              ? "bg-hr-primary text-white shadow-sm"
              : "border border-hr-border bg-white text-hr-muted hover:border-hr-primary hover:text-hr-primary",
          ].join(" ")}
          aria-current={page === currentPage ? "page" : undefined}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex size-8 sm:size-9 items-center justify-center rounded-lg border border-hr-border bg-white text-hr-muted transition hover:border-hr-primary hover:text-hr-primary disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="الصفحة التالية"
      >
        <ChevronLeft className="size-4" />
      </button>
    </div>
  );
}
