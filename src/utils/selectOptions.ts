import type { SearchableSelectOption } from "../components/ui/SearchableSelect";

export function mapNamedOptions(
  items: Array<{ id: string; name: string }>,
  options?: {
    description?: (item: { id: string; name: string }) => string | undefined;
  },
): SearchableSelectOption[] {
  return items.map((item) => ({
    value: item.id,
    label: item.name,
    description: options?.description?.(item),
  }));
}

const displayEmail = (email?: string) => {
  const trimmed = email?.trim() ?? "";
  return trimmed && trimmed !== "-" ? trimmed : "";
};

/** Name + email so duplicate legal names stay distinguishable. */
export function mapEmployeeOptions(
  items: Array<{ id: string; name: string; email?: string }>,
  options?: {
    description?: (item: { id: string; name: string; email?: string }) => string | undefined;
  },
): SearchableSelectOption[] {
  return items.map((item) => {
    const email = displayEmail(item.email);
    return {
      value: item.id,
      label: email ? `${item.name} (${email})` : item.name,
      description: options?.description?.(item),
    };
  });
}
