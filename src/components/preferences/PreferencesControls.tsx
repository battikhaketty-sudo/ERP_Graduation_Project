import { Languages, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "../../i18n";
import { usePreferences, type Locale, type Theme } from "../../context/PreferencesContext";

type PreferencesControlsProps = {
  compact?: boolean;
  className?: string;
};

function SegmentButton({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={[
        "relative z-[1] min-w-[2.5rem] rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "text-hr-primary"
          : "text-hr-muted hover:text-hr-text",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function LanguageToggle() {
  const { locale, setLocale } = usePreferences();
  const { t } = useTranslation();

  return (
    <div
      className="relative inline-flex items-center rounded-lg border border-hr-border bg-hr-muted/10 p-0.5"
      role="group"
      aria-label={t("common.language")}
    >
      <span
        className={[
          "pointer-events-none absolute inset-y-0.5 w-[calc(50%-2px)] rounded-md bg-hr-surface shadow-sm transition-[inset-inline-start] duration-200",
          locale === "en" ? "start-[calc(50%+1px)]" : "start-0.5",
        ].join(" ")}
        aria-hidden
      />
      {(["ar", "en"] as Locale[]).map((value) => (
        <SegmentButton
          key={value}
          active={locale === value}
          onClick={() => setLocale(value)}
          ariaLabel={value === "ar" ? t("common.switchToArabic") : t("common.switchToEnglish")}
        >
          {value === "ar" ? "ع" : "EN"}
        </SegmentButton>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = usePreferences();
  const { t } = useTranslation();

  return (
    <div
      className="relative inline-flex items-center rounded-lg border border-hr-border bg-hr-muted/10 p-0.5"
      role="group"
      aria-label={t("common.theme")}
    >
      <span
        className={[
          "pointer-events-none absolute inset-y-0.5 w-[calc(50%-2px)] rounded-md bg-hr-surface shadow-sm transition-[inset-inline-start] duration-200",
          theme === "dark" ? "start-[calc(50%+1px)]" : "start-0.5",
        ].join(" ")}
        aria-hidden
      />
      {(["light", "dark"] as Theme[]).map((value) => {
        const Icon = value === "light" ? Sun : Moon;
        return (
          <SegmentButton
            key={value}
            active={theme === value}
            onClick={() => setTheme(value)}
            ariaLabel={
              value === "light" ? t("common.switchToLight") : t("common.switchToDark")
            }
          >
            <Icon className="mx-auto size-3.5" strokeWidth={2} />
          </SegmentButton>
        );
      })}
    </div>
  );
}

export function PreferencesControls({ compact = false, className = "" }: PreferencesControlsProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <LanguageToggle />
        <ThemeToggle />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-hr-border bg-hr-surface/80 p-1.5 shadow-sm backdrop-blur-sm ${className}`}
    >
      <div className="hidden items-center gap-1.5 px-1 text-hr-muted sm:flex">
        <Languages className="size-3.5" strokeWidth={2} />
      </div>
      <LanguageToggle />
      <span className="hidden h-5 w-px bg-hr-border sm:block" aria-hidden />
      <ThemeToggle />
    </div>
  );
}
