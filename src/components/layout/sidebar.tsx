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
          "z-40 flex min-h-screen flex-col border-r border-white/10 bg-[var(--nav)] text-white transition-[width] max-[980px]:fixed max-[980px]:inset-y-0 max-[980px]:left-0 max-[980px]:w-[230px] max-[980px]:transition-transform",
          collapsed ? "w-[68px]" : "w-[176px]",
          !mobileOpen && "max-[980px]:-translate-x-full"
        )}
      >
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className={cn(
                "text-[20px] font-semibold tracking-[-0.01em]",
                collapsed && "max-[980px]:block hidden"
              )}
            >
              {collapsed ? (
                <span className="text-[#18c8bd]">OS</span>
              ) : (
                <>
                  Trade <span className="text-[#18c8bd]">OS</span>
                </>
              )}
            </Link>
            <button className="min-[981px]:hidden" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          {!collapsed && <div className="mt-1 text-[13px] text-white/74">Trading Intelligence</div>}
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3 thin-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/40">
                  {group.label}
                </div>
              )}
              <div className="space-y-1">
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
                        "flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-[14px] font-medium text-white/78 transition",
                        active && "bg-white/8 text-[#29d5ca] shadow-[inset_-3px_0_0_#18c8bd]",
                        !active && "hover:bg-white/6 hover:text-white"
                      )}
                    >
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
          className="m-2 hidden h-9 items-center justify-center gap-2 rounded-md border border-white/10 text-[12px] text-white/60 hover:bg-white/6 hover:text-white min-[981px]:flex"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && "Collapse"}
        </button>
      </aside>
    </>
  );
}
