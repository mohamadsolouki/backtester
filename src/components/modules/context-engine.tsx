"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Surface, SectionTitle, ModuleShell, GradeBadge, StatusPill, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";
import { toggleContextTag } from "@/app/actions/opportunities";

type SerializedOpp = {
  id: string;
  ticker: string;
  setupName: string;
  status: string;
  confirmationCount: number;
  grade: string;
  bias: string;
  primaryContext: string;
  contextTags: { id: string; name: string; enabled: boolean; weight: number }[];
  entries: { id: string; type: string; status: string }[];
};

export function ContextEngineView({ opportunities }: { opportunities: SerializedOpp[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(opportunities[0]?.id ?? null);
  const [pending, startTransition] = useTransition();

  const selected = opportunities.find((o) => o.id === selectedId) ?? opportunities[0] ?? null;

  function handleToggleTag(oppId: string, tagId: string) {
    startTransition(async () => {
      await toggleContextTag(oppId, tagId);
    });
  }

  if (opportunities.length === 0) {
    return (
      <ModuleShell title="Context Engine" description="Tag independent context signals to auto-grade opportunities.">
        <EmptyState title="No opportunities" description="Create an opportunity first, then use the Context Engine to grade it." />
      </ModuleShell>
    );
  }

  return (
    <ModuleShell title="Context Engine" description="Tag independent context signals to auto-grade opportunities.">
      <div className="grid grid-cols-[1fr_360px] gap-2 max-[1040px]:grid-cols-1">
        <div className="space-y-2">
          <Surface>
            <div className="mb-3 flex items-center justify-between">
              <SectionTitle>Select Opportunity</SectionTitle>
              {selected && <GradeBadge grade={selected.grade ?? "F"} />}
            </div>
            <div className="flex flex-wrap gap-2">
              {opportunities.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-[12px] font-medium",
                    o.id === selectedId
                      ? "border-[#0f9f95] bg-[#effaf8] text-[#08746f]"
                      : "border-[#dbe2df] hover:bg-[#f5f7f4]"
                  )}
                >
                  {o.ticker} — {o.setupName}
                </button>
              ))}
            </div>
          </Surface>

          {selected && (
            <Surface>
              <div className="flex items-center justify-between">
                <SectionTitle>{selected.ticker} Context Tags</SectionTitle>
                <div className="text-[13px] font-semibold text-[#08746f]">
                  {selected.confirmationCount} / 7 confirmations
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 max-[820px]:grid-cols-2 max-[560px]:grid-cols-1">
                {selected.contextTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleToggleTag(selected.id, tag.id)}
                    disabled={pending}
                    className={cn(
                      "rounded-md border p-4 text-left transition",
                      tag.enabled
                        ? "border-[#89ccc6] bg-[#effaf8]"
                        : "border-[#dbe2df] bg-white hover:bg-[#f5f7f4]"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{tag.name.replace(/_/g, " ")}</span>
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded border",
                          tag.enabled
                            ? "border-[#0f9f95] bg-[#0f9f95] text-white"
                            : "border-[#98a5a0]"
                        )}
                      >
                        {tag.enabled && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </div>
                    <p className="mt-2 text-[12px] text-[#66746f]">
                      Weight {tag.weight > 0 ? `+${tag.weight}` : tag.weight}
                    </p>
                  </button>
                ))}
              </div>
            </Surface>
          )}
        </div>

        {selected && (
          <div className="space-y-2">
            <Surface>
              <SectionTitle>Grade</SectionTitle>
              <div className="mt-3 flex items-center gap-4">
                <div className={cn("rounded border px-4 py-3 text-3xl font-semibold", (() => {
                  const g = selected.grade ?? "F";
                  if (g.startsWith("A")) return "text-teal-700 bg-teal-50 border-teal-200";
                  if (g.startsWith("B")) return "text-amber-700 bg-amber-50 border-amber-200";
                  return "text-red-700 bg-red-50 border-red-200";
                })())}>
                  {selected.grade ?? "F"}
                </div>
                <div className="text-[13px] text-[#66746f]">
                  <div>Confirmations: {selected.confirmationCount}</div>
                  <div>Entries taken: {selected.entries.filter((e) => e.status === "TAKEN").length}</div>
                </div>
              </div>
            </Surface>

            <Surface>
              <SectionTitle>Detail</SectionTitle>
              <div className="mt-3 space-y-2 text-[13px]">
                <div className="flex justify-between"><span className="text-[#66746f]">Setup</span><span className="font-medium">{selected.setupName}</span></div>
                <div className="flex justify-between"><span className="text-[#66746f]">Bias</span><span className="font-medium">{selected.bias}</span></div>
                <div className="flex justify-between"><span className="text-[#66746f]">Status</span><StatusPill status={selected.status} /></div>
                <p className="mt-2 rounded-md bg-[#f5f7f4] p-3 text-[#34413d]">{selected.primaryContext}</p>
              </div>
            </Surface>

            <Surface>
              <SectionTitle>Entry Plan</SectionTitle>
              <div className="mt-3 space-y-2">
                {selected.entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="font-semibold">{entry.type}</span>
                    <StatusPill status={entry.status} />
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
