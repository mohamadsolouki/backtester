"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Upload, Check, AlertTriangle } from "lucide-react";
import { Surface, SectionTitle, ModuleShell } from "@/components/ui";
import { cn, formatCurrency } from "@/lib/utils";
import { parseMetaTraderFile, parseMT5ExcelRows, type ParseResult } from "@/lib/metatrader";
import { bulkCreateTrades } from "@/app/actions/trades";

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
  const [importing, startImport] = useTransition();
  const [fileName, setFileName] = useState("");

  function applyParseResult(parsed: ParseResult) {
    setResult(parsed);
    setSelected(new Set(parsed.trades.map((_, i) => i)));
    if (parsed.trades.length > 0) {
      toast.success(`Parsed ${parsed.trades.length} trades (${parsed.format})`);
    } else {
      toast.error(parsed.errors[0] ?? "No trades found in file");
    }
  }

  function handleFile(file: File) {
    setFileName(file.name);
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
        applyParseResult(parseMT5ExcelRows(rows));
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      applyParseResult(parseMetaTraderFile(content));
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
        rMultiple: t.profit > 0 ? Math.abs(t.profit / Math.max(Math.abs(t.entryPrice - (t.stopLoss ?? t.entryPrice)), 1)) : t.profit < 0 ? -Math.abs(t.profit / Math.max(Math.abs(t.entryPrice - (t.stopLoss ?? t.entryPrice)), 1)) : 0,
        pnl: t.profit,
        fees: Math.abs(t.commission) + Math.abs(t.swap),
        openedAt: t.openedAt,
        closedAt: t.closedAt ?? undefined,
        status: t.closedAt ? "CLOSED" as const : "OPEN" as const,
        notes: t.comment || `Imported from ${fileName} (ticket: ${t.ticket})`,
      }));

    startImport(async () => {
      const { trades: created } = await bulkCreateTrades(trades);
      toast.success(`Imported ${created.length} trades`);
      setResult(null);
      setSelected(new Set());
    });
  }

  return (
    <ModuleShell
      title="Import Trades"
      description="Import trade history from MetaTrader (MT4/MT5), CSV, or XLSX files."
    >
      <Surface>
        <SectionTitle>Upload File</SectionTitle>
        <div className="mt-3">
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-[var(--line)] p-6 text-center hover:border-[var(--teal)] hover:bg-[var(--panel-soft)]">
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

      {result && result.trades.length > 0 && (
        <Surface>
          <div className="flex items-center justify-between">
            <div>
              <SectionTitle>Preview — {fileName}</SectionTitle>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                {result.trades.length} trades found ({result.format}) · {selected.size} selected
                {result.errors.length > 0 && ` · ${result.errors.length} errors`}
              </p>
            </div>
            <div className="flex gap-2">
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
                {result.errors.length > 5 && <div>...and {result.errors.length - 5} more</div>}
              </div>
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
                </tr>
              </thead>
              <tbody>
                {result.trades.map((t, i) => (
                  <tr
                    key={i}
                    onClick={() => toggleTrade(i)}
                    className={cn(
                      "cursor-pointer border-b border-[var(--line)] hover:bg-[var(--panel-soft)]",
                      selected.has(i) && "bg-[var(--panel-soft)]"
                    )}
                  >
                    <td className="px-2">
                      <span className={cn(
                        "flex h-4 w-4 items-center justify-center rounded border",
                        selected.has(i) ? "border-[var(--teal)] bg-[var(--teal)] text-white" : "border-[var(--line)]"
                      )}>
                        {selected.has(i) && <Check className="h-3 w-3" />}
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
                  </tr>
                ))}
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
                  {["Date", "File", "Type", "Rows", "Valid", "Errors"].map((h) => (
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
                    <td className="px-2">{b.errorRows > 0 ? <span className="text-[var(--red)]">{b.errorRows}</span> : "0"}</td>
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
