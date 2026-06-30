"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { SessionName, TradeStatus } from "@prisma/client";
import {
  Surface,
  SectionTitle,
  ModuleShell,
  ActionButton,
  StatusPill,
  Segmented,
  NumberField,
  EmptyState,
} from "@/components/ui";
import { Combobox } from "@/components/ui/combobox";
import { HelpTip } from "@/components/ui/help-tip";
import { helpTips } from "@/lib/help-content";
import { cn, formatCurrency } from "@/lib/utils";
import { createTrade, updateTrade, deleteTrade } from "@/app/actions/trades";
import { createReview, updateReview } from "@/app/actions/reviews";
import { createRuleBreakDefinition } from "@/app/actions/vocab";

type SerializedTrade = {
  id: string;
  ticker: string;
  direction: string;
  sessionName: string;
  status: string;
  quantity: string | number | null;
  entryPrice: string | number;
  exitPrice: string | number | null;
  rMultiple: string | number;
  pnl: string | number;
  fees: string | number;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  ruleBreaks: { id: string; rule: string; severity: number; description: string | null }[];
  review: { id: string; score: number; lesson: string; actionItem: string | null } | null;
  opportunity: { id: string; ticker: string; setupName: string } | null;
};

type JournalFilter = "All" | "Wins" | "Losses" | "Rule Breaks" | "Open";

export function JournalView({
  trades,
  tickerOptions,
  ruleBreakOptions,
}: {
  trades: SerializedTrade[];
  tickerOptions: string[];
  ruleBreakOptions: string[];
}) {
  const [filter, setFilter] = useState<JournalFilter>("All");
  const [selectedId, setSelectedId] = useState<string | null>(trades[0]?.id ?? null);
  const [showForm, setShowForm] = useState(false);

  const filtered = trades.filter((t) => {
    if (filter === "Wins") return Number(t.rMultiple) > 0;
    if (filter === "Losses") return Number(t.rMultiple) < 0;
    if (filter === "Rule Breaks") return t.ruleBreaks.length > 0;
    if (filter === "Open") return t.status === "OPEN";
    return true;
  });

  const selected = trades.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  return (
    <ModuleShell
      title="Trade Journal"
      description="Record, review, and learn from every trade. Add trades manually or import from MetaTrader."
      actions={
        <ActionButton icon={Plus} onClick={() => setShowForm(true)}>
          Add Trade
        </ActionButton>
      }
    >
      {showForm && (
        <TradeForm
          onClose={() => setShowForm(false)}
          tickerOptions={tickerOptions}
          ruleBreakOptions={ruleBreakOptions}
        />
      )}

      <div className="grid grid-cols-[1fr_380px] gap-2 max-[1080px]:grid-cols-1">
        <Surface>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Trades</SectionTitle>
            <Segmented
              value={filter}
              options={["All", "Wins", "Losses", "Rule Breaks", "Open"]}
              onChange={(v) => setFilter(v as JournalFilter)}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title="No trades found"
              description={trades.length === 0 ? "Add your first trade or import from MetaTrader." : "No trades match this filter."}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[12px]">
                <thead className="border-y border-[var(--line)] text-[var(--muted)]">
                  <tr>
                    {["Date", "Ticker", "Dir", "Entry", "Exit", "Size", "R", "P&L", "Status", "Rules"].map((h) => (
                      <th key={h} className="h-9 px-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={cn(
                        "cursor-pointer border-b border-[var(--line)] hover:bg-[var(--panel-soft)]",
                        selectedId === t.id && "bg-[var(--panel-soft)]"
                      )}
                    >
                      <td className="h-10 px-2">{new Date(t.openedAt).toLocaleDateString()}</td>
                      <td className="px-2 font-semibold">{t.ticker}</td>
                      <td className="px-2">
                        <span className={cn("font-medium", t.direction === "LONG" ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-2">{Number(t.entryPrice).toFixed(2)}</td>
                      <td className="px-2">{t.exitPrice ? Number(t.exitPrice).toFixed(2) : "—"}</td>
                      <td className="px-2">{t.quantity ?? "—"}</td>
                      <td className={cn("px-2 font-semibold", Number(t.rMultiple) >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                        {Number(t.rMultiple).toFixed(1)}R
                      </td>
                      <td className="px-2">{formatCurrency(Number(t.pnl))}</td>
                      <td className="px-2"><StatusPill status={t.status} /></td>
                      <td className="px-2">{t.ruleBreaks.length > 0 ? <StatusPill status="SKIPPED" label={String(t.ruleBreaks.length)} /> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>

        {selected && (
          <TradeDetail trade={selected} tickerOptions={tickerOptions} ruleBreakOptions={ruleBreakOptions} />
        )}
      </div>
    </ModuleShell>
  );
}

function TradeForm({
  onClose,
  initial,
  tickerOptions,
  ruleBreakOptions,
}: {
  onClose: () => void;
  initial?: SerializedTrade;
  tickerOptions: string[];
  ruleBreakOptions: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [direction, setDirection] = useState<"LONG" | "SHORT">((initial?.direction as "LONG" | "SHORT") ?? "LONG");
  const [session, setSession] = useState<SessionName>((initial?.sessionName as SessionName) ?? "OPEN");
  const [entryPrice, setEntryPrice] = useState(initial ? Number(initial.entryPrice) : 0);
  const [exitPrice, setExitPrice] = useState(initial?.exitPrice ? Number(initial.exitPrice) : 0);
  const [quantity, setQuantity] = useState(initial?.quantity ? Number(initial.quantity) : 1);
  const [rMultiple, setRMultiple] = useState(initial ? Number(initial.rMultiple) : 0);
  const [pnl, setPnl] = useState(initial ? Number(initial.pnl) : 0);
  const [fees, setFees] = useState(initial ? Number(initial.fees) : 0);
  const [openedAt, setOpenedAt] = useState(initial ? initial.openedAt.slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [closedAt, setClosedAt] = useState(initial?.closedAt ? initial.closedAt.slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [status, setStatus] = useState<TradeStatus>((initial?.status as TradeStatus) ?? "CLOSED");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [ruleBreak, setRuleBreak] = useState("");

  function handleSubmit() {
    if (!ticker || !entryPrice) {
      toast.error("Ticker and entry price are required");
      return;
    }

    startTransition(async () => {
      if (initial) {
        await updateTrade(initial.id, {
          ticker,
          direction,
          sessionName: session,
          entryPrice,
          exitPrice: exitPrice || undefined,
          quantity,
          rMultiple,
          pnl,
          fees,
          openedAt: new Date(openedAt),
          closedAt: closedAt ? new Date(closedAt) : undefined,
          status,
          notes,
        });
        toast.success("Trade updated");
      } else {
        await createTrade({
          ticker,
          direction,
          sessionName: session,
          entryPrice,
          exitPrice: exitPrice || undefined,
          quantity,
          rMultiple,
          pnl,
          fees,
          openedAt: new Date(openedAt),
          closedAt: closedAt ? new Date(closedAt) : undefined,
          status,
          notes,
          ruleBreaks: ruleBreak ? [{ rule: ruleBreak, severity: 1 }] : undefined,
        });
        toast.success("Trade created");
      }
      onClose();
    });
  }

  return (
    <Surface>
      <div className="flex items-center justify-between">
        <SectionTitle>{initial ? "Edit Trade" : "New Trade"}</SectionTitle>
        <button onClick={onClose} className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)]">Cancel</button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        <Combobox label="Ticker" value={ticker} onChange={setTicker} options={tickerOptions} required placeholder="NQ" />
        <label>
          <span className="text-[12px] text-[var(--muted)]">Direction</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "LONG" | "SHORT")}
            className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3"
          >
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>
        </label>
        <label>
          <span className="text-[12px] text-[var(--muted)]">Session</span>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value as SessionName)}
            className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3"
          >
            {["PRE_MARKET", "OPEN", "MIDDAY", "CLOSE", "POST_MARKET"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[12px] text-[var(--muted)]">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TradeStatus)}
            className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3"
          >
            <option value="CLOSED">Closed</option>
            <option value="OPEN">Open</option>
            <option value="SCRATCH">Scratch</option>
          </select>
        </label>
        <NumberField label="Entry Price" value={entryPrice} onChange={setEntryPrice} step="0.01" />
        <NumberField label="Exit Price" value={exitPrice} onChange={setExitPrice} step="0.01" />
        <NumberField label="Size / Qty" value={quantity} onChange={setQuantity} step="0.01" />
        <NumberField label={<span className="inline-flex items-center gap-1">R Multiple <HelpTip content={helpTips.rMultiple} /></span>} value={rMultiple} onChange={setRMultiple} step="0.1" />
        <NumberField label="P&L ($)" value={pnl} onChange={setPnl} step="0.01" />
        <NumberField label="Fees ($)" value={fees} onChange={setFees} step="0.01" />
        <label>
          <span className="text-[12px] text-[var(--muted)]">Opened At</span>
          <input
            type="datetime-local"
            value={openedAt}
            onChange={(e) => setOpenedAt(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px]"
          />
        </label>
        <label>
          <span className="text-[12px] text-[var(--muted)]">Closed At</span>
          <input
            type="datetime-local"
            value={closedAt}
            onChange={(e) => setClosedAt(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px]"
          />
        </label>
        <div className="col-span-2 max-[560px]:col-span-1">
          <Combobox
            label={<span className="inline-flex items-center gap-1">Rule Break (if any) <HelpTip content="Tag any discipline violations: moved stop, oversized position, FOMO entry, etc. Used in Analytics to measure the cost of rule breaks." /></span>}
            value={ruleBreak}
            onChange={setRuleBreak}
            options={ruleBreakOptions}
            onCreate={async (name) => {
              await createRuleBreakDefinition(name);
            }}
            placeholder="e.g. Moved Stop"
          />
        </div>
        <label className="col-span-4 max-[900px]:col-span-2 max-[560px]:col-span-1">
          <span className="text-[12px] text-[var(--muted)]">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 min-h-20 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-[13px]"
            placeholder="Trade notes, observations, lessons..."
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="h-9 rounded-md border border-[var(--line)] px-4 text-[12px] font-semibold">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="h-9 rounded-md bg-[var(--teal)] px-6 text-[12px] font-semibold text-white hover:bg-[var(--teal-dark)] disabled:opacity-50"
        >
          {pending ? "Saving..." : initial ? "Update Trade" : "Create Trade"}
        </button>
      </div>
    </Surface>
  );
}

function TradeDetail({
  trade,
  tickerOptions,
  ruleBreakOptions,
}: {
  trade: SerializedTrade;
  tickerOptions: string[];
  ruleBreakOptions: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [lesson, setLesson] = useState(trade.review?.lesson ?? "");
  const [score, setScore] = useState(trade.review?.score ?? 5);
  const [actionItem, setActionItem] = useState(trade.review?.actionItem ?? "");

  function saveReview() {
    startTransition(async () => {
      if (trade.review) {
        await updateReview(trade.review.id, { score, lesson, actionItem: actionItem || undefined });
      } else {
        await createReview({ score, lesson, actionItem: actionItem || undefined, tradeId: trade.id });
      }
      toast.success("Review saved");
    });
  }

  function handleDelete() {
    if (!confirm("Delete this trade? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteTrade(trade.id);
      toast.success("Trade deleted");
    });
  }

  return (
    <div className="space-y-2">
      <Surface>
        <div className="flex items-start justify-between">
          <SectionTitle>{trade.ticker} Trade Detail</SectionTitle>
          <div className="flex gap-2">
            <button onClick={() => setEditing(true)} className="text-[12px] text-[var(--teal-dark)] hover:underline">Edit</button>
            <button onClick={handleDelete} className="text-[12px] text-[var(--red)] hover:underline">Delete</button>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-[13px]">
          <div className="flex justify-between"><span className="text-[var(--muted)]">Direction</span><span className="font-medium">{trade.direction}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Entry</span><span className="font-medium">{Number(trade.entryPrice).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Exit</span><span className="font-medium">{trade.exitPrice ? Number(trade.exitPrice).toFixed(2) : "Open"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Size</span><span className="font-medium">{trade.quantity ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">R Multiple</span><span className={cn("font-semibold", Number(trade.rMultiple) >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>{Number(trade.rMultiple).toFixed(2)}R</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">P&L</span><span className="font-semibold">{formatCurrency(Number(trade.pnl))}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Fees</span><span>{formatCurrency(Number(trade.fees))}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Session</span><span>{trade.sessionName.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Opened</span><span>{new Date(trade.openedAt).toLocaleString()}</span></div>
          {trade.closedAt && <div className="flex justify-between"><span className="text-[var(--muted)]">Closed</span><span>{new Date(trade.closedAt).toLocaleString()}</span></div>}
          {trade.notes && <p className="mt-2 rounded-md bg-[var(--panel-soft)] p-3 text-[var(--ink)]">{trade.notes}</p>}
          {trade.ruleBreaks.length > 0 && (
            <div className="mt-2">
              <div className="text-[12px] font-semibold text-[var(--red)]">Rule Breaks</div>
              {trade.ruleBreaks.map((rb) => (
                <div key={rb.id} className="mt-1 rounded border border-[var(--red)]/30 bg-[var(--red)]/10 px-3 py-2 text-[12px]">
                  {rb.rule}{rb.description ? ` — ${rb.description}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </Surface>

      <Surface>
        <SectionTitle>Trade Review</SectionTitle>
        <div className="mt-3 space-y-3">
          <label>
            <span className="text-[12px] text-[var(--muted)]">Score (1-10)</span>
            <input
              type="range"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="mt-1 w-full"
            />
            <div className="text-right text-[12px] font-semibold text-[var(--teal-dark)]">{score}/10</div>
          </label>
          <label>
            <span className="text-[12px] text-[var(--muted)]">Lesson Learned</span>
            <textarea
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              className="mt-1 min-h-20 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-[13px]"
              placeholder="What did you learn from this trade?"
            />
          </label>
          <label>
            <span className="text-[12px] text-[var(--muted)]">Action Item</span>
            <input
              value={actionItem}
              onChange={(e) => setActionItem(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px]"
              placeholder="What will you do differently next time?"
            />
          </label>
          <button
            onClick={saveReview}
            disabled={pending || !lesson}
            className="h-9 w-full rounded-md bg-[var(--teal)] text-[12px] font-semibold text-white hover:bg-[var(--teal-dark)] disabled:opacity-50"
          >
            {pending ? "Saving..." : trade.review ? "Update Review" : "Save Review"}
          </button>
        </div>
      </Surface>

      {editing && (
        <TradeForm
          onClose={() => setEditing(false)}
          initial={trade}
          tickerOptions={tickerOptions}
          ruleBreakOptions={ruleBreakOptions}
        />
      )}
    </div>
  );
}
