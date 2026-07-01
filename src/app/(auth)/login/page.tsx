"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/components/layout/i18n-provider";

const DEMO_EMAIL = "demo@playbookos.app";
const DEMO_PASSWORD = "DemoTrader2026!";

export default function LoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function doSignIn(signInEmail: string, signInPassword: string) {
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: signInEmail,
      password: signInPassword,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(t("Invalid email or password"));
    } else {
      // Hard navigation (not router.push) so the root layout re-fetches the
      // session server-side and next-themes mounts fresh with the account's
      // saved theme — router.push alone leaves ThemeProvider on its
      // pre-login (unauthenticated) defaultTheme since it only reads that
      // prop on initial mount.
      window.location.href = "/";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await doSignIn(email, password);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 bg-white/[0.04] p-7 shadow-[0_1px_2px_rgba(0,0,0,0.2),0_30px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      <h2 className="font-display font-semibold text-[20px] text-white">{t("Sign in")}</h2>
      <p className="mt-1 text-[13px] text-white/45">{t("Enter your credentials to access the platform.")}</p>

      <button
        type="button"
        onClick={() => doSignIn(DEMO_EMAIL, DEMO_PASSWORD)}
        disabled={loading}
        className="mt-5 flex w-full items-center justify-between rounded-md border border-[#22c9bc]/35 bg-[#22c9bc]/8 px-3 py-2.5 text-start transition-all hover:border-[#22c9bc]/55 hover:bg-[#22c9bc]/14 active:scale-[0.99] disabled:opacity-50"
      >
        <span>
          <span className="block text-[13px] font-semibold text-[#5eead4]">{t("Try the demo account")}</span>
          <span className="mt-0.5 block text-[11px] text-white/45">{DEMO_EMAIL} · {t("pre-loaded with sample trades")}</span>
        </span>
        <span className="eyebrow rounded border border-[#22c9bc]/35 px-2 py-1 text-[#5eead4]">
          {t("One click")}
        </span>
      </button>

      <div className="mt-5 flex items-center gap-3 text-[11px] text-white/25">
        <div className="h-px flex-1 bg-white/10" />
        {t("or sign in manually")}
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300">
          {error}
        </div>
      )}

      <label className="mt-5 block">
        <span className="eyebrow text-white/40">{t("Email")}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1.5 h-10 w-full rounded-md border border-white/12 bg-white/[0.03] px-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#22c9bc]/60"
          placeholder="you@example.com"
        />
      </label>

      <label className="mt-4 block">
        <span className="eyebrow text-white/40">{t("Password")}</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1.5 h-10 w-full rounded-md border border-white/12 bg-white/[0.03] px-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#22c9bc]/60"
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="mt-6 h-10 w-full rounded-md bg-[#0f9f95] text-[14px] font-semibold text-white transition-all hover:bg-[#08746f] active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? t("Signing in...") : t("Sign in")}
      </button>

      <p className="mt-4 text-center text-[13px] text-white/45">
        {t("No account?")}{" "}
        <Link href="/register" className="text-[#5eead4] hover:underline">
          {t("Create one")}
        </Link>
      </p>
    </form>
  );
}
