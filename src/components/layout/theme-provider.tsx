"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  defaultTheme,
}: {
  children: React.ReactNode;
  defaultTheme?: string;
}) {
  return (
    <NextThemesProvider attribute="class" defaultTheme={defaultTheme ?? "light"} enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
