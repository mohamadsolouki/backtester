"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Download, Save } from "lucide-react";
import {
  Surface,
  SectionTitle,
  ModuleShell,
  ActionButton,
  StatusPill,
  Segmented,
  TextField,
  NumberField,
  EmptyState,
} from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import { createTrade, updateTrade, deleteTrade } from "@/app/actions/trades";
import { createReview, updateReview } from "@/app/actions/reviews";

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

export function JournalView({ trades }: { trades: SerializedTrade[] }) {
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
      {showForm && <TradeForm onClose={() => setShowForm(false)} />}

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
                <thead className="border-y border-[#e4ebe8] text-[#5f6d68]">
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
                        "cursor-pointer border-b border-[#edf1ef] hover:bg-[#f5faf8]",
                        selectedId === t.id && "bg-[#effaf8]"
                      )}
                    >
                      <td className="h-10 px-2">{new Date(t.openedAt).toLocaleDateString()}</td>
                      <td className="px-2 font-semibold">{t.ticker}</td>
                      <td className="px-2">
                        <span className={cn("font-medium", t.direction === "LONG" ? "text-[#08746f]" : "text-[#d94848]")}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-2">{Number(t.entryPrice).toFixed(2)}</td>
                      <td className="px-2">{t.exitPrice ? Number(t.exitPrice).toFixed(2) : "—"}</td>
                      <td className="px-2">{t.quantity ?? "—"}</td>
                      <td className={cn("px-2 font-semibold", Number(t.rMultiple) >= 0 ? "text-[#08746f]" : "text-[#d94848]")}>
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

        {selected && <TradeDetail trade={selected} />}
      </div>
    </ModuleShell>
  );
}

function TradeForm({ onClose, initial }: { onClose: () => void; initial?: SerializedTrade }) {
  const [pending, startTransition] = useTransition();
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [direction, setDirection] = useState<"LONG" | "SHORT">(initial?.direction as any ?? "LONG");
  const [session, setSession] = useState(initial?.sessionName ?? "OPEN");
  const [entryPrice, setEntryPrice] = useState(initial ? Number(initial.entryPrice) : 0);
  const [exitPrice, setExitPrice] = useState(initial?.exitPrice ? Number(initial.exitPrice) : 0);
  const [quantity, setQuantity] = useState(initial?.quantity ? Number(initial.quantity) : 1);
  const [rMultiple, setRMultiple] = useState(initial ? Number(initial.rMultiple) : 0);
  const [pnl, setPnl] = useState(initial ? Number(initial.pnl) : 0);
  const [fees, setFees] = useState(initial ? Number(initial.fees) : 0);
  const [openedAt, setOpenedAt] = useState(initial ? initial.openedAt.slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [closedAt, setClosedAt] = useState(initial?.closedAt ? initial.closedAt.slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [status, setStatus] = useState(initial?.status ?? "CLOSED");
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
          sessionName: session as any,
          entryPrice,
          exitPrice: exitPrice || undefined,
          quantity,
          rMultiple,
          pnl,
          fees,
          openedAt: new Date(openedAt),
          closedAt: closedAt ? new Date(closedAt) : undefined,
          status: status as any,
          notes,
        });
        toast.success("Trade updated");
      } else {
        await createTrade({
          ticker,
          direction,
          sessionName: session as any,
          entryPrice,
          exitPrice: exitPrice || undefined,
          quantity,
          rMultiple,
          pnl,
          fees,
          openedAt: new Date(openedAt),
          closedAt: closedAt ? new Date(closedAt) : undefined,
          status: status as any,
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
        <button onClick={onClose} className="text-[12px] text-[#66746f] hover:text-[#263331]">Cancel</button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        <TextField label="Ticker" value={ticker} onChange={setTicker} required placeholder="NQ" />
        <label>
          <span className="text-[12px] text-[#66746f]">Direction</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "LONG" | "SHORT")}
            className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3"
          >
            <option value="LONG">Long</option>
            <option value="SHORT">Short</option>
          </select>
        </label>
        <label>
          <span className="text-[12px] text-[#66746f]">Session</span>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3"
          >
            {["PRE_MARKET", "OPEN", "MIDDAY", "CLOSE", "POST_MARKET"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-[12px] text-[#66746f]">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3"
          >
            <option value="CLOSED">Closed</option>
            <option value="OPEN">Open</option>
            <option value="SCRATCH">Scratch</option>
          </select>
        </label>
        <NumberField label="Entry Price" value={entryPrice} onChange={setEntryPrice} step="0.01" />
        <NumberField label="Exit Price" value={exitPrice} onChange={setExitPrice} step="0.01" />
        <NumberField label="Size / Qty" value={quantity} onChange={setQuantity} step="0.01" />
        <NumberField label="R Multiple" value={rMultiple} onChange={setRMultiple} step="0.1" />
        <NumberField label="P&L ($)" value={pnl} onChange={setPnl} step="0.01" />
        <NumberField label="Fees ($)" value={fees} onChange={setFees} step="0.01" />
        <label>
          <span className="text-[12px] text-[#66746f]">Opened At</span>
          <input
            type="datetime-local"
            value={openedAt}
            onChange={(e) => setOpenedAt(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3 text-[13px]"
          />
        </label>
        <label>
          <span className="text-[12px] text-[#66746f]">Closed At</span>
          <input
            type="datetime-local"
            value={closedAt}
            onChange={(e) => setClosedAt(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3 text-[13px]"
          />
        </label>
        <div className="col-span-2 max-[560px]:col-span-1">
          <TextField label="Rule Break (if any)" value={ruleBreak} onChange={setRuleBreak} placeholder="e.g. Moved stop loss" />
        </div>
        <label className="col-span-4 max-[900px]:col-span-2 max-[560px]:col-span-1">
          <span className="text-[12px] text-[#66746f]">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 min-h-20 w-full rounded-md border border-[#cfd8d4] bg-white p-3 text-[13px]"
            placeholder="Trade notes, observations, lessons..."
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="h-9 rounded-md border border-[#cfd8d4] px-4 text-[12px] font-semibold">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="h-9 rounded-md bg-[#0f9f95] px-6 text-[12px] font-semibold text-white hover:bg-[#08746f] disabled:opacity-50"
        >
          {pending ? "Saving..." : initial ? "Update Trade" : "Create Trade"}
        </button>
      </div>
    </Surface>
  );
}

function TradeDetail({ trade }: { trade: SerializedTrade }) {
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
            <button onClick={() => setEditing(true)} className="text-[12px] text-[#08746f] hover:underline">Edit</button>
            <button onClick={handleDelete} className="text-[12px] text-[#d94848] hover:underline">Delete</button>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-[13px]">
          <div className="flex justify-between"><span className="text-[#66746f]">Direction</span><span className="font-medium">{trade.direction}</span></div>
          <div className="flex justify-between"><span className="text-[#66746f]">Entry</span><span className="font-medium">{Number(trade.entryPrice).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[#66746f]">Exit</span><span className="font-medium">{trade.exitPrice ? Number(trade.exitPrice).toFixed(2) : "Open"}</span></div>
          <div className="flex justify-between"><span className="text-[#66746f]">Size</span><span className="font-medium">{trade.quantity ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-[#66746f]">R Multiple</span><span className={cn("font-semibold", Number(trade.rMultiple) >= 0 ? "text-[#08746f]" : "text-[#d94848]")}>{Number(trade.rMultiple).toFixed(2)}R</span></div>
          <div className="flex justify-between"><span className="text-[#66746f]">P&L</span><span className="font-semibold">{formatCurrency(Number(trade.pnl))}</span></div>
          <div className="flex justify-between"><span className="text-[#66746f]">Fees</span><span>{formatCurrency(Number(trade.fees))}</span></div>
          <div className="flex justify-between"><span className="text-[#66746f]">Session</span><span>{trade.sessionName.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-[#66746f]">Opened</span><span>{new Date(trade.openedAt).toLocaleString()}</span></div>
          {trade.closedAt && <div className="flex justify-between"><span className="text-[#66746f]">Closed</span><span>{new Date(trade.closedAt).toLocaleString()}</span></div>}
          {trade.notes && <p className="mt-2 rounded-md bg-[#f5f7f4] p-3 text-[#34413d]">{trade.notes}</p>}
          {trade.ruleBreaks.length > 0 && (
            <div className="mt-2">
              <div className="text-[12px] font-semibold text-[#d94848]">Rule Breaks</div>
              {trade.ruleBreaks.map((rb) => (
                <div key={rb.id} className="mt-1 rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px]">
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
            <span className="text-[12px] text-[#66746f]">Score (1-10)</span>
            <input
              type="range"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="mt-1 w-full"
            />
            <div className="text-right text-[12px] font-semibold text-[#08746f]">{score}/10</div>
          </label>
          <label>
            <span className="text-[12px] text-[#66746f]">Lesson Learned</span>
            <textarea
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              className="mt-1 min-h-20 w-full rounded-md border border-[#cfd8d4] bg-white p-3 text-[13px]"
              placeholder="What did you learn from this trade?"
            />
          </label>
          <label>
            <span className="text-[12px] text-[#66746f]">Action Item</span>
            <input
              value={actionItem}
              onChange={(e) => setActionItem(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3 text-[13px]"
              placeholder="What will you do differently next time?"
            />
          </label>
          <button
            onClick={saveReview}
            disabled={pending || !lesson}
            className="h-9 w-full rounded-md bg-[#0f9f95] text-[12px] font-semibold text-white hover:bg-[#08746f] disabled:opacity-50"
          >
            {pending ? "Saving..." : trade.review ? "Update Review" : "Save Review"}
          </button>
        </div>
      </Surface>

      {editing && (
        <TradeForm onClose={() => setEditing(false)} initial={trade} />
      )}
    </div>
  );
}
