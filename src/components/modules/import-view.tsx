"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Upload, Check, AlertTriangle } from "lucide-react";
import { Surface, SectionTitle, ModuleShell } from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import { parseMetaTraderFile, parseMT5ExcelRows, type ParseResult } from "@/lib/metatrader";
import { bulkCreateTrades, checkImportDuplicates } from "@/app/actions/trades";

type SerializedBatch = {
  id: string;
  fileName: string;
  fileType: string;
  rowCount: number;
  validRows: number;
  errorRows: number;
  createdAt: string;
};

function mapSessionName(date: Date): "PRE_MARKET" | "OPEN" | "MIDDAY" | "CLOSE" | "POST_MARKET" {
  const hour = date.getHours();
  if (hour < 9) return "PRE_MARKET";
  if (hour < 11) return "OPEN";
  if (hour < 14) return "MIDDAY";
  if (hour < 16) return "CLOSE";
  return "POST_MARKET";
}

export function ImportView({ batches }: { batches: SerializedBatch[] }) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [duplicates, setDuplicates] = useState<Set<number>>(new Set());
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [importing, startImport] = useTransition();
  const [fileName, setFileName] = useState("");

  async function applyParseResult(parsed: ParseResult, name: string) {
    setResult(parsed);
    setFileName(name);

    if (parsed.trades.length === 0) {
      toast.error(parsed.errors[0] ?? "No trades found in file");
      setSelected(new Set());
      setDuplicates(new Set());
      return;
    }

    // Check duplicates against existing trades before showing preview
    setCheckingDupes(true);
    try {
      const dupeFlags = await checkImportDuplicates(
        parsed.trades.map((t) => ({
          ticker: t.symbol,
          direction: t.direction,
          openedAt: t.openedAt.toISOString(),
          entryPrice: t.entryPrice,
        }))
      );
      const dupeSet = new Set<number>(dupeFlags.map((d, i) => (d ? i : -1)).filter((i) => i >= 0));
      setDuplicates(dupeSet);
      // Auto-select only non-duplicates
      setSelected(new Set(parsed.trades.map((_, i) => i).filter((i) => !dupeSet.has(i))));
      const newCount = parsed.trades.length - dupeSet.size;
      toast.success(`Found ${parsed.trades.length} trades: ${newCount} new, ${dupeSet.size} already imported`);
    } catch {
      setSelected(new Set(parsed.trades.map((_, i) => i)));
      toast.success(`Parsed ${parsed.trades.length} trades`);
    } finally {
      setCheckingDupes(false);
    }
  }

  function handleFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "xlsx" || extension === "xls") {
      file.arrayBuffer().then((buffer) => {
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(sheet, {
          header: 1,
          raw: true,
          defval: "",
        });
        applyParseResult(parseMT5ExcelRows(rows), file.name);
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      applyParseResult(parseMetaTraderFile(content), file.name);
    };
    reader.readAsText(file);
  }

  function toggleTrade(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    if (!result) return;
    if (selected.size === result.trades.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(result.trades.map((_, i) => i)));
    }
  }

  function selectNewOnly() {
    if (!result) return;
    setSelected(new Set(result.trades.map((_, i) => i).filter((i) => !duplicates.has(i))));
  }

  function importSelected() {
    if (!result) return;
    const trades = result.trades
      .filter((_, i) => selected.has(i))
      .map((t) => ({
        ticker: t.symbol,
        direction: t.direction,
        sessionName: mapSessionName(t.openedAt),
        quantity: t.volume,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice || undefined,
        rMultiple: t.profit > 0
          ? Math.abs(t.profit / Math.max(Math.abs(t.entryPrice - (t.stopLoss ?? t.entryPrice)), 1))
          : t.profit < 0
          ? -Math.abs(t.profit / Math.max(Math.abs(t.entryPrice - (t.stopLoss ?? t.entryPrice)), 1))
          : 0,
        pnl: t.profit,
        fees: Math.abs(t.commission) + Math.abs(t.swap),
        openedAt: t.openedAt,
        closedAt: t.closedAt ?? undefined,
        status: t.closedAt ? ("CLOSED" as const) : ("OPEN" as const),
        notes: t.comment || `Imported from ${fileName} (ticket: ${t.ticket})`,
      }));

    startImport(async () => {
      const { trades: created, skipped } = await bulkCreateTrades(trades, fileName);
      const msg = skipped > 0
        ? `Imported ${created.length} trades, skipped ${skipped} duplicates`
        : `Imported ${created.length} trades`;
      toast.success(msg);
      setResult(null);
      setSelected(new Set());
      setDuplicates(new Set());
    });
  }

  const newCount = result ? result.trades.filter((_, i) => !duplicates.has(i)).length : 0;
  const dupeCount = duplicates.size;

  return (
    <ModuleShell
      title="Import Trades"
      eyebrow="System"
      description="Import trade history from MetaTrader (MT4/MT5), CSV, or XLSX files."
    >
      <Surface>
        <SectionTitle>Upload File</SectionTitle>
        <div className="mt-3">
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--line)] p-6 text-center transition-all hover:border-[var(--teal)] hover:bg-[var(--teal-soft)]">
            <Upload className="h-8 w-8 text-[var(--teal)]" />
            <div className="mt-2 text-[14px] font-semibold">Drop file or click to browse</div>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              Supports MT5 &quot;Trade History Report&quot; Excel exports, MT4 HTML statements, MT5 XML exports, and CSV files
            </p>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.html,.htm,.xml,.csv,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </Surface>

      {checkingDupes && (
        <Surface>
          <div className="flex items-center gap-3 py-4 text-[13px] text-[var(--muted)]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--teal)] border-t-transparent" />
            Checking for duplicates against your existing trades…
          </div>
        </Surface>
      )}

      {result && result.trades.length > 0 && !checkingDupes && (
        <Surface>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionTitle>Preview — {fileName}</SectionTitle>
              <div className="mt-1 flex flex-wrap gap-3 text-[12px] text-[var(--muted)]">
                <span>{result.trades.length} total</span>
                {dupeCount > 0 && (
                  <span className="font-medium text-[var(--amber)]">
                    {dupeCount} already imported
                  </span>
                )}
                <span className="font-medium text-[var(--teal-dark)]">{newCount} new</span>
                <span>{selected.size} selected</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {dupeCount > 0 && (
                <button onClick={selectNewOnly} className="h-8 rounded-md border border-[var(--line)] px-3 text-[12px] font-medium hover:bg-[var(--panel-soft)]">
                  New Only
                </button>
              )}
              <button onClick={toggleAll} className="h-8 rounded-md border border-[var(--line)] px-3 text-[12px] font-medium hover:bg-[var(--panel-soft)]">
                {selected.size === result.trades.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={importSelected}
                disabled={importing || selected.size === 0}
                className="h-8 rounded-md bg-[var(--teal)] px-4 text-[12px] font-semibold text-white hover:bg-[var(--teal-dark)] disabled:opacity-50"
              >
                {importing ? "Importing..." : `Import ${selected.size} Trades`}
              </button>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-3 rounded-md border border-[var(--amber)]/30 bg-[var(--amber)]/10 p-3">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--amber)]">
                <AlertTriangle className="h-4 w-4" /> Parse Warnings
              </div>
              <div className="mt-2 space-y-1 text-[12px] text-[var(--amber)]">
                {result.errors.slice(0, 5).map((err, i) => <div key={i}>{err}</div>)}
                {result.errors.length > 5 && <div>…and {result.errors.length - 5} more</div>}
              </div>
            </div>
          )}

          {dupeCount > 0 && (
            <div className="mt-3 rounded-md border border-[var(--amber)]/30 bg-[var(--amber)]/8 p-3 text-[12px] text-[var(--amber)]">
              <span className="font-semibold">Duplicate rows are highlighted in amber</span> — they match trades already in your journal.
              They are auto-deselected but you can re-check them to force re-import.
            </div>
          )}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-[12px]">
              <thead className="border-y border-[var(--line)] text-[var(--muted)]">
                <tr>
                  <th className="h-9 w-8 px-2"></th>
                  {["Ticket", "Symbol", "Dir", "Volume", "Entry", "Exit", "P&L", "Commission", "Opened", "Closed"].map((h) => (
                    <th key={h} className="h-9 px-2 font-semibold">{h}</th>
                  ))}
                  <th className="h-9 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {result.trades.map((t, i) => {
                  const isDupe = duplicates.has(i);
                  const isSel = selected.has(i);
                  return (
                    <tr
                      key={i}
                      onClick={() => toggleTrade(i)}
                      className={cn(
                        "cursor-pointer border-b border-[var(--line)] hover:bg-[var(--panel-soft)]",
                        isSel && !isDupe && "bg-[var(--panel-soft)]",
                        isDupe && "bg-[var(--amber)]/5"
                      )}
                    >
                      <td className="px-2">
                        <span className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          isSel ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--line)]"
                        )}>
                          {isSel && <Check className="h-3 w-3" />}
                        </span>
                      </td>
                      <td className="h-10 px-2">{t.ticket}</td>
                      <td className="px-2 font-semibold">{t.symbol}</td>
                      <td className="px-2">
                        <span className={cn("font-medium", t.direction === "LONG" ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="px-2">{t.volume}</td>
                      <td className="px-2">{t.entryPrice.toFixed(5)}</td>
                      <td className="px-2">{t.exitPrice.toFixed(5)}</td>
                      <td className={cn("px-2 font-semibold", t.profit >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                        {formatCurrency(t.profit)}
                      </td>
                      <td className="px-2">{formatCurrency(t.commission)}</td>
                      <td className="px-2">{t.openedAt.toLocaleString()}</td>
                      <td className="px-2">{t.closedAt?.toLocaleString() ?? "Open"}</td>
                      <td className="px-2">
                        {isDupe && (
                          <span className="rounded-full bg-[var(--amber)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--amber)]">
                            duplicate
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Surface>
      )}

      {batches.length > 0 && (
        <Surface>
          <SectionTitle>Import History</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="border-y border-[var(--line)] text-[var(--muted)]">
                <tr>
                  {["Date", "File", "Type", "Rows", "Imported", "Skipped"].map((h) => (
                    <th key={h} className="h-9 px-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--line)]">
                    <td className="h-10 px-2">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td className="px-2 font-medium">{b.fileName}</td>
                    <td className="px-2">{b.fileType}</td>
                    <td className="px-2">{b.rowCount}</td>
                    <td className="px-2 text-[var(--teal-dark)]">{b.validRows}</td>
                    <td className="px-2">{b.errorRows > 0 ? <span className="text-[var(--amber)]">{b.errorRows}</span> : "0"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      )}
    </ModuleShell>
  );
}
