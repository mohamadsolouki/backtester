"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  HelpCircle,
  Import,
  LayoutDashboard,
  NotebookTabs,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  href: string;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Plan",
    items: [
      { label: "Overview", icon: LayoutDashboard, href: "/" },
      { label: "Watchlist", icon: Activity, href: "/opportunities" },
      { label: "Playbook", icon: BookOpen, href: "/playbook" },
    ],
  },
  {
    label: "Execute",
    items: [
      { label: "Routine", icon: ClipboardCheck, href: "/sop" },
      { label: "Journal", icon: NotebookTabs, href: "/journal" },
    ],
  },
  {
    label: "Analyze",
    items: [
      { label: "Analytics", icon: BarChart3, href: "/analytics" },
      { label: "Edge Lab", icon: Database, href: "/backtest" },
      { label: "Reports", icon: FileSpreadsheet, href: "/reports" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Import", icon: Import, href: "/import" },
      { label: "Settings", icon: Settings, href: "/settings" },
      { label: "Help", icon: HelpCircle, href: "/help" },
    ],
  },
];

const COLLAPSE_STORAGE_KEY = "trade-os-sidebar-collapsed";

export function Sidebar({
  mobileOpen,
  setMobileOpen,
}: {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Reads a browser-only API (localStorage) post-mount to avoid an SSR/CSR hydration mismatch.
    const stored = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

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
          "relative z-40 flex min-h-screen flex-col overflow-hidden border-r border-white/8 bg-[var(--nav)] text-white transition-[width] max-[980px]:fixed max-[980px]:inset-y-0 max-[980px]:left-0 max-[980px]:w-[240px] max-[980px]:transition-transform",
          collapsed ? "w-[72px]" : "w-[188px]"
        , !mobileOpen && "max-[980px]:-translate-x-full")}
      >
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full opacity-[0.14] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--teal) 0%, transparent 70%)" }}
        />
        <div className="relative border-b border-white/8 p-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-baseline gap-1.5">
              {collapsed ? (
                <span className="font-display font-semibold text-[22px] text-[var(--teal-dark)]">OS</span>
              ) : (
                <>
                  <span className="font-display font-semibold text-[21px] tracking-[-0.01em] text-white">Trade</span>
                  <span className="num rounded bg-[var(--teal-dark)]/20 px-1.5 py-0.5 text-[11px] font-bold text-[var(--teal-dark)]">OS</span>
                </>
              )}
            </Link>
            <button className="min-[981px]:hidden" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          {!collapsed && <div className="eyebrow mt-2 text-white/35">Trading Intelligence</div>}
        </div>
        <nav className="relative flex-1 space-y-4 overflow-y-auto px-2 py-3 thin-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div className="eyebrow px-3 pb-1.5 text-white/30">
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "relative flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[13.5px] font-medium text-white/70 transition-all",
                        active
                          ? "bg-white/[0.07] text-[var(--teal-dark)]"
                          : "hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-full bg-[var(--teal-dark)]" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <button
          onClick={toggleCollapsed}
          className="relative m-2 hidden h-9 items-center justify-center gap-2 rounded-md border border-white/8 text-[12px] text-white/50 transition-colors hover:border-white/16 hover:bg-white/5 hover:text-white min-[981px]:flex"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && "Collapse"}
        </button>
      </aside>
    </>
  );
}
