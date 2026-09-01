export function prependUniqueRecord<T extends { id: string }>(
  records: T[],
  record: T,
): T[] {
  return [record, ...records.filter((item) => item.id !== record.id)];
}
