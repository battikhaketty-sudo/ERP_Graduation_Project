import { ChevronDown, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "../../i18n";
import { inputClass, inputErrorClass } from "./formStyles";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingMessage?: string;
  id?: string;
  hasError?: boolean;
  className?: string;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  loading = false,
  loadingMessage,
  id,
  hasError = false,
  className,
}: SearchableSelectProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? `${t("common.select")}…`;
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("common.searchPlaceholder");
  const resolvedEmptyMessage = emptyMessage ?? t("common.noResults");
  const resolvedLoadingMessage = loadingMessage ?? t("common.loading");

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const autoId = useId();
  const fieldId = id ?? autoId;

  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.description?.toLowerCase().includes(normalizedQuery) ||
        option.value.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleSelect = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={className ?? "relative"}>
      <button
        type="button"
        id={fieldId}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled || loading) return;
          setOpen((previous) => !previous);
        }}
        className={`${inputClass} flex items-center justify-between gap-2 text-start ${
          hasError ? inputErrorClass : ""
        } ${disabled || loading ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <span className={`truncate ${selected ? "text-hr-text" : "text-hr-muted"}`}>
          {loading ? resolvedLoadingMessage : selected?.label ?? resolvedPlaceholder}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-hr-muted transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-hr-border bg-hr-surface shadow-lg">
          <div className="border-b border-hr-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-hr-muted" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={resolvedSearchPlaceholder}
                className="h-10 w-full rounded-lg border border-hr-border bg-hr-input-bg pe-3 ps-9 text-sm outline-none focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20"
              />
            </div>
          </div>

          <ul className="max-h-52 overflow-y-auto py-1" role="listbox" aria-labelledby={fieldId}>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-hr-muted">{resolvedEmptyMessage}</li>
            ) : (
              filtered.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    onClick={() => handleSelect(option.value)}
                    className={`w-full px-3 py-2 text-start text-sm transition hover:bg-hr-nav-active ${
                      option.value === value
                        ? "bg-hr-nav-active font-medium text-hr-primary"
                        : "text-hr-text"
                    }`}
                  >
                    <span className="block">{option.label}</span>
                    {option.description && (
                      <span className="mt-0.5 block text-xs text-hr-muted" dir="ltr">
                        {option.description}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
