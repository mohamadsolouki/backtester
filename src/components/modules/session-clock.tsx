"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { Surface, SectionTitle } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/layout/i18n-provider";

/** Approximate session windows in UTC (DST shifts them ±1h). */
const SESSIONS: { name: string; from: number; to: number }[] = [
  { name: "Sydney", from: 21, to: 6 },
  { name: "Tokyo", from: 0, to: 9 },
  { name: "London", from: 7, to: 16 },
  { name: "New York", from: 12, to: 21 },
];

function sessionState(nowUtcHours: number, from: number, to: number) {
  const span = to > from ? to - from : 24 - from + to;
  const elapsed =
    to > from
      ? nowUtcHours >= from && nowUtcHours < to
        ? nowUtcHours - from
        : -1
      : nowUtcHours >= from
        ? nowUtcHours - from
        : nowUtcHours < to
          ? 24 - from + nowUtcHours
          : -1;
  const open = elapsed >= 0;
  const hoursToOpen = open ? 0 : (from - nowUtcHours + 24) % 24;
  const hoursToClose = open ? span - elapsed : 0;
  return { open, progress: open ? elapsed / span : 0, hoursToOpen, hoursToClose };
}

function formatHours(hours: number, t: (s: string) => string): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}${t("m")}`;
  return `${h}${t("h")} ${m}${t("m")}`;
}

export function SessionClock() {
  const { t } = useI18n();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) {
    return (
      <Surface>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-[var(--teal-dark)]" />
          <SectionTitle>{t("Forex Sessions")}</SectionTitle>
        </div>
      </Surface>
    );
  }

  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;

  return (
    <Surface>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-[var(--teal-dark)]" />
          <SectionTitle>{t("Forex Sessions")}</SectionTitle>
        </div>
        <span className="num text-[12px] text-[var(--muted)]">
          UTC {String(now.getUTCHours()).padStart(2, "0")}:{String(now.getUTCMinutes()).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 max-[800px]:grid-cols-2">
        {SESSIONS.map((session) => {
          const state = sessionState(utcHours, session.from, session.to);
          return (
            <div
              key={session.name}
              className={cn(
                "rounded-md border p-3",
                state.open ? "border-[var(--teal)]/50 bg-[var(--teal-soft)]" : "border-[var(--line)]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold">{t(session.name)}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                    state.open ? "bg-[var(--teal)] text-white" : "bg-[var(--panel-soft)] text-[var(--muted)]",
                  )}
                >
                  {state.open ? t("Open") : t("Closed")}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--panel-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--teal)] transition-all"
                  style={{ width: `${Math.round(state.progress * 100)}%` }}
                />
              </div>
              <p className="num mt-1.5 text-[11px] text-[var(--muted)]">
                {state.open
                  ? `${t("Closes in")} ${formatHours(state.hoursToClose, t)}`
                  : `${t("Opens in")} ${formatHours(state.hoursToOpen, t)}`}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        {t("Approximate UTC windows — daylight saving shifts sessions by about an hour.")}
      </p>
    </Surface>
  );
}
