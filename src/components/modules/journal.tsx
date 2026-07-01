"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Columns3,
  Search,
} from "lucide-react";
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
import { usePopover } from "@/lib/use-popover";
import { cn, formatCurrency } from "@/lib/utils";
import { createTrade, updateTrade, deleteTrade, ensureTradeContextTags, toggleTradeContextTag } from "@/app/actions/trades";
import { createReview, updateReview } from "@/app/actions/reviews";
import { createRuleBreakDefinition } from "@/app/actions/vocab";

type SerializedRuleBreak = { id: string; rule: string; severity: number; description: string | null };
type SerializedContextTag = { id: string; name: string; enabled: boolean; weight: number };

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
  contextTags: SerializedContextTag[];
  review: { id: string; score: number; lesson: string; actionItem: string | null } | null;
  opportunity: { id: string; ticker: string; setupName: string } | null;
};

type JournalFilter = "All" | "Wins" | "Losses" | "Rule Breaks" | "Open";

// ── Column configuration ──────────────────────────────────────────────────────

type ColumnKey =
  | "date" | "ticker" | "direction" | "session" | "entry" | "exit"
  | "size" | "r" | "pnl" | "fees" | "status" | "rules" | "context";

const ALL_COLUMNS: { key: ColumnKey; label: string; sortable: boolean }[] = [
  { key: "date", label: "Date", sortable: true },
  { key: "ticker", label: "Ticker", sortable: true },
  { key: "direction", label: "Dir", sortable: false },
  { key: "session", label: "Session", sortable: false },
  { key: "entry", label: "Entry", sortable: true },
  { key: "exit", label: "Exit", sortable: true },
  { key: "size", label: "Size", sortable: true },
  { key: "r", label: "R", sortable: true },
  { key: "pnl", label: "P&L", sortable: true },
  { key: "fees", label: "Fees", sortable: true },
  { key: "status", label: "Status", sortable: false },
  { key: "rules", label: "Rules", sortable: false },
  { key: "context", label: "Context", sortable: false },
];

const DEFAULT_VISIBLE: ColumnKey[] = ["date", "ticker", "direction", "entry", "exit", "size", "r", "pnl", "status", "rules", "context"];
const COLUMNS_STORAGE_KEY = "trade-os-journal-columns";

function sortValue(t: SerializedTrade, key: ColumnKey): number | string {
  switch (key) {
    case "date": return new Date(t.openedAt).getTime();
    case "ticker": return t.ticker;
    case "entry": return Number(t.entryPrice);
    case "exit": return t.exitPrice ? Number(t.exitPrice) : -Infinity;
    case "size": return t.quantity ? Number(t.quantity) : 0;
    case "r": return Number(t.rMultiple);
    case "pnl": return Number(t.pnl);
    case "fees": return Number(t.fees);
    default: return 0;
  }
}

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
  const [search, setSearch] = useState("");
  const [tickerFilter, setTickerFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<ColumnKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(DEFAULT_VISIBLE);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [viewingTrade, setViewingTrade] = useState<SerializedTrade | null>(null);

  const columnsRef = useRef<HTMLDivElement>(null);
  usePopover(columnsRef, showColumnsMenu, () => setShowColumnsMenu(false));

  useEffect(() => {
    const stored = window.localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as ColumnKey[];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleColumns(parsed);
    } catch {
      window.localStorage.removeItem(COLUMNS_STORAGE_KEY);
    }
  }, []);

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      const safe = next.length === 0 ? prev : next;
      window.localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(safe));
      return safe;
    });
  }

  const tickers = useMemo(() => Array.from(new Set(trades.map((t) => t.ticker))).sort(), [trades]);

  const filtered = useMemo(() => {
    let rows = trades.filter((t) => {
      if (filter === "Wins" && Number(t.rMultiple) <= 0) return false;
      if (filter === "Losses" && Number(t.rMultiple) >= 0) return false;
      if (filter === "Rule Breaks" && t.ruleBreaks.length === 0) return false;
      if (filter === "Open" && t.status !== "OPEN") return false;
      if (tickerFilter !== "All" && t.ticker !== tickerFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${t.ticker} ${t.notes ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    rows = rows.slice().sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [trades, filter, tickerFilter, search, sortKey, sortDir]);

  function handleSort(key: ColumnKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

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

      {viewingTrade && (
        <TradeModal
          trade={viewingTrade}
          tickerOptions={tickerOptions}
          ruleBreakOptions={ruleBreakOptions}
          onClose={() => setViewingTrade(null)}
        />
      )}

      <Surface>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>Trades</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={filter}
              options={["All", "Wins", "Losses", "Rule Breaks", "Open"]}
              onChange={(v) => setFilter(v as JournalFilter)}
            />
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticker or notes..."
              className="h-8 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] pl-8 pr-3 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
            />
          </div>
          <select
            value={tickerFilter}
            onChange={(e) => setTickerFilter(e.target.value)}
            className="h-8 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
          >
            <option value="All">All Tickers</option>
            {tickers.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div ref={columnsRef} className="relative">
            <button
              onClick={() => setShowColumnsMenu((v) => !v)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] px-3 text-[12px] font-medium hover:bg-[var(--panel-soft)]"
            >
              <Columns3 className="h-3.5 w-3.5" />
              Columns
            </button>
            {showColumnsMenu && (
              <div className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-[var(--line)] bg-[var(--panel)] p-2 shadow-soft">
                {ALL_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 rounded px-2 py-1.5 text-[12px] hover:bg-[var(--panel-soft)]">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="accent-[var(--teal)]"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
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
                  {ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key)).map((col) => (
                    <th key={col.key} className="h-9 px-2 font-semibold">
                      {col.sortable ? (
                        <button
                          onClick={() => handleSort(col.key)}
                          className="flex items-center gap-1 hover:text-[var(--ink)]"
                        >
                          {col.label}
                          {sortKey === col.key && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </button>
                      ) : col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setViewingTrade(t)}
                    className="cursor-pointer border-b border-[var(--line)] hover:bg-[var(--panel-soft)]"
                  >
                    {visibleColumns.includes("date") && <td className="h-10 px-2">{new Date(t.openedAt).toLocaleDateString()}</td>}
                    {visibleColumns.includes("ticker") && <td className="px-2 font-semibold">{t.ticker}</td>}
                    {visibleColumns.includes("direction") && (
                      <td className="px-2">
                        <span className={cn("font-medium", t.direction === "LONG" ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                          {t.direction}
                        </span>
                      </td>
                    )}
                    {visibleColumns.includes("session") && <td className="px-2">{t.sessionName.replace(/_/g, " ")}</td>}
                    {visibleColumns.includes("entry") && <td className="px-2">{Number(t.entryPrice).toFixed(2)}</td>}
                    {visibleColumns.includes("exit") && <td className="px-2">{t.exitPrice ? Number(t.exitPrice).toFixed(2) : "—"}</td>}
                    {visibleColumns.includes("size") && <td className="px-2">{t.quantity ?? "—"}</td>}
                    {visibleColumns.includes("r") && (
                      <td className={cn("px-2 font-semibold", Number(t.rMultiple) >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                        {Number(t.rMultiple).toFixed(1)}R
                      </td>
                    )}
                    {visibleColumns.includes("pnl") && <td className="px-2">{formatCurrency(Number(t.pnl))}</td>}
                    {visibleColumns.includes("fees") && <td className="px-2">{formatCurrency(Number(t.fees))}</td>}
                    {visibleColumns.includes("status") && <td className="px-2"><StatusPill status={t.status} /></td>}
                    {visibleColumns.includes("rules") && (
                      <td className="px-2">{t.ruleBreaks.length > 0 ? <StatusPill status="SKIPPED" label={String(t.ruleBreaks.length)} /> : "—"}</td>
                    )}
                    {visibleColumns.includes("context") && (
                      <td className="px-2">
                        {t.contextTags.filter((c) => c.enabled).length > 0
                          ? <StatusPill status="TAKEN" label={String(t.contextTags.filter((c) => c.enabled).length)} />
                          : "—"}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
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
        <Combobox label="Ticker" value={ticker} onChange={setTicker} options={tickerOptions} required placeholder="EURUSD" />
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

// ── Trade Modal (view + edit + context + review) ─────────────────────────────

type ModalTab = "overview" | "data" | "context" | "review";

function TradeModal({
  trade,
  tickerOptions,
  ruleBreakOptions,
  onClose,
}: {
  trade: SerializedTrade;
  tickerOptions: string[];
  ruleBreakOptions: string[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<ModalTab>("overview");

  // Data tab state
  const [ticker, setTicker] = useState(trade.ticker);
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
  const [contextTags, setContextTags] = useState<SerializedContextTag[]>(trade.contextTags);
  const [contextLoaded, setContextLoaded] = useState(trade.contextTags.length > 0);
  const [contextPending, startContextTransition] = useTransition();

  // Review tab state
  const [lesson, setLesson] = useState(trade.review?.lesson ?? "");
  const [score, setScore] = useState(trade.review?.score ?? 5);
  const [actionItem, setActionItem] = useState(trade.review?.actionItem ?? "");
  const [reviewPending, startReviewTransition] = useTransition();

  useEffect(() => {
    if (tab !== "context" || contextLoaded) return;
    let cancelled = false;
    ensureTradeContextTags(trade.id).then((tags) => {
      if (!cancelled) {
        setContextTags(tags as SerializedContextTag[]);
        setContextLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [tab, contextLoaded, trade.id]);

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

  function handleToggleContextTag(tagId: string) {
    startContextTransition(async () => {
      await toggleTradeContextTag(trade.id, tagId);
      setContextTags((prev) => prev.map((t) => (t.id === tagId ? { ...t, enabled: !t.enabled } : t)));
    });
  }

  function handleSave() {
    startTransition(async () => {
      await updateTrade(trade.id, {
        ticker, direction, sessionName: session, status,
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

  function handleDelete() {
    if (!confirm("Delete this trade? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteTrade(trade.id);
      toast.success("Trade deleted");
      onClose();
    });
  }

  function saveReview() {
    startReviewTransition(async () => {
      if (trade.review) {
        await updateReview(trade.review.id, { score, lesson, actionItem: actionItem || undefined });
      } else {
        await createReview({ score, lesson, actionItem: actionItem || undefined, tradeId: trade.id });
      }
      toast.success("Review saved");
    });
  }

  const tabs: { id: ModalTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "data", label: "Trade Data" },
    { id: "context", label: `Context (${contextTags.filter((c) => c.enabled).length})` },
    { id: "review", label: "Review" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" aria-modal>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-[680px] max-w-full flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-bold text-[var(--ink)]">
              {trade.ticker} <span className={cn("ml-1 text-[13px] font-semibold", trade.direction === "LONG" ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>{trade.direction}</span>
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--muted)]">
              {new Date(trade.openedAt).toLocaleString()} · {formatCurrency(Number(trade.pnl))} · {Number(trade.rMultiple).toFixed(2)}R
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-[var(--line)] px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 px-3 py-2.5 text-[13px] font-medium transition-colors",
                tab === t.id
                  ? "border-b-2 border-[var(--teal)] text-[var(--teal-dark)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
                <div className="flex justify-between"><span className="text-[var(--muted)]">Entry</span><span className="font-medium">{Number(trade.entryPrice).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Exit</span><span className="font-medium">{trade.exitPrice ? Number(trade.exitPrice).toFixed(2) : "Open"}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Size</span><span className="font-medium">{trade.quantity ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Fees</span><span>{formatCurrency(Number(trade.fees))}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Session</span><span>{trade.sessionName.replace(/_/g, " ")}</span></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Status</span><StatusPill status={trade.status} /></div>
                <div className="flex justify-between"><span className="text-[var(--muted)]">Opened</span><span>{new Date(trade.openedAt).toLocaleString()}</span></div>
                {trade.closedAt && <div className="flex justify-between"><span className="text-[var(--muted)]">Closed</span><span>{new Date(trade.closedAt).toLocaleString()}</span></div>}
              </div>

              {trade.notes && <p className="rounded-md bg-[var(--panel-soft)] p-3 text-[12px] text-[var(--ink)]">{trade.notes}</p>}

              {trade.ruleBreaks.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-[var(--red)]">Rule Breaks</div>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.ruleBreaks.map((rb) => (
                      <span key={rb.id} className="rounded border border-[var(--red)]/30 bg-[var(--red)]/8 px-2 py-1 text-[12px]">{rb.rule}</span>
                    ))}
                  </div>
                </div>
              )}

              {trade.contextTags.filter((c) => c.enabled).length > 0 && (
                <div>
                  <div className="mb-1.5 text-[12px] font-semibold text-[var(--teal-dark)]">Active Context</div>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.contextTags.filter((c) => c.enabled).map((c) => (
                      <span key={c.id} className="rounded border border-[var(--teal)]/30 bg-[var(--teal)]/8 px-2 py-1 text-[12px]">{c.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {trade.opportunity && (
                <div className="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] p-3 text-[13px]">
                  <p className="text-[12px] font-medium text-[var(--muted)]">Linked Opportunity</p>
                  <p className="mt-1 font-semibold text-[var(--ink)]">{trade.opportunity.ticker} — {trade.opportunity.setupName}</p>
                </div>
              )}

              <button onClick={handleDelete} disabled={pending} className="text-[12px] text-[var(--red)] hover:underline">
                Delete trade
              </button>
            </div>
          )}

          {tab === "data" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Combobox label="Ticker" value={ticker} onChange={setTicker} options={tickerOptions} required />
              </div>
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
              <label>
                <span className="text-[12px] font-medium text-[var(--muted)]">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 min-h-24 w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] p-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                  placeholder="Setup rationale, what you saw, what happened..."
                />
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[12px] font-medium text-[var(--muted)]">Context Signals</p>
                  <span className="text-[12px] font-semibold text-[var(--teal-dark)]">
                    {contextTags.filter((c) => c.enabled).length}/{contextTags.length} active
                  </span>
                </div>
                {!contextLoaded ? (
                  <p className="text-[12px] text-[var(--muted)]">Loading…</p>
                ) : contextTags.length === 0 ? (
                  <p className="text-[12px] text-[var(--muted)]">No context tags configured. Add some in Settings → Vocabulary.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {contextTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleToggleContextTag(tag.id)}
                        disabled={contextPending}
                        className={cn(
                          "rounded-md border p-2.5 text-left text-[12px] transition",
                          tag.enabled ? "border-[var(--teal)]/50 bg-[var(--panel-soft)]" : "border-[var(--line)] hover:bg-[var(--panel-soft)]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium leading-tight">{tag.name}</span>
                          <span className={cn(
                            "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                            tag.enabled ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--line)]"
                          )}>
                            {tag.enabled && <span className="text-[10px]">✓</span>}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

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

                <div className="mt-3">
                  <Combobox
                    label="Add Rule Break"
                    value={newBreakInput}
                    onChange={setNewBreakInput}
                    options={ruleBreakOptions.filter((o) => !existingBreaks.some((rb) => rb.rule === o) && !newBreaks.includes(o))}
                    onCreate={async (name) => { await createRuleBreakDefinition(name); }}
                    placeholder="Search or create..."
                  />
                  <button
                    type="button"
                    onClick={() => { if (newBreakInput.trim()) addNewBreak(newBreakInput.trim()); }}
                    disabled={!newBreakInput.trim()}
                    className="mt-2 h-8 w-full rounded-md border border-[var(--line)] text-[12px] font-medium text-[var(--ink)] hover:bg-[var(--panel-soft)] disabled:opacity-40"
                  >
                    + Add &quot;{newBreakInput || "…"}&quot;
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "review" && (
            <div className="space-y-3">
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
                  className="mt-1 min-h-24 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] p-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                  placeholder="What did you learn?" />
              </label>
              <label>
                <span className="text-[12px] text-[var(--muted)]">Action Item</span>
                <input value={actionItem} onChange={(e) => setActionItem(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
                  placeholder="What will you do differently?" />
              </label>
              <button onClick={saveReview} disabled={reviewPending || !lesson}
                className="h-9 w-full rounded-md bg-[var(--teal)] text-[12px] font-semibold text-white hover:bg-[var(--teal-dark)] disabled:opacity-50">
                {reviewPending ? "Saving..." : trade.review ? "Update Review" : "Save Review"}
              </button>
            </div>
          )}
        </div>

        {/* Footer — only for Data/Context tabs, Overview and Review manage their own actions */}
        {(tab === "data" || tab === "context") && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] px-6 py-4">
            <button onClick={onClose} className="h-9 rounded-md border border-[var(--line)] px-4 text-[12px] font-semibold">Cancel</button>
            <button onClick={handleSave} disabled={pending}
              className="h-9 rounded-md bg-[var(--teal)] px-6 text-[12px] font-semibold text-white hover:bg-[var(--teal-dark)] disabled:opacity-50">
              {pending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
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
