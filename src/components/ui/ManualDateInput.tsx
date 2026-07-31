import { useEffect, useId, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "../../i18n";
import {
  formatDateDisplay,
  isIsoInRange,
  parseManualDate,
  sanitizeDateTyping,
} from "../../utils/manualDate";
import { inputClass } from "./formStyles";

type ManualDateInputProps = {
  value: string;
  onChange: (isoDate: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
};

/**
 * Day-first manual date field.
 * Type 22032023 or 22/03/2023 — stored as YYYY-MM-DD for the API.
 * Optional calendar icon still available for pickers who prefer it.
 */
export function ManualDateInput({
  value,
  onChange,
  min,
  max,
  required,
  disabled,
  id,
  name,
  className = "",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: ManualDateInputProps) {
  const { t } = useTranslation();
  const autoId = useId();
  const fieldId = id || autoId;
  const pickerId = `${fieldId}-picker`;
  const [text, setText] = useState(() => formatDateDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused) return;
    setText(formatDateDisplay(value));
  }, [focused, value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange("");
      setText("");
      return;
    }
    const iso = parseManualDate(trimmed);
    if (!iso || !isIsoInRange(iso, min, max)) {
      setText(formatDateDisplay(value));
      return;
    }
    onChange(iso);
    setText(formatDateDisplay(iso));
  };

  return (
    <div className="relative">
      <input
        id={fieldId}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        placeholder={t("common.datePlaceholder")}
        title={t("common.dateHint")}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(event) => setText(sanitizeDateTyping(event.target.value))}
        onBlur={(event) => {
          setFocused(false);
          commit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
        className={[inputClass, "pe-11", className].filter(Boolean).join(" ")}
      />
      <label
        htmlFor={pickerId}
        className={[
          "absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-hr-muted transition",
          disabled
            ? "pointer-events-none opacity-40"
            : "cursor-pointer hover:bg-hr-hover hover:text-hr-primary",
        ].join(" ")}
        title={t("common.datePick")}
      >
        <CalendarDays className="size-4" aria-hidden />
        <span className="sr-only">{t("common.datePick")}</span>
        <input
          id={pickerId}
          type="date"
          tabIndex={-1}
          disabled={disabled}
          min={min}
          max={max}
          value={value || ""}
          onChange={(event) => {
            const next = event.target.value;
            if (!next) {
              onChange("");
              setText("");
              return;
            }
            if (!isIsoInRange(next, min, max)) return;
            onChange(next);
            setText(formatDateDisplay(next));
          }}
          className="pointer-events-auto absolute inset-0 cursor-pointer opacity-0"
          aria-hidden
        />
      </label>
    </div>
  );
}
