"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import {
  Bell,
  CalendarDays,
  LogOut,
  PanelLeftClose,
} from "lucide-react";

const sessionNames = ["Pre-Market", "Open", "Midday", "Close", "Post-Market"] as const;

const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/opportunities": "Opportunities",
  "/journal": "Trade Journal",
  "/backtest": "Backtest DB",
  "/sop": "SOP",
  "/playbook": "Playbook",
  "/context-engine": "Context Engine",
  "/analytics": "Analytics",
  "/reports": "Reports",
  "/settings": "Settings",
  "/import": "Import",
};

export function Header({
  openMobileNav,
  userName,
}: {
  openMobileNav: () => void;
  userName?: string | null;
}) {
  const pathname = usePathname();
  const label = routeLabels[pathname] ?? "Playbook OS";
  const initials = userName
    ? userName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "TR";

  return (
    <header className="flex h-[76px] items-center gap-6 border-b border-[#dbe2df] bg-[#071b20] px-4 text-white max-[760px]:h-auto max-[760px]:flex-wrap max-[760px]:py-3">
      <button
        className="hidden rounded-md border border-white/15 p-2 text-white/70 max-[980px]:block"
        onClick={openMobileNav}
        aria-label="Open navigation"
      >
        <PanelLeftClose className="h-4 w-4" />
      </button>
      <div className="min-w-[146px]">
        <div className="text-[12px] text-white/62">{label}</div>
        <div className="mt-1 flex h-8 items-center gap-2 rounded-md border border-white/14 bg-white/8 px-3 text-[13px]">
          {format(new Date(), "MMM d, yyyy")}
          <CalendarDays className="h-3.5 w-3.5 text-white/64" />
        </div>
      </div>
      <div className="h-8 w-px bg-white/14 max-[760px]:hidden" />
      <div className="min-w-[460px] flex-1 max-[760px]:min-w-full">
        <div className="text-[12px] text-white/62">Session</div>
        <div className="mt-1 grid h-8 grid-cols-5 overflow-hidden rounded-md border border-white/14 bg-white/5">
          {sessionNames.map((item) => (
            <button
              key={item}
              className="text-[12px] text-white/72 transition hover:bg-white/10"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1" />
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
