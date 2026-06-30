"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Toaster } from "sonner";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName?: string | null;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { resolvedTheme } = useTheme();

  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <Toaster position="top-right" richColors theme={resolvedTheme === "dark" ? "dark" : "light"} />
      <div className="grid min-h-screen grid-cols-[auto_minmax(0,1fr)] max-[980px]:grid-cols-1">
        <Sidebar mobileOpen={mobileNavOpen} setMobileOpen={setMobileNavOpen} />
        <section className="min-w-0">
          <Header
            openMobileNav={() => setMobileNavOpen(true)}
            userName={userName}
          />
          <div className="thin-scrollbar h-[calc(100vh-76px)] overflow-auto px-2 pb-2">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
