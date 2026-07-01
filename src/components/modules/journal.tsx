"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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

type SerializedRuleBreak = { id: string; rule: string; severity: number; description: string | null };

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
  ruleBreaks: SerializedRuleBreak[];
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
  const [editingTrade, setEditingTrade] = useState<SerializedTrade | null>(null);

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
        <NewTradeForm
          onClose={() => setShowForm(false)}
          tickerOptions={tickerOptions}
          ruleBreakOptions={ruleBreakOptions}
        />
      )}

      {editingTrade && (
        <TradeEditModal
          trade={editingTrade}
          ruleBreakOptions={ruleBreakOptions}
          onClose={() => setEditingTrade(null)}
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
          <TradeDetail
            trade={selected}
            onEdit={() => setEditingTrade(selected)}
          />
        )}
      </div>
    </ModuleShell>
  );
}

// ── New Trade Form (inline, above table) ─────────────────────────────────────

function NewTradeForm({
  onClose,
  tickerOptions,
  ruleBreakOptions,
}: {
  onClose: () => void;
  tickerOptions: string[];
  ruleBreakOptions: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [ticker, setTicker] = useState("");
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [session, setSession] = useState<SessionName>("OPEN");
  const [entryPrice, setEntryPrice] = useState(0);
  const [exitPrice, setExitPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [rMultiple, setRMultiple] = useState(0);
  const [pnl, setPnl] = useState(0);
  const [fees, setFees] = useState(0);
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 16));
  const [closedAt, setClosedAt] = useState(new Date().toISOString().slice(0, 16));
  const [status, setStatus] = useState<TradeStatus>("CLOSED");
  const [notes, setNotes] = useState("");
  const [ruleBreak, setRuleBreak] = useState("");

  function handleSubmit() {
    if (!ticker || !entryPrice) { toast.error("Ticker and entry price are required"); return; }
    startTransition(async () => {
      await createTrade({
        ticker, direction, sessionName: session, entryPrice,
        exitPrice: exitPrice || undefined, quantity, rMultiple, pnl, fees,
        openedAt: new Date(openedAt),
        closedAt: closedAt ? new Date(closedAt) : undefined,
        status, notes,
        ruleBreaks: ruleBreak ? [{ rule: ruleBreak, severity: 1 }] : undefined,
      });
      toast.success("Trade created");
      onClose();
    });
  }

  return (
    <Surface>
      <div className="flex items-center justify-between">
        <SectionTitle>New Trade</SectionTitle>
        <button onClick={onClose} className="text-[12px] text-[var(--muted)] hover:text-[var(--ink)]">Cancel</button>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
        <Combobox label="Ticker" value={ticker} onChange={setTicker} options={tickerOptions} required placeholder="NQ" />
        <SelectField label="Direction" value={direction} onChange={(v) => setDirection(v as "LONG" | "SHORT")} options={[["LONG", "Long"], ["SHORT", "Short"]]} />
        <SelectField label="Session" value={session} onChange={(v) => setSession(v as SessionName)} options={[["PRE_MARKET", "Pre Market"], ["OPEN", "Open"], ["MIDDAY", "Midday"], ["CLOSE", "Close"], ["POST_MARKET", "Post Market"]]} />
        <SelectField label="Status" value={status} onChange={(v) => setStatus(v as TradeStatus)} options={[["CLOSED", "Closed"], ["OPEN", "Open"], ["SCRATCH", "Scratch"]]} />
        <NumberField label="Entry Price" value={entryPrice} onChange={setEntryPrice} step="0.01" />
        <NumberField label="Exit Price" value={exitPrice} onChange={setExitPrice} step="0.01" />
        <NumberField label="Size / Qty" value={quantity} onChange={setQuantity} step="0.01" />
        <NumberField label={<span className="inline-flex items-center gap-1">R Multiple <HelpTip content={helpTips.rMultiple} /></span>} value={rMultiple} onChange={setRMultiple} step="0.1" />
        <NumberField label="P&L ($)" value={pnl} onChange={setPnl} step="0.01" />
        <NumberField label="Fees ($)" value={fees} onChange={setFees} step="0.01" />
        <DateTimeField label="Opened At" value={openedAt} onChange={setOpenedAt} />
        <DateTimeField label="Closed At" value={closedAt} onChange={setClosedAt} />
        <div className="col-span-2 max-[560px]:col-span-1">
          <Combobox
            label={<span className="inline-flex items-center gap-1">Rule Break (if any) <HelpTip content="Tag any discipline violations." /></span>}
            value={ruleBreak} onChange={setRuleBreak} options={ruleBreakOptions}
            onCreate={async (name) => { await createRuleBreakDefinition(name); }}
            placeholder="e.g. Moved Stop"
          />
        </div>
        <label className="col-span-2 max-[560px]:col-span-1">
          <span className="text-[12px] text-[var(--muted)]">Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="mt-1 min-h-16 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
            placeholder="Trade notes, observations..." />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="h-9 rounded-md border border-[var(--line)] px-4 text-[12px] font-semibold">Cancel</button>
        <button onClick={handleSubmit} disabled={pending}
          className="h-9 rounded-md bg-[var(--teal)] px-6 text-[12px] font-semibold text-white hover:bg-[var(--teal-dark)] disabled:opacity-50">
          {pending ? "Saving..." : "Create Trade"}
        </button>
      </div>
    </Surface>
  );
}

// ── Trade Edit Modal (slide-over) ─────────────────────────────────────────────

function TradeEditModal({
  trade,
  ruleBreakOptions,
  onClose,
}: {
  trade: SerializedTrade;
  ruleBreakOptions: string[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"data" | "context">("data");

  // Data tab state
  const [direction, setDirection] = useState<"LONG" | "SHORT">(trade.direction as "LONG" | "SHORT");
  const [session, setSession] = useState<SessionName>(trade.sessionName as SessionName);
  const [status, setStatus] = useState<TradeStatus>(trade.status as TradeStatus);
  const [entryPrice, setEntryPrice] = useState(Number(trade.entryPrice));
  const [exitPrice, setExitPrice] = useState(trade.exitPrice ? Number(trade.exitPrice) : 0);
  const [quantity, setQuantity] = useState(trade.quantity ? Number(trade.quantity) : 1);
  const [rMultiple, setRMultiple] = useState(Number(trade.rMultiple));
  const [pnl, setPnl] = useState(Number(trade.pnl));
  const [fees, setFees] = useState(Number(trade.fees));
  const [openedAt, setOpenedAt] = useState(trade.openedAt.slice(0, 16));
  const [closedAt, setClosedAt] = useState(trade.closedAt ? trade.closedAt.slice(0, 16) : "");

  // Context tab state
  const [notes, setNotes] = useState(trade.notes ?? "");
  const [existingBreaks, setExistingBreaks] = useState<SerializedRuleBreak[]>(trade.ruleBreaks);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [newBreaks, setNewBreaks] = useState<string[]>([]);
  const [newBreakInput, setNewBreakInput] = useState("");

  function removeExisting(id: string) {
    setExistingBreaks((prev) => prev.filter((rb) => rb.id !== id));
    setRemovedIds((prev) => [...prev, id]);
  }

  function addNewBreak(rule: string) {
    if (!rule.trim() || newBreaks.includes(rule)) return;
    setNewBreaks((prev) => [...prev, rule]);
    setNewBreakInput("");
  }

  function removeNew(rule: string) {
    setNewBreaks((prev) => prev.filter((r) => r !== rule));
  }

  function handleSave() {
    startTransition(async () => {
      await updateTrade(trade.id, {
        direction, sessionName: session, status,
        entryPrice, exitPrice: exitPrice || undefined,
        quantity, rMultiple, pnl, fees,
        openedAt: new Date(openedAt),
        closedAt: closedAt ? new Date(closedAt) : undefined,
        notes,
        ruleBreaksToAdd: newBreaks.map((rule) => ({ rule, severity: 1 })),
        ruleBreakIdsToRemove: removedIds,
      });
      toast.success("Trade updated");
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex" aria-modal>
      <div className="flex-1 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="flex h-full w-[600px] max-w-[95vw] flex-col border-l border-[var(--line)] bg-[var(--panel)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[var(--ink)]">Edit Trade</h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {trade.ticker} · {trade.direction} · {new Date(trade.openedAt).toLocaleDateString()}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex gap-0.5 border-b border-[var(--line)] px-6">
          {(["data", "context"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-3 py-2.5 text-[13px] font-medium capitalize transition-colors",
                tab === t
                  ? "border-b-2 border-[var(--teal)] text-[var(--teal-dark)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              )}
            >
              {t === "data" ? "Trade Data" : "Context & Rules"}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "data" && (
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Direction" value={direction} onChange={(v) => setDirection(v as "LONG" | "SHORT")} options={[["LONG", "Long"], ["SHORT", "Short"]]} />
              <SelectField label="Session" value={session} onChange={(v) => setSession(v as SessionName)} options={[["PRE_MARKET", "Pre Market"], ["OPEN", "Open"], ["MIDDAY", "Midday"], ["CLOSE", "Close"], ["POST_MARKET", "Post Market"]]} />
              <SelectField label="Status" value={status} onChange={(v) => setStatus(v as TradeStatus)} options={[["CLOSED", "Closed"], ["OPEN", "Open"], ["SCRATCH", "Scratch"]]} />
              <div />
              <NumberField label="Entry Price" value={entryPrice} onChange={setEntryPrice} step="0.01" />
              <NumberField label="Exit Price" value={exitPrice} onChange={setExitPrice} step="0.01" />
              <NumberField label="Size / Qty" value={quantity} onChange={setQuantity} step="0.01" />
              <NumberField label={<span className="inline-flex items-center gap-1">R Multiple <HelpTip content={helpTips.rMultiple} /></span>} value={rMultiple} onChange={setRMultiple} step="0.1" />
              <NumberField label="P&L ($)" value={pnl} onChange={setPnl} step="0.01" />
              <NumberField label="Fees ($)" value={fees} onChange={setFees} step="0.01" />
              <DateTimeField label="Opened At" value={openedAt} onChange={setOpenedAt} />
              <DateTimeField label="Closed At" value={closedAt} onChange={setClosedAt} />
            </div>
          )}

          {tab === "context" && (
            <div className="space-y-5">
              {/* Notes */}
              <label>
                <span className="text-[12px] font-medium text-[var(--muted)]">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 min-h-28 w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] p-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                  placeholder="Setup rationale, what you saw, what happened..."
                />
              </label>

              {/* Existing rule breaks */}
              <div>
                <p className="text-[12px] font-medium text-[var(--muted)]">Rule Breaks</p>
                <div className="mt-2 space-y-1.5">
                  {existingBreaks.length === 0 && newBreaks.length === 0 && (
                    <p className="text-[12px] text-[var(--muted)]">No rule breaks tagged.</p>
                  )}
                  {existingBreaks.map((rb) => (
                    <div key={rb.id} className="flex items-center justify-between rounded-md border border-[var(--red)]/30 bg-[var(--red)]/8 px-3 py-2 text-[13px]">
                      <span className="font-medium">{rb.rule}</span>
                      <button onClick={() => removeExisting(rb.id)} aria-label="Remove" className="text-[var(--red)] hover:opacity-70">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {newBreaks.map((rule) => (
                    <div key={rule} className="flex items-center justify-between rounded-md border border-[var(--amber)]/30 bg-[var(--amber)]/8 px-3 py-2 text-[13px]">
                      <span className="font-medium">{rule}</span>
                      <button onClick={() => removeNew(rule)} aria-label="Remove" className="text-[var(--amber)] hover:opacity-70">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new break */}
                <div className="mt-3">
                  <Combobox
                    label="Add Rule Break"
                    value={newBreakInput}
                    onChange={(v) => setNewBreakInput(v)}
                    options={ruleBreakOptions.filter((o) =>
                      !existingBreaks.some((rb) => rb.rule === o) && !newBreaks.includes(o)
                    )}
                    onCreate={async (name) => { await createRuleBreakDefinition(name); }}
                    placeholder="Search or create..."
                    creatable
                  />
                  <button
                    type="button"
                    onClick={() => { if (newBreakInput.trim()) { addNewBreak(newBreakInput.trim()); } }}
                    disabled={!newBreakInput.trim()}
                    className="mt-2 h-8 w-full rounded-md border border-[var(--line)] text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--panel-soft)] disabled:opacity-40"
                  >
                    + Add &quot;{newBreakInput || "…"}&quot;
                  </button>
                </div>
              </div>

              {/* Linked opportunity (read-only) */}
              {trade.opportunity && (
                <div className="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] p-3 text-[13px]">
                  <p className="text-[12px] font-medium text-[var(--muted)]">Linked Opportunity</p>
                  <p className="mt-1 font-semibold text-[var(--ink)]">
                    {trade.opportunity.ticker} — {trade.opportunity.setupName}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] px-6 py-4">
          <button onClick={onClose} className="h-9 rounded-md border border-[var(--line)] px-4 text-[12px] font-semibold">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={pending}
            className="h-9 rounded-md bg-[var(--teal)] px-6 text-[12px] font-semibold text-white hover:bg-[var(--teal-dark)] disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Trade Detail (right panel) ────────────────────────────────────────────────

function TradeDetail({ trade, onEdit }: { trade: SerializedTrade; onEdit: () => void }) {
  const [pending, startTransition] = useTransition();
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
          <SectionTitle>{trade.ticker} — Trade Detail</SectionTitle>
          <div className="flex gap-3">
            <button onClick={onEdit} className="text-[12px] font-medium text-[var(--teal-dark)] hover:underline">
              Edit
            </button>
            <button onClick={handleDelete} disabled={pending} className="text-[12px] text-[var(--red)] hover:underline">
              Delete
            </button>
          </div>
        </div>
        <div className="mt-3 space-y-2 text-[13px]">
          <div className="flex justify-between"><span className="text-[var(--muted)]">Direction</span><span className={cn("font-semibold", trade.direction === "LONG" ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>{trade.direction}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Entry</span><span className="font-medium">{Number(trade.entryPrice).toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Exit</span><span className="font-medium">{trade.exitPrice ? Number(trade.exitPrice).toFixed(2) : "Open"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Size</span><span className="font-medium">{trade.quantity ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">R Multiple</span><span className={cn("font-semibold", Number(trade.rMultiple) >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>{Number(trade.rMultiple).toFixed(2)}R</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">P&L</span><span className="font-semibold">{formatCurrency(Number(trade.pnl))}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Fees</span><span>{formatCurrency(Number(trade.fees))}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Session</span><span>{trade.sessionName.replace(/_/g, " ")}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Opened</span><span>{new Date(trade.openedAt).toLocaleString()}</span></div>
          {trade.closedAt && <div className="flex justify-between"><span className="text-[var(--muted)]">Closed</span><span>{new Date(trade.closedAt).toLocaleString()}</span></div>}
        </div>
        {trade.notes && <p className="mt-3 rounded-md bg-[var(--panel-soft)] p-3 text-[12px] text-[var(--ink)]">{trade.notes}</p>}
        {trade.ruleBreaks.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 text-[12px] font-semibold text-[var(--red)]">Rule Breaks</div>
            {trade.ruleBreaks.map((rb) => (
              <div key={rb.id} className="mb-1 rounded border border-[var(--red)]/30 bg-[var(--red)]/8 px-3 py-1.5 text-[12px]">
                {rb.rule}
              </div>
            ))}
          </div>
        )}
        {trade.opportunity && (
          <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--panel-soft)] p-2 text-[12px]">
            <span className="text-[var(--muted)]">Linked: </span>
            <span className="font-semibold">{trade.opportunity.ticker} — {trade.opportunity.setupName}</span>
          </div>
        )}
      </Surface>

      <Surface>
        <SectionTitle>Trade Review</SectionTitle>
        <div className="mt-3 space-y-3">
          <label>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--muted)]">Score</span>
              <span className="text-[13px] font-semibold text-[var(--teal-dark)]">{score}/10</span>
            </div>
            <input type="range" min={1} max={10} value={score} onChange={(e) => setScore(Number(e.target.value))} className="mt-1 w-full accent-[var(--teal)]" />
          </label>
          <label>
            <span className="text-[12px] text-[var(--muted)]">Lesson Learned</span>
            <textarea value={lesson} onChange={(e) => setLesson(e.target.value)}
              className="mt-1 min-h-16 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
              placeholder="What did you learn?" />
          </label>
          <label>
            <span className="text-[12px] text-[var(--muted)]">Action Item</span>
            <input value={actionItem} onChange={(e) => setActionItem(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
              placeholder="What will you do differently?" />
          </label>
          <button onClick={saveReview} disabled={pending || !lesson}
            className="h-9 w-full rounded-md bg-[var(--teal)] text-[12px] font-semibold text-white hover:bg-[var(--teal-dark)] disabled:opacity-50">
            {pending ? "Saving..." : trade.review ? "Update Review" : "Save Review"}
          </button>
        </div>
      </Surface>
    </div>
  );
}

// ── Shared field helpers ──────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label>
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]">
        {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
      </select>
    </label>
  );
}

function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]" />
    </label>
  );
}
