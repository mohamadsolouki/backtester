import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  Geist_Mono,
  Noto_Naskh_Arabic,
  Noto_Sans,
  Noto_Sans_Arabic,
  Noto_Sans_Devanagari,
  Noto_Sans_Hebrew,
  Noto_Sans_JP,
  Noto_Sans_KR,
  Noto_Sans_SC,
} from "next/font/google";
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
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext", "devanagari"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-sans-arabic",
  subsets: ["arabic", "latin"],
});

const notoNaskh = Noto_Naskh_Arabic({
  variable: "--font-sans-persian",
  subsets: ["arabic", "latin"],
});

const notoHebrew = Noto_Sans_Hebrew({
  variable: "--font-sans-hebrew",
  subsets: ["hebrew", "latin"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-sans-devanagari",
  subsets: ["devanagari", "latin"],
});

const notoJapanese = Noto_Sans_JP({
  variable: "--font-sans-jp",
  subsets: ["latin"],
});

const notoKorean = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
});

const notoChinese = Noto_Sans_SC({
  variable: "--font-sans-sc",
  subsets: ["latin"],
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
      className={`${notoSans.variable} ${notoArabic.variable} ${notoNaskh.variable} ${notoHebrew.variable} ${notoDevanagari.variable} ${notoJapanese.variable} ${notoKorean.variable} ${notoChinese.variable} ${geistMono.variable} h-full antialiased`}
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
