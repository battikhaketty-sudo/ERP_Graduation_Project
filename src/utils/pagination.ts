export type PaginationItem =
  | { type: "page"; page: number }
  | { type: "ellipsis"; key: string };

export const buildPaginationItems = (
  currentPage: number,
  totalPages: number,
): PaginationItem[] => {
  if (totalPages <= 1) {
    return [{ type: "page", page: 1 }];
  }

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => ({
      type: "page" as const,
      page: index + 1,
    }));
  }

  const items: PaginationItem[] = [{ type: "page", page: 1 }];

  let start: number;
  let end: number;

  if (currentPage <= 4) {
    start = 2;
    end = currentPage + 2;
  } else if (currentPage >= totalPages - 3) {
    start = totalPages - 3;
    end = totalPages - 1;
  } else {
    start = currentPage - 2;
    end = currentPage + 2;
  }

  start = Math.max(2, start);
  end = Math.min(totalPages - 1, end);

  if (start > 2) {
    items.push({ type: "ellipsis", key: "start" });
  }

  for (let page = start; page <= end; page += 1) {
    items.push({ type: "page", page });
  }

  if (end < totalPages - 1) {
    items.push({ type: "ellipsis", key: "end" });
  }

  items.push({ type: "page", page: totalPages });

  return items;
};
