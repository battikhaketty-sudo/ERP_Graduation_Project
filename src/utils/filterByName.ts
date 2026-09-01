export function filterByName<T extends { name: string }>(
  items: readonly T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  return items.filter((item) => item.name.toLowerCase().includes(q));
}

export function paginateItems<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): { records: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    records: items.slice(start, start + pageSize) as T[],
    totalPages,
  };
}
