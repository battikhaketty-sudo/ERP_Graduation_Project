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
