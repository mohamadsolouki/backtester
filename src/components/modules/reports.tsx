"use client";

import { useMemo, useState } from "react";
import { Surface, SectionTitle, ModuleShell, Kpi, Segmented, ActionButton, EmptyState } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { Download } from "lucide-react";
import { useI18n } from "@/components/layout/i18n-provider";

type SerializedTrade = {
  id: string;
  ticker: string;
  rMultiple: string | number;
  pnl: string | number;
  openedAt: string;
  ruleBreaks: { id: string; rule: string }[];
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

export function ReportsView({ trades }: { trades: SerializedTrade[] }) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>("Weekly");

  const { periodTrades, stats } = useMemo(() => {
    const start = startOfPeriod(period);
    const periodTrades = trades.filter((t) => new Date(t.openedAt) >= start);
    const rValues = periodTrades.map((t) => Number(t.rMultiple));
    const pnl = periodTrades.reduce((s, t) => s + Number(t.pnl), 0);
    const expectancy = periodTrades.length ? rValues.reduce((s, r) => s + r, 0) / periodTrades.length : 0;
    const ruleBreaks = periodTrades.filter((t) => t.ruleBreaks.length > 0).length;
    const tickerCounts: Record<string, number> = {};
    periodTrades.forEach((t) => { tickerCounts[t.ticker] = (tickerCounts[t.ticker] ?? 0) + 1; });
    const bestTicker = Object.entries(tickerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

    return { periodTrades, stats: { pnl, expectancy, ruleBreaks, bestTicker } };
  }, [trades, period]);

  function exportReport() {
    const rows = [
      ["Period", period],
      ["Net PnL", formatCurrency(stats.pnl)],
      ["Expectancy", `${stats.expectancy >= 0 ? "+" : ""}${stats.expectancy.toFixed(2)}R`],
      ["Trades", String(periodTrades.length)],
      ["Rule Breaks", String(stats.ruleBreaks)],
      ["Most Traded", stats.bestTicker],
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${period.toLowerCase()}-trading-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ModuleShell
      title={t("Reports")}
      eyebrow={t("Analyze")}
      description={t("Daily, weekly, and monthly performance summaries from your actual trade data.")}
      actions={<ActionButton icon={Download} onClick={exportReport}>{t("Export Report")}</ActionButton>}
    >
      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>{t(period)} {t("Report")}</SectionTitle>
          <Segmented value={period} options={["Daily", "Weekly", "Monthly"]} onChange={(v) => setPeriod(v as Period)} />
        </div>

        {periodTrades.length === 0 ? (
          <EmptyState title={t("No trades in this period")} description={t("Trades you log or import will appear here once they fall within the selected period.")} />
        ) : (
          <>
            <div className="stagger mt-4 grid grid-cols-4 gap-2 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
              <Kpi label={t("Net PnL")} value={formatCurrency(stats.pnl)} accent={stats.pnl >= 0 ? "up" : "down"} />
              <Kpi label={t("Expectancy")} value={`${stats.expectancy >= 0 ? "+" : ""}${stats.expectancy.toFixed(2)}R`} accent={stats.expectancy >= 0 ? "up" : "down"} />
              <Kpi label={t("Trades")} value={String(periodTrades.length)} />
              <Kpi label={t("Rule Breaks")} value={String(stats.ruleBreaks)} accent={stats.ruleBreaks > 0 ? "down" : "neutral"} />
            </div>
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
    </ModuleShell>
  );
}
