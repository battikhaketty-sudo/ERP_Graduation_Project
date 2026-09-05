import { useEffect, useId, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useTranslation } from "../../i18n";
import {
  formatDateTimeDisplay,
  isLocalDateTimeInRange,
  parseManualDateTime,
  sanitizeDateTimeTyping,
} from "../../utils/timeInput";
import { inputClass } from "./formStyles";

type DateTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  min?: string;
  max?: string;
  "aria-label"?: string;
};

/**
 * Day-first datetime field: dd/MM/yyyy HH:mm.
 * Stored as YYYY-MM-DDTHH:mm for the API helpers.
 */
export function DateTimeInput({
  value,
  onChange,
  className = "",
  min,
  max,
  "aria-label": ariaLabel,
}: DateTimeInputProps) {
  const { t } = useTranslation();
  const autoId = useId();
  const pickerId = `${autoId}-picker`;
  const [text, setText] = useState(() => formatDateTimeDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (focused) return;
    setText(formatDateTimeDisplay(value));
  }, [focused, value]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange("");
      setText("");
      return;
    }
    const local = parseManualDateTime(trimmed);
    if (!local || !isLocalDateTimeInRange(local, min, max)) {
      setText(formatDateTimeDisplay(value));
      return;
    }
    onChange(local);
    setText(formatDateTimeDisplay(local));
  };

  return (
    <div className="relative" dir="ltr">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        aria-label={ariaLabel}
        placeholder={t("common.dateTimePlaceholder")}
        title={t("common.dateTimeHint")}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(event) => setText(sanitizeDateTimeTyping(event.target.value))}
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
        className={[inputClass, "pe-11 text-start", className]
          .filter(Boolean)
          .join(" ")}
      />
      <label
        htmlFor={pickerId}
        className="absolute end-2 top-1/2 z-10 -translate-y-1/2 cursor-pointer rounded-md p-1 text-hr-muted transition hover:bg-hr-hover hover:text-hr-primary"
        title={t("common.datePick")}
      >
        <CalendarDays className="size-4" aria-hidden />
        <span className="sr-only">{t("common.datePick")}</span>
        <input
          id={pickerId}
          type="datetime-local"
          tabIndex={-1}
          min={min || undefined}
          max={max || undefined}
          value={value || ""}
          onChange={(event) => {
            const next = event.target.value;
            if (!next) {
              onChange("");
              setText("");
              return;
            }
            const local = next.length >= 16 ? next.slice(0, 16) : next;
            if (!isLocalDateTimeInRange(local, min, max)) return;
            onChange(local);
            setText(formatDateTimeDisplay(local));
          }}
          className="pointer-events-auto absolute inset-0 cursor-pointer opacity-0"
          aria-hidden
        />
      </label>
    </div>
  );
}
