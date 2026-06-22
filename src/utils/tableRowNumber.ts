type RowNumberSource = {
  rowNumber?: number;
  number?: number;
  id?: string;
};

const parseNumeric = (value: unknown) => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const extractRowNumber = (item: Record<string, unknown>): number | undefined => {
  const direct =
    parseNumeric(item.rowNumber) ??
    parseNumeric(item.number) ??
    parseNumeric(item.serialNumber) ??
    parseNumeric(item.sequence);

  if (direct !== undefined) return direct;

  const id = String(item.id ?? item.projectId ?? item.contractTypeId ?? "");
  if (/^\d+$/.test(id)) return Number(id);

  return undefined;
};

export const resolveTableRowIndex = (index: number, page = 1, pageSize = 10) =>
  (page - 1) * pageSize + index + 1;

export const resolveTableRowLabel = (
  item: Record<string, unknown>,
  index = 0,
  page = 1,
  pageSize = 10,
): string | number => {
  const apiNumber = extractRowNumber(item);
  if (apiNumber !== undefined) return apiNumber;

  const id = String(item.id ?? item.projectId ?? item.contractTypeId ?? "");
  if (id) return id;

  return (page - 1) * pageSize + index + 1;
};

export const resolveRowNumber = (
  item: RowNumberSource,
  index: number,
  page = 1,
  pageSize = 10,
): number => {
  if (item.rowNumber !== undefined) return item.rowNumber;
  if (item.number !== undefined) return item.number;

  const numericId = item.id && /^\d+$/.test(item.id) ? Number(item.id) : undefined;
  if (numericId !== undefined) return numericId;

  return (page - 1) * pageSize + index + 1;
};

export const assignRowNumbers = <T extends Record<string, unknown>>(
  items: T[],
  page = 1,
  pageSize = items.length || 10,
): Array<T & { rowNumber: number }> =>
  items.map((item, index) => ({
    ...item,
    rowNumber: extractRowNumber(item) ?? (page - 1) * pageSize + index + 1,
  }));
