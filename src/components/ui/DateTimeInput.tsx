type DateTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
};

export function DateTimeInput({
  value,
  onChange,
  className = "",
  "aria-label": ariaLabel,
}: DateTimeInputProps) {
  return (
    <input
      type="datetime-local"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className={[
        "h-11 w-full rounded-lg border border-hr-border bg-hr-input-bg px-3 text-sm text-hr-text outline-none transition",
        "focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20",
        "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
        className,
      ].join(" ")}
    />
  );
}
