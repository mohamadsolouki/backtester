"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Surface, SectionTitle, ModuleShell, Kpi, Segmented, ActionButton, EmptyState } from "@/components/ui";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { Download, Save, Trash2 } from "lucide-react";
import { saveReport, deleteReport } from "@/app/actions/reports";
import { useI18n } from "@/components/layout/i18n-provider";

type SerializedTrade = {
  id: string;
  ticker: string;
  direction: string;
  sessionName: string;
  status: string;
  quantity: string | number | null;
  entryPrice: string | number;
  exitPrice: string | number | null;
  stopPrice: string | number | null;
  takeProfit: string | number | null;
  rMultiple: string | number;
  pnl: string | number;
  fees: string | number;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  ruleBreaks: { id: string; rule: string }[];
  account: { id: string; name: string } | null;
};

type SavedReport = {
  id: string;
  period: string;
  startsAt: string;
  endsAt: string;
  metrics: Record<string, number | string>;
  createdAt: string;
};

type Period = "Daily" | "Weekly" | "Monthly";

function startOfPeriod(period: Period): Date {
  const now = new Date();
  if (period === "Daily") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "Weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReportsView({
  trades,
  savedReports,
}: {
  trades: SerializedTrade[];
  savedReports: SavedReport[];
}) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>("Weekly");
  const [saved, setSaved] = useState(savedReports);
  const [pending, startTransition] = useTransition();

  const { periodTrades, stats } = useMemo(() => {
    const start = startOfPeriod(period);
    const periodTrades = trades.filter((trade) => new Date(trade.openedAt) >= start);
    const rValues = periodTrades.map((trade) => Number(trade.rMultiple));
    const wins = rValues.filter((r) => r > 0);
    const losses = rValues.filter((r) => r < 0);
    const grossProfit = wins.reduce((s, r) => s + r, 0);
    const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0));
    const pnl = periodTrades.reduce((s, trade) => s + Number(trade.pnl), 0);
    const fees = periodTrades.reduce((s, trade) => s + Number(trade.fees), 0);
    const expectancy = periodTrades.length ? rValues.reduce((s, r) => s + r, 0) / periodTrades.length : 0;
    const ruleBreaks = periodTrades.filter((trade) => trade.ruleBreaks.length > 0).length;
    const tickerCounts: Record<string, number> = {};
    periodTrades.forEach((trade) => { tickerCounts[trade.ticker] = (tickerCounts[trade.ticker] ?? 0) + 1; });
    const bestTicker = Object.entries(tickerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

    const byAccount: Record<string, { pnl: number; count: number }> = {};
    periodTrades.forEach((trade) => {
      const key = trade.account?.name ?? t("No account");
      if (!byAccount[key]) byAccount[key] = { pnl: 0, count: 0 };
      byAccount[key].pnl += Number(trade.pnl);
      byAccount[key].count += 1;
    });

    return {
      periodTrades,
      stats: {
        pnl,
        fees,
        expectancy,
        ruleBreaks,
        bestTicker,
        winRate: periodTrades.length ? wins.length / periodTrades.length : 0,
        profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
        accounts: Object.entries(byAccount).map(([name, data]) => ({ name, ...data })),
        start,
      },
    };
  }, [trades, period, t]);

  function exportSummary() {
    downloadCsv(
      [
        ["Period", period],
        ["From", stats.start.toISOString().slice(0, 10)],
        ["Net PnL", stats.pnl.toFixed(2)],
        ["Fees", stats.fees.toFixed(2)],
        ["Win Rate", (stats.winRate * 100).toFixed(1) + "%"],
        ["Profit Factor", Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "inf"],
        ["Expectancy", `${stats.expectancy >= 0 ? "+" : ""}${stats.expectancy.toFixed(2)}R`],
        ["Trades", String(periodTrades.length)],
        ["Rule Breaks", String(stats.ruleBreaks)],
        ["Most Traded", stats.bestTicker],
      ],
      `${period.toLowerCase()}-trading-report.csv`,
    );
  }

  function exportTrades() {
    const header = [
      "Opened", "Closed", "Ticker", "Account", "Direction", "Session", "Status",
      "Qty", "Entry", "Exit", "Stop", "Take Profit", "R", "PnL", "Fees", "Rule Breaks", "Notes",
    ];
    const rows = trades.map((trade) => [
      trade.openedAt,
      trade.closedAt ?? "",
      trade.ticker,
      trade.account?.name ?? "",
      trade.direction,
      trade.sessionName,
      trade.status,
      String(trade.quantity ?? ""),
      String(trade.entryPrice),
      String(trade.exitPrice ?? ""),
      String(trade.stopPrice ?? ""),
      String(trade.takeProfit ?? ""),
      String(trade.rMultiple),
      String(trade.pnl),
      String(trade.fees),
      trade.ruleBreaks.map((rb) => rb.rule).join("; "),
      trade.notes ?? "",
    ]);
    downloadCsv([header, ...rows], "trades-export.csv");
    toast.success(`${trades.length} ${t("Trades")} — ${t("exported")}`);
  }

  function handleSaveReport() {
    startTransition(async () => {
      const { id } = await saveReport({
        period: period.toUpperCase() as "DAILY" | "WEEKLY" | "MONTHLY",
        startsAt: stats.start,
        endsAt: new Date(),
        metrics: {
          trades: periodTrades.length,
          pnl: Math.round(stats.pnl * 100) / 100,
          fees: Math.round(stats.fees * 100) / 100,
          winRate: Math.round(stats.winRate * 1000) / 1000,
          profitFactor: Number.isFinite(stats.profitFactor) ? Math.round(stats.profitFactor * 100) / 100 : 999,
          expectancy: Math.round(stats.expectancy * 100) / 100,
          ruleBreaks: stats.ruleBreaks,
          mostTraded: stats.bestTicker,
        },
      });
      setSaved((prev) => [
        {
          id,
          period: period.toUpperCase(),
          startsAt: stats.start.toISOString(),
          endsAt: new Date().toISOString(),
          metrics: {
            trades: periodTrades.length,
            pnl: Math.round(stats.pnl * 100) / 100,
            winRate: Math.round(stats.winRate * 1000) / 1000,
            expectancy: Math.round(stats.expectancy * 100) / 100,
          },
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      toast.success(t("Report snapshot saved"));
    });
  }

  function handleDeleteReport(id: string) {
    startTransition(async () => {
      await deleteReport(id);
      setSaved((prev) => prev.filter((r) => r.id !== id));
    });
  }

  return (
    <ModuleShell
      title={t("Reports")}
      eyebrow={t("Analyze")}
      description={t("Daily, weekly, and monthly performance summaries from your actual trade data.")}
      actions={
        <>
          <ActionButton icon={Download} onClick={exportTrades}>{t("Export Trades CSV")}</ActionButton>
          <ActionButton icon={Download} onClick={exportSummary}>{t("Export Report")}</ActionButton>
        </>
      }
    >
      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>{t(period)} {t("Report")}</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={period} options={["Daily", "Weekly", "Monthly"]} onChange={(v) => setPeriod(v as Period)} />
            <button
              onClick={handleSaveReport}
              disabled={pending || periodTrades.length === 0}
              className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] px-3 text-[12px] font-semibold hover:bg-[var(--panel-soft)] disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" /> {t("Save snapshot")}
            </button>
          </div>
        </div>

        {periodTrades.length === 0 ? (
          <EmptyState title={t("No trades in this period")} description={t("Trades you log or import will appear here once they fall within the selected period.")} />
        ) : (
          <>
            <div className="stagger mt-4 grid grid-cols-6 gap-2 max-[1100px]:grid-cols-3 max-[560px]:grid-cols-2">
              <Kpi label={t("Net PnL")} value={formatCurrency(stats.pnl)} accent={stats.pnl >= 0 ? "up" : "down"} />
              <Kpi label={t("Win Rate")} value={formatPercent(stats.winRate)} accent={stats.winRate >= 0.5 ? "up" : "down"} />
              <Kpi label={t("Profit Factor")} value={Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞"} accent={stats.profitFactor >= 1 ? "up" : "down"} />
              <Kpi label={t("Expectancy")} value={`${stats.expectancy >= 0 ? "+" : ""}${stats.expectancy.toFixed(2)}R`} accent={stats.expectancy >= 0 ? "up" : "down"} />
              <Kpi label={t("Trades")} value={String(periodTrades.length)} />
              <Kpi label={t("Rule Breaks")} value={String(stats.ruleBreaks)} accent={stats.ruleBreaks > 0 ? "down" : "neutral"} />
            </div>

            {stats.accounts.length > 1 && (
              <div className="mt-4">
                <p className="mb-2 text-[12px] font-semibold text-[var(--muted)]">{t("By account")}</p>
                <div className="grid grid-cols-3 gap-2 max-[700px]:grid-cols-1">
                  {stats.accounts.map((account) => (
                    <div key={account.name} className="flex items-center justify-between rounded-md border border-[var(--line)] px-3 py-2 text-[12px]">
                      <span className="font-semibold">{account.name}</span>
                      <span className="num">
                        {account.count} · <span className={account.pnl >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]"}>{formatCurrency(account.pnl)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-[var(--line)] bg-[var(--panel-soft)] p-4 text-[13px] leading-6 text-[var(--ink)]">
              <strong className="font-display font-semibold">{t("Summary.")}</strong>
              <span className="num">{periodTrades.length}</span> {t("Trades")} ·
              {t("Most Traded")}: <strong>{stats.bestTicker}</strong> ·
              {t("Net PnL")}: <span className="num">{formatCurrency(stats.pnl)}</span> ·
              {t("Rule Breaks")}: <span className="num">{stats.ruleBreaks}</span>
            </div>
          </>
        )}
      </Surface>

      {saved.length > 0 && (
        <Surface className="mt-2">
          <SectionTitle>{t("Saved Snapshots")}</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-start text-[12px]">
              <thead className="border-y border-[var(--line)] text-[var(--muted)]">
                <tr>
                  {["Saved", "Period", "Trades", "Net PnL", "Win Rate", "Expectancy", ""].map((h, i) => (
                    <th key={i} className="h-9 px-2 text-start font-semibold">{h ? t(h) : ""}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {saved.map((report) => (
                  <tr key={report.id} className="border-b border-[var(--line)]">
                    <td className="num h-9 px-2 text-[var(--muted)]">{new Date(report.createdAt).toLocaleDateString()}</td>
                    <td className="px-2 font-semibold">{t(report.period.charAt(0) + report.period.slice(1).toLowerCase())}</td>
                    <td className="num px-2">{String(report.metrics.trades ?? "—")}</td>
                    <td className={cn("num px-2 font-semibold", Number(report.metrics.pnl ?? 0) >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                      {typeof report.metrics.pnl === "number" ? formatCurrency(report.metrics.pnl) : "—"}
                    </td>
                    <td className="num px-2">{typeof report.metrics.winRate === "number" ? formatPercent(report.metrics.winRate) : "—"}</td>
                    <td className="num px-2">{typeof report.metrics.expectancy === "number" ? `${report.metrics.expectancy >= 0 ? "+" : ""}${report.metrics.expectancy}R` : "—"}</td>
                    <td className="px-2 text-end">
                      <button onClick={() => handleDeleteReport(report.id)} disabled={pending} className="text-[var(--muted)] hover:text-[var(--red)]" title={t("Delete snapshot")}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
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
