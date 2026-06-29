"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  Gauge,
  Import,
  LayoutDashboard,
  NotebookTabs,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Opportunities", icon: Activity, href: "/opportunities" },
  { label: "Trade Journal", icon: NotebookTabs, href: "/journal" },
  { label: "Backtest DB", icon: Database, href: "/backtest" },
  { label: "SOP", icon: ClipboardCheck, href: "/sop" },
  { label: "Playbook", icon: BookOpen, href: "/playbook" },
  { label: "Context Engine", icon: Gauge, href: "/context-engine" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Reports", icon: FileSpreadsheet, href: "/reports" },
  { label: "Import", icon: Import, href: "/import" },
  { label: "Settings", icon: Settings, href: "/settings" },
] as const;

export function Sidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/40 min-[981px]:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={cn(
          "z-40 flex min-h-screen flex-col border-r border-white/10 bg-[#061b20] text-white max-[980px]:fixed max-[980px]:inset-y-0 max-[980px]:left-0 max-[980px]:w-[230px] max-[980px]:transition-transform",
          !mobileOpen && "max-[980px]:-translate-x-full"
        )}
      >
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-[20px] font-semibold tracking-[-0.01em]">
              Playbook <span className="text-[#18c8bd]">OS</span>
            </Link>
            <button className="min-[981px]:hidden" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1 text-[13px] text-white/74">Trading Intelligence</div>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-[14px] font-medium text-white/78 transition",
                  active && "bg-white/8 text-[#29d5ca] shadow-[inset_-3px_0_0_#18c8bd]",
                  !active && "hover:bg-white/6 hover:text-white",
                  index === 4 || index === 7 ? "mt-8" : ""
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
