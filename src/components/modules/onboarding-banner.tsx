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
    <div className="relative rounded-md border border-[var(--teal)]/30 bg-[var(--teal)]/8 p-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-[var(--muted)] hover:text-[var(--ink)]"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="text-[13px] font-semibold text-[var(--teal-dark)]">Welcome to Trade OS</p>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        Trade OS follows a simple loop: Plan your trades, Execute them, then Analyze your edge.
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2 max-[560px]:grid-cols-1">
        {steps.map((step, i) => (
          <Link
            key={step.label}
            href={step.href}
            className="rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 hover:border-[var(--teal)]/50 hover:bg-[var(--panel-soft)]"
          >
            <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--ink)]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--teal)] text-[10px] font-bold text-white">
                {i + 1}
              </span>
              {step.label}
              <ArrowRight className="ml-auto h-3 w-3 text-[var(--muted)]" />
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{step.desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Link href="/help" className="text-[12px] text-[var(--teal-dark)] hover:underline">
          Full Help Center →
        </Link>
        <button onClick={dismiss} className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)]">
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}
