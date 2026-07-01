"use client";

import { Languages } from "lucide-react";
import { locales, localeMeta, type Locale } from "@/lib/i18n";
import { useI18n } from "./i18n-provider";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label
      className={
        compact
          ? "flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-2 text-white"
          : "flex h-9 items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 text-white transition-colors hover:border-white/24 hover:bg-white/10"
      }
      title={t("Switch language")}
    >
      <Languages className="h-4 w-4 shrink-0 text-white/74" />
      <span className="sr-only">{t("Language")}</span>
      <select
        aria-label={t("Switch language")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="h-7 cursor-pointer rounded bg-transparent text-[12px] font-semibold text-white outline-none [color-scheme:dark]"
      >
        {locales.map((item) => (
          <option key={item} value={item} className="bg-[var(--nav)] text-white">
            {localeMeta[item].nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
