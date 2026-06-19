export function sortNewestFirst<T extends { id?: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => (b.id ?? "").localeCompare(a.id ?? ""));
}

export function prependUniqueRecord<T extends { id: string }>(
  records: T[],
  record: T,
): T[] {
  return [record, ...records.filter((item) => item.id !== record.id)];
}
