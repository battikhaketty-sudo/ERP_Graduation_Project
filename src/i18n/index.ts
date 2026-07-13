import { useCallback, useMemo } from "react";
import { usePreferences } from "../context/PreferencesContext";
import type { Locale } from "../utils/preferencesStorage";
import { ar } from "./locales/ar";
import { en } from "./locales/en";
import type { TranslationKey } from "./types";

const dictionaries = { ar, en } as const;

type Dictionary = (typeof dictionaries)[Locale];

function resolvePath(dictionary: Dictionary, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = dictionary;

  for (const part of parts) {
    if (current == null || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

export function createTranslator(locale: Locale) {
  const dictionary = dictionaries[locale];

  return (
    key: TranslationKey,
    params?: Record<string, string | number> | string,
  ) => {
    let fallback: string | undefined;
    let values: Record<string, string | number> | undefined;

    if (typeof params === "string") {
      fallback = params;
    } else {
      values = params;
    }

    let text = resolvePath(dictionary, key) ?? fallback ?? key;

    if (values) {
      for (const [name, value] of Object.entries(values)) {
        text = text.replace(new RegExp(`\\{\\{${name}\\}\\}`, "g"), String(value));
      }
    }

    return text;
  };
}

export function useTranslation() {
  const { locale } = usePreferences();

  const t = useMemo(() => createTranslator(locale), [locale]);

  const formatDate = useCallback(
    (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => {
      const date = value instanceof Date ? value : new Date(value);
      return new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : "en-US", options).format(date);
    },
    [locale],
  );

  return { t, locale, formatDate };
}

export type { TranslationKey };
