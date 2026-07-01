"use client";

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
  defaultLocale,
  getLocaleDirection,
  localeCookieName,
  translate,
  type Locale,
} from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  t: (source: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const dir = getLocaleDirection(locale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${localeCookieName}=${next}; path=/; max-age=31536000; samesite=lax`;
    window.localStorage.setItem(localeCookieName, next);
  }, []);

  const t = useCallback((source: string) => translate(locale, source), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.body.dir = dir;
  }, [dir, locale]);

  const value = useMemo(() => ({ locale, dir, setLocale, t }), [dir, locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) {
    return {
      locale: defaultLocale,
      dir: "ltr" as const,
      setLocale: () => undefined,
      t: (source: string) => source,
    };
  }
  return value;
}
