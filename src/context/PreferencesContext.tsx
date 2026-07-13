import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyDocumentPreferences,
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  readStoredLocale,
  readStoredTheme,
  writeStoredLocale,
  writeStoredTheme,
  type Locale,
  type Theme,
} from "../utils/preferencesStorage";

type PreferencesContextValue = {
  locale: Locale;
  theme: Theme;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  toggleLocale: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale());
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());

  useEffect(() => {
    applyDocumentPreferences(locale, theme);
  }, [locale, theme]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeStoredLocale(next);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeStoredTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "ar" ? "en" : "ar");
  }, [locale, setLocale]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      locale,
      theme,
      dir: locale === "ar" ? "rtl" : "ltr",
      setLocale,
      setTheme,
      toggleTheme,
      toggleLocale,
    }),
    [locale, theme, setLocale, setTheme, toggleTheme, toggleLocale],
  );

  return (
    <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return context;
}

export { DEFAULT_LOCALE, DEFAULT_THEME, type Locale, type Theme };
