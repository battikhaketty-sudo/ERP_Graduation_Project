const coerceBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
};

export const readApiBoolean = (
  item: Record<string, unknown>,
  ...keys: string[]
): boolean => {
  for (const key of keys) {
    const parsed = coerceBoolean(item[key]);
    if (parsed !== undefined) return parsed;
  }
  return false;
};

/** Reads API `isFixed` / `IsFixed` flags from role, permission, and assignment payloads. */
export const readIsFixed = (item: Record<string, unknown>): boolean =>
  readApiBoolean(item, "isFixed", "IsFixed");
