"use client";

import { signOut } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import { format } from "date-fns";
import { Bell, LogOut, Moon, PanelLeftClose, Sun } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { updateUserSettings } from "@/app/actions/settings";
import { cn } from "@/lib/utils";
import {
  parseDateRangeSearchParams,
  type DateRangePreset,
  type ResolvedDateRange,
} from "@/lib/date-range";
import { sessionNames, type SessionName } from "@/lib/domain";
import { useI18n } from "@/components/layout/i18n-provider";

const routeLabels: Record<string, string> = {
  "/": "Overview",
  "/opportunities": "Watchlist",
  "/journal": "Journal",
  "/backtest": "Edge Lab",
  "/sop": "Routine",
  "/playbook": "Playbook",
  "/analytics": "Analytics",
  "/reports": "Reports",
  "/settings": "Settings",
  "/import": "Import",
  "/help": "Help",
};

export function Header({
  openMobileNav,
  userName,
}: {
  openMobileNav: () => void;
  userName?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const {
    preset,
    range,
    sessions: activeSessions,
  } = parseDateRangeSearchParams(Object.fromEntries(searchParams.entries()));
  const label = routeLabels[pathname] ?? "Trade OS";

  function pushParams(next: {
    preset?: DateRangePreset;
    range?: ResolvedDateRange;
    sessions?: SessionName[];
  }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextPreset = next.preset ?? preset;
    const nextRange = next.range ?? range;
    const nextSessions = next.sessions ?? activeSessions;

    if (nextPreset === "all_time") {
      params.delete("range");
    } else {
      params.set("range", nextPreset);
    }
    if (nextPreset === "custom" && (nextRange.from || nextRange.to)) {
      if (nextRange.from)
        params.set("from", format(nextRange.from, "yyyy-MM-dd"));
      else params.delete("from");
      if (nextRange.to) params.set("to", format(nextRange.to, "yyyy-MM-dd"));
      else params.delete("to");
    } else {
      params.delete("from");
      params.delete("to");
    }
    if (nextSessions.length) params.set("sessions", nextSessions.join(","));
    else params.delete("sessions");

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }

  function toggleSession(name: SessionName) {
    const next = activeSessions.includes(name)
      ? activeSessions.filter((s) => s !== name)
      : [...activeSessions, name];
    pushParams({ sessions: next });
  }
  const initials = userName
    ? userName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "TR";

  return (
    <header className="flex h-16 items-center gap-3 border-b border-white/8 bg-[var(--nav)] px-4 text-white max-[760px]:h-auto max-[760px]:flex-wrap max-[760px]:gap-y-2 max-[760px]:py-3">
      <button
        className="hidden rounded-md border border-white/12 p-2 text-white/70 max-[980px]:block"
        onClick={openMobileNav}
        aria-label={t("Open navigation")}
      >
        <PanelLeftClose className="h-4 w-4 rtl:-scale-x-100" />
      </button>
      <div className="flex shrink-0 items-center gap-2">
        <span className="eyebrow whitespace-nowrap text-white/45">
          {t(label)}
        </span>
        <DateRangePicker
          preset={preset}
          range={range}
          onChange={(nextPreset, nextRange) =>
            pushParams({ preset: nextPreset, range: nextRange })
          }
        />
      </div>
      <div className="h-6 w-px shrink-0 bg-white/10 max-[760px]:hidden" />
      <div className="flex min-w-0 items-center gap-2 max-[760px]:w-full">
        <span className="eyebrow shrink-0 text-white/45">{t("Session")}</span>
        <div className="flex flex-wrap gap-1">
          {sessionNames.map((item) => {
            const on = activeSessions.includes(item);
            return (
              <button
                key={item}
                onClick={() => toggleSession(item)}
                className={cn(
                  "flex h-7 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-[10.5px] font-medium transition-all",
                  on
                    ? "border-[var(--teal-dark)]/50 bg-[var(--teal-dark)]/18 text-[var(--teal-dark)]"
                    : "border-white/10 text-white/55 hover:border-white/20 hover:text-white/85",
                )}
              >
                <span
                  className={cn(
                    "h-[4px] w-[4px] shrink-0 rounded-full transition-colors",
                    on ? "bg-[var(--teal-dark)]" : "bg-white/25",
                  )}
                />
                {t(item)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1" />
      <LanguageSwitcher />
      <button
        onClick={() => {
          const next = resolvedTheme === "dark" ? "light" : "dark";
          setTheme(next);
          updateUserSettings({ theme: next });
        }}
        className="rounded-full border border-white/12 p-2 text-white/74 transition-colors hover:border-white/24 hover:bg-white/8"
        aria-label={t("Toggle theme")}
        title={t("Toggle theme")}
      >
        <Sun className="hidden h-4 w-4 dark:block" />
        <Moon className="block h-4 w-4 dark:hidden" />
      </button>
      <Bell className="h-5 w-5 shrink-0 text-white/72" />
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-full border border-white/12 p-2 text-white/74 transition-colors hover:border-white/24 hover:bg-white/8"
        aria-label={t("Sign out")}
        title={t("Sign out")}
      >
        <LogOut className="h-4 w-4" />
      </button>
      <div className="num flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--teal-dark)]/50 bg-[var(--teal-dark)]/12 text-[13px] font-semibold text-[var(--teal-dark)]">
        {initials}
      </div>
    </header>
  );
}
