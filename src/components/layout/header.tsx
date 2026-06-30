"use client";

import { signOut } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { useTransition } from "react";
import { format } from "date-fns";
import {
  Bell,
  LogOut,
  Moon,
  PanelLeftClose,
  Sun,
} from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";
import { parseDateRangeSearchParams, type DateRangePreset, type ResolvedDateRange } from "@/lib/date-range";
import { sessionNames, type SessionName } from "@/lib/domain";

const routeLabels: Record<string, string> = {
  "/": "Overview",
  "/opportunities": "Watchlist",
  "/journal": "Journal",
  "/backtest": "Edge Lab",
  "/sop": "Routine",
  "/playbook": "Playbook",
  "/context-engine": "Context Engine",
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
  const { preset, range, sessions: activeSessions } = parseDateRangeSearchParams(
    Object.fromEntries(searchParams.entries())
  );
  const label = routeLabels[pathname] ?? "Trade OS";

  function pushParams(next: { preset?: DateRangePreset; range?: ResolvedDateRange; sessions?: SessionName[] }) {
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
      if (nextRange.from) params.set("from", format(nextRange.from, "yyyy-MM-dd"));
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
    <header className="flex h-[76px] items-center gap-6 border-b border-white/10 bg-[var(--nav)] px-4 text-white max-[760px]:h-auto max-[760px]:flex-wrap max-[760px]:py-3">
      <button
        className="hidden rounded-md border border-white/15 p-2 text-white/70 max-[980px]:block"
        onClick={openMobileNav}
        aria-label="Open navigation"
      >
        <PanelLeftClose className="h-4 w-4" />
      </button>
      <div className="min-w-[146px]">
        <div className="text-[12px] text-white/62">{label}</div>
        <DateRangePicker
          preset={preset}
          range={range}
          onChange={(nextPreset, nextRange) => pushParams({ preset: nextPreset, range: nextRange })}
        />
      </div>
      <div className="h-8 w-px bg-white/14 max-[760px]:hidden" />
      <div className="min-w-[460px] flex-1 max-[760px]:min-w-full">
        <div className="text-[12px] text-white/62">Session</div>
        <div className="mt-1 grid h-8 grid-cols-5 overflow-hidden rounded-md border border-white/14 bg-white/5">
          {sessionNames.map((item) => (
            <button
              key={item}
              onClick={() => toggleSession(item)}
              className={cn(
                "text-[12px] text-white/72 transition hover:bg-white/10",
                activeSessions.includes(item) && "bg-[var(--teal)] text-white hover:bg-[var(--teal)]"
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1" />
      <button
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        className="rounded-full border border-white/14 p-2 text-white/74 hover:bg-white/8"
        aria-label="Toggle theme"
        title="Toggle theme"
      >
        <Sun className="hidden h-4 w-4 dark:block" />
        <Moon className="block h-4 w-4 dark:hidden" />
      </button>
      <Bell className="h-5 w-5 shrink-0 text-white/72" />
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-full border border-white/14 p-2 text-white/74 hover:bg-white/8"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/60 text-[14px] font-semibold">
        {initials}
      </div>
    </header>
  );
}
