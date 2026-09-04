type TimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "aria-label"?: string;
};

export function TimeInput({
  value,
  onChange,
  className = "",
  "aria-label": ariaLabel,
}: TimeInputProps) {
  return (
    <input
      type="time"
      step={60}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className={[
        "h-10 w-full min-w-0 rounded-lg border border-hr-border bg-hr-input-bg px-2 text-center text-sm text-hr-text outline-none transition",
        "focus:border-hr-primary focus:ring-2 focus:ring-hr-primary/20",
        "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
        className,
      ].join(" ")}
    />
  );
}
