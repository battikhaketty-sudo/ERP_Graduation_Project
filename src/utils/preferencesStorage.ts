export type Locale = "ar" | "en";
export type Theme = "light" | "dark";

const LOCALE_KEY = "hr_locale";
const THEME_KEY = "hr_theme";

export const DEFAULT_LOCALE: Locale = "ar";
export const DEFAULT_THEME: Theme = "light";

export function readStoredLocale(): Locale {
  try {
    const value = localStorage.getItem(LOCALE_KEY);
    return value === "en" ? "en" : "ar";
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "dark" ? "dark" : "light";
  } catch {
    return DEFAULT_THEME;
  }
}

export function writeStoredLocale(locale: Locale) {
  localStorage.setItem(LOCALE_KEY, locale);
}

export function writeStoredTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function applyDocumentPreferences(locale: Locale, theme: Theme) {
  const root = document.documentElement;
  root.lang = locale;
  root.dir = locale === "ar" ? "rtl" : "ltr";
  root.classList.toggle("dark", theme === "dark");
}
