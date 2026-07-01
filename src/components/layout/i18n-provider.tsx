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

const textNodeSources = new WeakMap<Text, string>();
const attrNames = ["placeholder", "title", "aria-label", "alt"] as const;

function shouldSkipNode(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  return !!parent.closest("script,style,textarea,code,pre,[data-no-translate]");
}

function applyTranslations(locale: Locale) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
      return node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

  textNodes.forEach((node) => {
    const source = textNodeSources.get(node) ?? node.textContent ?? "";
    if (!textNodeSources.has(node)) textNodeSources.set(node, source);
    const translated = translate(locale, source);
    if (node.textContent !== translated) node.textContent = translated;
  });

  document.querySelectorAll<HTMLElement>("input,textarea,button,a,img,[title],[aria-label]").forEach((el) => {
    attrNames.forEach((attr) => {
      const value = el.getAttribute(attr);
      if (!value?.trim()) return;
      const sourceKey = `i18nOriginal${attr.replace("-", "")}`;
      const dataset = el.dataset as DOMStringMap & Record<string, string | undefined>;
      const source = dataset[sourceKey] ?? value;
      dataset[sourceKey] = source;
      const translated = translate(locale, source);
      if (value !== translated) el.setAttribute(attr, translated);
    });
  });
}

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
  }, []);

  const t = useCallback((source: string) => translate(locale, source), [locale]);

  useEffect(() => {
    window.localStorage.setItem(localeCookieName, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.body.dir = dir;
    applyTranslations(locale);

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => applyTranslations(locale));
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...attrNames],
    });
    return () => observer.disconnect();
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
