type PagedResult<T> = {
  records: T[];
  meta: {
    totalPages?: number;
    totalItems?: number;
  };
};

const DEFAULT_PAGE_LIMIT = 50;

export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<PagedResult<T>>,
  limit = DEFAULT_PAGE_LIMIT,
): Promise<T[]> {
  const first = await fetchPage(1, limit);
  const all = [...first.records];
  const totalPages = Math.max(first.meta.totalPages ?? 1, 1);

  for (let page = 2; page <= totalPages; page += 1) {
    const { records } = await fetchPage(page, limit);
    all.push(...records);
  }

  return all;
}
