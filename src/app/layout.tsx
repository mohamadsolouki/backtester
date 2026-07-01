import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist_Mono, Noto_Sans, Vazirmatn } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthSessionProvider } from "@/components/layout/session-provider";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { I18nProvider } from "@/components/layout/i18n-provider";
import { defaultLocale, getLocaleDirection, isLocale, localeCookieName } from "@/lib/i18n";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-sans-base",
  subsets: ["latin", "latin-ext"],
});

const vazirmatn = Vazirmatn({
  variable: "--font-sans-persian-arabic",
  subsets: ["arabic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trade OS",
  description: "Internal operating system for discretionary trading.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  const dir = getLocaleDirection(locale);
  const settings = session?.user?.id
    ? await prisma.userSettings.findUnique({ where: { userId: session.user.id }, select: { theme: true } })
    : null;

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${notoSans.variable} ${vazirmatn.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body dir={dir} className="min-h-full bg-background text-foreground antialiased">
        <ThemeProvider defaultTheme={settings?.theme ?? "light"}>
          <I18nProvider initialLocale={locale}>
            <AuthSessionProvider>{children}</AuthSessionProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
