"use client";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useI18n } from "@/components/layout/i18n-provider";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#061713] p-4">
      <div className="absolute end-4 top-4 z-10">
        <LanguageSwitcher compact />
      </div>
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-[0.16] blur-[100px]"
        style={{ background: "radial-gradient(circle, #22c9bc 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full opacity-[0.1] blur-[100px]"
        style={{ background: "radial-gradient(circle, #22c9bc 0%, transparent 70%)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] bg-[length:24px_24px]" />
      <div className="animate-fade-up relative w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="flex items-baseline justify-center gap-2">
            <span className="font-display font-semibold text-[34px] tracking-[-0.01em] text-white">Trade</span>
            <span className="rounded-md bg-[#22c9bc]/15 px-2 py-0.5 font-mono text-[16px] font-bold text-[#5eead4]">OS</span>
          </h1>
          <p className="eyebrow mt-2 text-white/40">{t("Trading Intelligence Platform")}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
