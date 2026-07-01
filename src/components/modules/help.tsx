"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  Activity,
  BookOpen,
  ClipboardList,
  BookMarked,
  BarChart2,
  FlaskConical,
  FileText,
  Upload,
  Settings as SettingsIcon,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Surface, ModuleShell } from "@/components/ui";
import { helpModules, quickStartSteps, type ModuleHelp } from "@/lib/help-content";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Activity,
  BookOpen,
  ClipboardList,
  BookMarked,
  BarChart2,
  FlaskConical,
  FileText,
  Upload,
  Settings: SettingsIcon,
};

export function HelpView() {
  const [activeId, setActiveId] = useState("quickstart");
  const active = helpModules.find((m) => m.id === activeId) ?? null;

  return (
    <ModuleShell title="Help Center" eyebrow="System" description="Guides and reference for every module in Trade OS.">
      <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-4 max-[768px]:grid-cols-1">
        <nav className="space-y-3">
          <button
            onClick={() => setActiveId("quickstart")}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors",
              activeId === "quickstart"
                ? "bg-[var(--teal)] text-white"
                : "text-[var(--ink)] hover:bg-[var(--panel-soft)]"
            )}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Quick Start
          </button>

          <div>
            <div className="eyebrow px-3 pb-1.5 text-[var(--muted)]">Modules</div>
            <div className="space-y-0.5">
              {helpModules.map((m) => {
                const Icon = ICONS[m.icon] ?? LayoutDashboard;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveId(m.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors",
                      activeId === m.id
                        ? "bg-[var(--teal)] text-white"
                        : "text-[var(--ink)] hover:bg-[var(--panel-soft)]"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        <div className="animate-fade-up space-y-3">
          {active ? <ModuleHelpPanel module={active} /> : <QuickStartPanel />}

          <div className="rounded-lg border border-[var(--teal)]/20 bg-[var(--teal-soft)] p-4">
            <p className="text-[12px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--teal-dark)]">Tip.</span> Look for the{" "}
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--muted)] text-[10px]">?</span>{" "}
              icon next to labels throughout the app for field-level guidance without leaving the page.
            </p>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}

function QuickStartPanel() {
  return (
    <Surface>
      <div className="mb-5">
        <div className="eyebrow text-[var(--teal-dark)]">Getting started</div>
        <h2 className="font-display font-semibold mt-1 text-[22px] text-[var(--ink)]">The Plan → Execute → Analyze loop</h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">
          Trade OS is built around one workflow: plan an idea, execute and journal it, then analyze what actually works. Five steps to get fully set up.
        </p>
      </div>

      <div className="stagger space-y-2.5">
        {quickStartSteps.map((step) => (
          <Link
            key={step.step}
            href={step.href}
            className="shadow-lift group flex items-start gap-3.5 rounded-lg border border-[var(--line)] bg-[var(--panel-soft)]/50 p-4"
          >
            <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--teal)]/40 bg-[var(--teal-soft)] text-[12px] font-bold text-[var(--teal-dark)]">
              {step.step}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--ink)]">
                {step.title}
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--teal-dark)]" />
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted)]">{step.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </Surface>
  );
}

function ModuleHelpPanel({ module: m }: { module: ModuleHelp }) {
  const Icon = ICONS[m.icon] ?? LayoutDashboard;
  return (
    <Surface>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--teal)]/30 bg-[var(--teal-soft)]">
          <Icon className="h-[18px] w-[18px] text-[var(--teal-dark)]" />
        </span>
        <div>
          <h2 className="font-display font-semibold text-[22px] text-[var(--ink)]">{m.label}</h2>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">{m.tagline}</p>
        </div>
      </div>

      <div className="space-y-5">
        {m.sections.map((section) => (
          <div key={section.heading} className="border-t border-[var(--line-soft)] pt-4 first:border-t-0 first:pt-0">
            <h3 className="relative pl-2.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--ink)] before:absolute before:left-0 before:top-[3px] before:h-[11px] before:w-[2.5px] before:rounded-full before:bg-[var(--teal)] before:content-['']">
              {section.heading}
            </h3>
            {section.body && (
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink)]">{section.body}</p>
            )}
            {section.items && (
              <ul className="mt-2 space-y-1.5">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] leading-relaxed text-[var(--ink)]">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--teal)]" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Surface>
  );
}
