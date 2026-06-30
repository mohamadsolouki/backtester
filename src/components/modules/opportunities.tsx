"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { SessionName, OpportunityStatus, EntryType, EntryStatus } from "@prisma/client";
import { Surface, SectionTitle, ModuleShell, ActionButton, StatusPill, GradeBadge, Segmented, EmptyState } from "@/components/ui";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";
import { createOpportunity, updateOpportunityStatus, toggleContextTag, updateEntry, deleteOpportunity } from "@/app/actions/opportunities";

const BIAS_OPTIONS = ["Bullish", "Bearish", "Neutral"] as const;

type SerializedOpp = {
  id: string;
  ticker: string;
  pair: string | null;
  setupName: string;
  bias: string;
  primaryContext: string;
  sessionName: string;
  status: string;
  confirmationCount: number;
  grade: string;
  riskReward: string | number | null;
  notes: string | null;
  plannedAt: string;
  contextTags: { id: string; name: string; enabled: boolean; weight: number }[];
  entries: { id: string; type: string; status: string; skipReason: string | null }[];
  trade: { id: string } | null;
  review: { id: string } | null;
};

type StatusFilter = "All" | "WATCHING" | "TAKEN" | "SKIPPED" | "NOT_FORMED";

export function OpportunitiesView({
  opportunities,
  tickerOptions,
  setupOptions,
  primaryContextOptions,
}: {
  opportunities: SerializedOpp[];
  tickerOptions: string[];
  setupOptions: string[];
  primaryContextOptions: string[];
}) {
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(opportunities[0]?.id ?? null);
  const [showForm, setShowForm] = useState(false);

  const filtered = opportunities.filter((o) => {
    const matchesStatus = filter === "All" || o.status === filter;
    const text = `${o.ticker} ${o.setupName} ${o.bias} ${o.primaryContext}`.toLowerCase();
    return matchesStatus && text.includes(query.toLowerCase());
  });

  const selected = opportunities.find((o) => o.id === selectedId) ?? filtered[0] ?? null;

  return (
    <ModuleShell
      title="Opportunities"
      description="Plan, grade, and track trading opportunities before they become trades."
      actions={
        <ActionButton icon={Plus} onClick={() => setShowForm(true)}>New Opportunity</ActionButton>
      }
    >
      {showForm && (
        <NewOpportunityForm
          onClose={() => setShowForm(false)}
          tickerOptions={tickerOptions}
          setupOptions={setupOptions}
          primaryContextOptions={primaryContextOptions}
        />
      )}

      <div className="grid grid-cols-[1fr_360px] gap-2 max-[1080px]:grid-cols-1">
        <Surface>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Segmented
              value={filter}
              options={["All", "WATCHING", "TAKEN", "SKIPPED", "NOT_FORMED"]}
              onChange={(v) => setFilter(v as StatusFilter)}
            />
            <label className="relative min-w-[200px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="h-8 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] pl-3 pr-3 text-[13px] outline-none focus:border-[var(--teal)]"
              />
            </label>
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="No opportunities" description="Create one to start tracking your trading ideas." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-[12px]">
                <thead className="border-y border-[var(--line)] text-[var(--muted)]">
                  <tr>
                    {["Ticker", "Setup", "Bias", "Session", "Status", "Conf", "Grade"].map((h) => (
                      <th key={h} className="h-9 px-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedId(o.id)}
                      className={cn(
                        "cursor-pointer border-b border-[var(--line)] hover:bg-[var(--panel-soft)]",
                        selectedId === o.id && "bg-[var(--panel-soft)]"
                      )}
                    >
                      <td className="h-10 px-2 font-semibold">{o.ticker}</td>
                      <td className="px-2">{o.setupName}</td>
                      <td className="px-2">{o.bias}</td>
                      <td className="px-2">{o.sessionName.replace(/_/g, " ")}</td>
                      <td className="px-2"><StatusPill status={o.status} /></td>
                      <td className="px-2">{o.confirmationCount}</td>
                      <td className="px-2"><GradeBadge grade={o.grade ?? "F"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>

        {selected && <OpportunityDetail opp={selected} />}
      </div>
    </ModuleShell>
  );
}

function NewOpportunityForm({
  onClose,
  tickerOptions,
  setupOptions,
  primaryContextOptions,
}: {
  onClose: () => void;
  tickerOptions: string[];
  setupOptions: string[];
  primaryContextOptions: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [ticker, setTicker] = useState("");
  const [setup, setSetup] = useState("");
  const [bias, setBias] = useState<(typeof BIAS_OPTIONS)[number]>("Bullish");
  const [context, setContext] = useState("");
  const [session, setSession] = useState<SessionName>("OPEN");

  function handleSubmit() {
    if (!ticker || !setup || !bias) { toast.error("Fill required fields"); return; }
    startTransition(async () => {
      await createOpportunity({
        ticker, setupName: setup, bias, primaryContext: context, sessionName: session,
      });
      toast.success("Opportunity created");
      onClose();
    });
  }

  return (
    <Surface>
      <div className="flex items-center justify-between">
        <SectionTitle>New Opportunity</SectionTitle>
        <button onClick={onClose} className="text-[12px] text-[var(--muted)]">Cancel</button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 max-[768px]:grid-cols-1">
        <Combobox label="Ticker" value={ticker} onChange={setTicker} options={tickerOptions} required placeholder="NQ" />
        <Combobox label="Setup" value={setup} onChange={setSetup} options={setupOptions} required placeholder="Momentum Break" />
        <label>
          <span className="text-[12px] text-[var(--muted)]">Session</span>
          <select value={session} onChange={(e) => setSession(e.target.value as SessionName)} className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3">
            {["PRE_MARKET", "OPEN", "MIDDAY", "CLOSE", "POST_MARKET"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[12px] text-[var(--muted)]">Bias</span>
          <select
            value={bias}
            onChange={(e) => setBias(e.target.value as (typeof BIAS_OPTIONS)[number])}
            className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3"
          >
            {BIAS_OPTIONS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
        <div className="col-span-2 max-[768px]:col-span-1">
          <Combobox
            label="Primary Context"
            value={context}
            onChange={setContext}
            options={primaryContextOptions}
            placeholder="Trend continuation above 20 EMA"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="h-9 rounded-md border border-[var(--line)] px-4 text-[12px] font-semibold">Cancel</button>
        <button onClick={handleSubmit} disabled={pending} className="h-9 rounded-md bg-[var(--teal)] px-6 text-[12px] font-semibold text-white disabled:opacity-50">
          {pending ? "Creating..." : "Create"}
        </button>
      </div>
    </Surface>
  );
}

function OpportunityDetail({ opp }: { opp: SerializedOpp }) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: OpportunityStatus) {
    startTransition(async () => {
      await updateOpportunityStatus(opp.id, status);
      toast.success(`Marked as ${status}`);
    });
  }

  function handleToggleTag(tagId: string) {
    startTransition(async () => {
      await toggleContextTag(opp.id, tagId);
    });
  }

  function handleEntryUpdate(entryType: EntryType, status: EntryStatus) {
    startTransition(async () => {
      await updateEntry(opp.id, entryType, status);
    });
  }

  function handleDelete() {
    if (!confirm("Delete this opportunity?")) return;
    startTransition(async () => {
      await deleteOpportunity(opp.id);
      toast.success("Deleted");
    });
  }

  return (
    <div className="space-y-2">
      <Surface>
        <div className="flex items-start justify-between">
          <div>
            <SectionTitle>{opp.ticker} — {opp.setupName}</SectionTitle>
            <p className="mt-1 text-[12px] text-[var(--muted)]">{opp.primaryContext}</p>
          </div>
          <GradeBadge grade={opp.grade ?? "F"} />
        </div>
        <div className="mt-3 space-y-2 text-[13px]">
          <div className="flex justify-between"><span className="text-[var(--muted)]">Bias</span><span className="font-medium">{opp.bias}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Session</span><span>{opp.sessionName.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Confirmations</span><span className="font-semibold">{opp.confirmationCount} / 7</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Status</span><StatusPill status={opp.status} /></div>
          {opp.notes && <p className="mt-2 rounded-md bg-[var(--panel-soft)] p-3 text-[var(--ink)]">{opp.notes}</p>}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button onClick={() => setStatus("TAKEN")} disabled={pending} className="h-9 rounded-md bg-[var(--teal)] text-[12px] font-semibold text-white">Taken</button>
          <button onClick={() => setStatus("SKIPPED")} disabled={pending} className="h-9 rounded-md bg-[var(--amber)] text-[12px] font-semibold text-white">Skipped</button>
          <button onClick={() => setStatus("NOT_FORMED")} disabled={pending} className="h-9 rounded-md bg-[var(--muted)] text-[12px] font-semibold text-white">Not Formed</button>
        </div>
        <button onClick={handleDelete} disabled={pending} className="mt-2 w-full text-center text-[12px] text-[var(--red)] hover:underline">Delete opportunity</button>
      </Surface>

      <Surface>
        <SectionTitle>Context Tags</SectionTitle>
        <div className="mt-3 space-y-2">
          {opp.contextTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleToggleTag(tag.id)}
              disabled={pending}
              className={cn(
                "flex w-full items-center justify-between rounded-md border p-3 text-left text-[13px] transition",
                tag.enabled ? "border-[var(--teal)]/50 bg-[var(--panel-soft)]" : "border-[var(--line)] hover:bg-[var(--panel-soft)]"
              )}
            >
              <span className="font-medium">{tag.name.replace(/_/g, " ")}</span>
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded border text-[11px]",
                tag.enabled ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--line)]"
              )}>
                {tag.enabled && "✓"}
              </span>
            </button>
          ))}
        </div>
      </Surface>

      <Surface>
        <SectionTitle>Entry Plan</SectionTitle>
        <div className="mt-3 space-y-2">
          {opp.entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between gap-2">
              <span className="w-10 text-[12px] font-semibold">{entry.type}</span>
              <select
                value={entry.status}
                onChange={(e) => handleEntryUpdate(entry.type as EntryType, e.target.value as EntryStatus)}
                disabled={pending}
                className="h-8 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 text-[12px]"
              >
                {["WAITING", "TAKEN", "SKIPPED", "NOT_FORMED"].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
              <StatusPill status={entry.status} />
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
