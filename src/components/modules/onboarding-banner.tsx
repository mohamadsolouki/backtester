"use client";

import { useState } from "react";
import { X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { updateUserSettings } from "@/app/actions/settings";

const steps = [
  { label: "Plan", href: "/opportunities", desc: "Add a Watchlist opportunity and tag your context confirmations." },
  { label: "Execute", href: "/journal", desc: "Record the trade in your Journal with entry/exit and rule breaks." },
  { label: "Analyze", href: "/analytics", desc: "Review your edge in the Analytics and Edge Lab tabs." },
];

export function OnboardingBanner() {
  const [dismissed, setDismissed] = useState(false);

  async function dismiss() {
    setDismissed(true);
    await updateUserSettings({ onboardingSeen: true });
  }

  if (dismissed) return null;

  return (
    <div className="animate-fade-up relative overflow-hidden rounded-lg border border-[var(--teal)]/25 bg-[var(--teal-soft)] p-4">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--teal) 0%, transparent 70%)" }}
      />
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="font-display font-semibold relative text-[16px] text-[var(--teal-dark)]">Welcome to Trade OS</p>
      <p className="relative mt-1 text-[12px] text-[var(--muted)]">
        Trade OS follows a simple loop: Plan your trades, Execute them, then Analyze your edge.
      </p>

      <div className="stagger relative mt-3 grid grid-cols-3 gap-2 max-[560px]:grid-cols-1">
        {steps.map((step, i) => (
          <Link
            key={step.label}
            href={step.href}
            className="shadow-lift group rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 hover:border-[var(--teal)]/50"
          >
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--ink)]">
              <span className="num flex h-4 w-4 items-center justify-center rounded-full bg-[var(--teal)] text-[10px] font-bold text-white">
                {i + 1}
              </span>
              {step.label}
              <ArrowRight className="ml-auto h-3 w-3 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--teal-dark)]" />
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{step.desc}</p>
          </Link>
        ))}
      </div>

      <div className="relative mt-3 flex items-center justify-between">
        <Link href="/help" className="text-[12px] font-medium text-[var(--teal-dark)] hover:underline">
          Full Help Center →
        </Link>
        <button onClick={dismiss} className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)]">
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}
