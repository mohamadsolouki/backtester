"use client";

import { useState } from "react";
import { Surface, SectionTitle, ModuleShell } from "@/components/ui";
import { helpModules, type ModuleHelp } from "@/lib/help-content";
import { cn } from "@/lib/utils";

export function HelpView() {
  const [activeId, setActiveId] = useState(helpModules[0].id);
  const active = helpModules.find((m) => m.id === activeId) ?? helpModules[0];

  return (
    <ModuleShell title="Help Center" description="Guides and tips for every module in Trade OS.">
      <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-4 max-[768px]:grid-cols-1">
        <nav className="space-y-0.5">
          {helpModules.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveId(m.id)}
              className={cn(
                "w-full rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors",
                activeId === m.id
                  ? "bg-[var(--teal)] text-white"
                  : "text-[var(--ink)] hover:bg-[var(--panel-soft)]"
              )}
            >
              {m.label}
            </button>
          ))}
        </nav>

        <div className="space-y-3">
          <Surface>
            <div className="mb-4">
              <h2 className="text-[18px] font-bold text-[var(--ink)]">{active.label}</h2>
              <p className="mt-1 text-[13px] text-[var(--muted)]">{active.tagline}</p>
            </div>
            <div className="space-y-5">
              {active.sections.map((section) => (
                <div key={section.heading}>
                  <SectionTitle>{section.heading}</SectionTitle>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink)]">{section.body}</p>
                </div>
              ))}
            </div>
          </Surface>

          <div className="rounded-md border border-[var(--teal)]/20 bg-[var(--teal)]/5 p-4">
            <p className="text-[12px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--teal-dark)]">Tip:</span> Look for the{" "}
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--muted)] text-[10px]">?</span>{" "}
              icon next to labels throughout the app for field-level guidance.
            </p>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}

export function HelpModuleCard({ module: m }: { module: ModuleHelp }) {
  return (
    <Surface>
      <SectionTitle>{m.label}</SectionTitle>
      <p className="mt-1 text-[12px] text-[var(--muted)]">{m.tagline}</p>
      <div className="mt-3 space-y-3">
        {m.sections.map((s) => (
          <div key={s.heading}>
            <p className="text-[12px] font-semibold text-[var(--ink)]">{s.heading}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{s.body}</p>
          </div>
        ))}
      </div>
    </Surface>
  );
}
