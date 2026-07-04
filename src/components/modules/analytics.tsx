"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Surface, SectionTitle, ModuleShell, Kpi, EmptyState } from "@/components/ui";
import { formatCurrency, formatPercent, cn, computeEquityCurve } from "@/lib/utils";
import { useI18n } from "@/components/layout/i18n-provider";
import { sessionNameFromDbValue } from "@/lib/date-range";

type SerializedTrade = {
  id: string;
  ticker: string;
  direction: string;
  sessionName: string;
  rMultiple: string | number;
  pnl: string | number;
  openedAt: string;
  closedAt: string | null;
  ruleBreaks: { id: string; rule: string }[];
  account?: { id: string; name: string } | null;
  mae?: string | number | null;
  mfe?: string | number | null;
};

type AccountOption = { id: string; name: string };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
}

function rBucketLabel(r: number): string {
  if (r <= -3) return "≤-3R";
  if (r >= 3) return "≥+3R";
  const lo = Math.floor(r);
  return `${lo >= 0 ? "+" : ""}${lo}R`;
}

export function AnalyticsView({
  trades,
  accountOptions = [],
}: {
  trades: SerializedTrade[];
  accountOptions?: AccountOption[];
}) {
  const { t } = useI18n();
  const [accountFilter, setAccountFilter] = useState("All");

  const filtered = useMemo(
    () =>
      accountFilter === "All"
        ? trades
        : trades.filter((trade) => trade.account?.id === accountFilter),
    [trades, accountFilter],
  );

  const stats = useMemo(() => {
    const rValues = filtered.map((t) => Number(t.rMultiple));
    const pnlValues = filtered.map((t) => Number(t.pnl));
    const wins = rValues.filter((r) => r > 0);
    const losses = rValues.filter((r) => r < 0);
    const grossProfit = wins.reduce((s, r) => s + r, 0);
    const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0));

    const { rows: equityRows, maxDrawdown } = computeEquityCurve(filtered);
    const drawdownCurve = equityRows.reduce<{
      rows: { date: string; drawdown: number }[];
      peak: number;
    }>(
      (acc, row) => {
        const peak = Math.max(acc.peak, row.equity);
        return {
          rows: [
            ...acc.rows,
            { date: new Date(row.date).toLocaleDateString(), drawdown: row.equity - peak },
          ],
          peak,
        };
      },
      { rows: [], peak: 0 },
    ).rows;
    const equityCurve = equityRows.map((row) => ({
      ...row,
      date: new Date(row.date).toLocaleDateString(),
    }));

    // Win/loss streaks
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let current = 0;
    for (const r of rValues) {
      if (r > 0) {
        current = current > 0 ? current + 1 : 1;
        maxWinStreak = Math.max(maxWinStreak, current);
      } else if (r < 0) {
        current = current < 0 ? current - 1 : -1;
        maxLossStreak = Math.max(maxLossStreak, -current);
      }
    }

    // R-multiple distribution
    const rBuckets = new Map<string, number>();
    for (const r of rValues) {
      const label = rBucketLabel(r);
      rBuckets.set(label, (rBuckets.get(label) ?? 0) + 1);
    }
    const bucketOrder = ["≤-3R", "-3R", "-2R", "-1R", "+0R", "+1R", "+2R", "≥+3R"];
    const rDistribution = bucketOrder
      .filter((b) => rBuckets.has(b))
      .map((b) => ({ bucket: b, count: rBuckets.get(b)!, negative: b.startsWith("-") || b.startsWith("≤") }));

    // Day-of-week edge
    const byDay: Record<number, { r: number; wins: number; total: number }> = {};
    filtered.forEach((trade) => {
      const day = new Date(trade.openedAt).getDay();
      if (!byDay[day]) byDay[day] = { r: 0, wins: 0, total: 0 };
      byDay[day].r += Number(trade.rMultiple);
      byDay[day].total += 1;
      if (Number(trade.rMultiple) > 0) byDay[day].wins += 1;
    });
    const dayData = Object.entries(byDay)
      .map(([d, v]) => ({ day: WEEKDAYS[Number(d)], order: Number(d), ...v }))
      .sort((a, b) => a.order - b.order);

    // Daily P&L heatmap (last 120 trading-calendar days with data)
    const daily = new Map<string, number>();
    filtered.forEach((trade) => {
      const key = trade.openedAt.slice(0, 10);
      daily.set(key, (daily.get(key) ?? 0) + Number(trade.pnl));
    });
    const dailyPnl = Array.from(daily.entries())
      .map(([date, pnl]) => ({ date, pnl }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-120);
    const maxAbsDaily = Math.max(1, ...dailyPnl.map((d) => Math.abs(d.pnl)));

    const hourly: Record<number, { r: number; count: number }> = {};
    filtered.forEach((trade) => {
      const hour = new Date(trade.openedAt).getHours();
      if (!hourly[hour]) hourly[hour] = { r: 0, count: 0 };
      hourly[hour].r += Number(trade.rMultiple);
      hourly[hour].count += 1;
    });
    const hourData = Object.entries(hourly)
      .map(([h, v]) => ({ hour: `${h}:00`, r: v.r, count: v.count }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    const sessionData: Record<string, { r: number; wins: number; total: number }> = {};
    filtered.forEach((trade) => {
      const s = trade.sessionName;
      if (!sessionData[s]) sessionData[s] = { r: 0, wins: 0, total: 0 };
      sessionData[s].r += Number(trade.rMultiple);
      sessionData[s].total += 1;
      if (Number(trade.rMultiple) > 0) sessionData[s].wins += 1;
    });

    const tickerData: Record<string, { r: number; count: number; pnl: number; wins: number }> = {};
    filtered.forEach((trade) => {
      if (!tickerData[trade.ticker]) tickerData[trade.ticker] = { r: 0, count: 0, pnl: 0, wins: 0 };
      tickerData[trade.ticker].r += Number(trade.rMultiple);
      tickerData[trade.ticker].count += 1;
      tickerData[trade.ticker].pnl += Number(trade.pnl);
      if (Number(trade.rMultiple) > 0) tickerData[trade.ticker].wins += 1;
    });

    const avgWin = wins.length ? grossProfit / wins.length : 0;
    const avgLoss = losses.length ? grossLoss / losses.length : 0;

    // Hold-time analytics (closed trades with both timestamps)
    const holdMinutes = (trade: SerializedTrade) =>
      trade.closedAt
        ? (new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) / 60000
        : null;
    const winHolds = filtered
      .filter((trade) => Number(trade.rMultiple) > 0)
      .map(holdMinutes)
      .filter((m): m is number => m !== null && m >= 0);
    const lossHolds = filtered
      .filter((trade) => Number(trade.rMultiple) < 0)
      .map(holdMinutes)
      .filter((m): m is number => m !== null && m >= 0);
    const avgHoldWin = winHolds.length ? winHolds.reduce((s, m) => s + m, 0) / winHolds.length : null;
    const avgHoldLoss = lossHolds.length ? lossHolds.reduce((s, m) => s + m, 0) / lossHolds.length : null;

    // MAE/MFE efficiency (only trades where the trader recorded excursions)
    const excursions = filtered.filter(
      (trade) => trade.mae !== null && trade.mae !== undefined && trade.mfe !== null && trade.mfe !== undefined,
    );
    const avgMae = excursions.length
      ? excursions.reduce((s, trade) => s + Math.abs(Number(trade.mae)), 0) / excursions.length
      : null;
    const avgMfe = excursions.length
      ? excursions.reduce((s, trade) => s + Number(trade.mfe), 0) / excursions.length
      : null;
    const captureRate =
      avgMfe && avgMfe > 0 && excursions.length
        ? excursions.reduce((s, trade) => s + Number(trade.rMultiple), 0) / excursions.length / avgMfe
        : null;

    return {
      winRate: filtered.length ? wins.length / filtered.length : 0,
      profitFactor: grossLoss ? grossProfit / grossLoss : 0,
      expectancy: filtered.length ? rValues.reduce((s, r) => s + r, 0) / filtered.length : 0,
      avgR: filtered.length ? rValues.reduce((s, r) => s + r, 0) / filtered.length : 0,
      avgWin,
      avgLoss,
      payoff: avgLoss ? avgWin / avgLoss : 0,
      totalPnl: pnlValues.reduce((s, p) => s + p, 0),
      maxDrawdown,
      totalTrades: filtered.length,
      ruleBreaks: filtered.filter((trade) => trade.ruleBreaks.length > 0).length,
      maxWinStreak,
      maxLossStreak,
      avgHoldWin,
      avgHoldLoss,
      avgMae,
      avgMfe,
      captureRate,
      excursionSamples: excursions.length,
      equityCurve,
      drawdownCurve,
      rDistribution,
      dayData,
      dailyPnl,
      maxAbsDaily,
      hourData,
      sessionData: Object.entries(sessionData).map(([name, data]) => ({
        name: sessionNameFromDbValue(name),
        ...data,
        winRate: data.total ? data.wins / data.total : 0,
      })),
      tickerData: Object.entries(tickerData)
        .map(([ticker, data]) => ({
          ticker,
          ...data,
          winRate: data.count ? data.wins / data.count : 0,
        }))
        .sort((a, b) => b.pnl - a.pnl),
    };
  }, [filtered]);

  if (trades.length === 0) {
    return (
      <ModuleShell title={t("Analytics")} eyebrow={t("Analyze")} description={t("Performance analytics computed from your real trade data.")}>
        <EmptyState title={t("No trades yet")} description={t("Add trades to your journal or import from MetaTrader to see analytics.")} />
      </ModuleShell>
    );
  }

  return (
    <ModuleShell
      title={t("Analytics")}
      eyebrow={t("Analyze")}
      description={t("Performance analytics computed from your real trade data.")}
      actions={
        accountOptions.length > 0 ? (
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="h-9 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 text-[12px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
          >
            <option value="All">{t("All Accounts")}</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        ) : undefined
      }
    >
      <div className="stagger grid grid-cols-4 gap-2 max-[960px]:grid-cols-2 max-[560px]:grid-cols-1">
        <Kpi label={t("Win Rate")} value={formatPercent(stats.winRate)} accent={stats.winRate >= 0.5 ? "up" : "down"} />
        <Kpi label={t("Profit Factor")} value={stats.profitFactor.toFixed(2)} accent={stats.profitFactor >= 1 ? "up" : "down"} />
        <Kpi label={t("Expectancy")} value={`${stats.expectancy >= 0 ? "+" : ""}${stats.expectancy.toFixed(2)}R`} accent={stats.expectancy >= 0 ? "up" : "down"} />
        <Kpi label={t("Total P&L")} value={formatCurrency(stats.totalPnl)} accent={stats.totalPnl >= 0 ? "up" : "down"} />
      </div>

      <div className="mt-2 grid grid-cols-[1fr_340px] gap-2 max-[1080px]:grid-cols-1">
        <Surface>
          <SectionTitle>{t("Equity Curve")}</SectionTitle>
          <div className="mt-3 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.equityCurve}>
                <defs>
                  <linearGradient id="aeq" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--teal)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--teal)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area dataKey="equity" fill="url(#aeq)" stroke="var(--teal)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <SectionTitle>{t("Drawdown")}</SectionTitle>
          <div className="mt-2 h-[110px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.drawdownCurve}>
                <defs>
                  <linearGradient id="add" x1="0" x2="0" y1="1" y2="0">
                    <stop offset="0%" stopColor="var(--red)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--red)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} hide />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area dataKey="drawdown" fill="url(#add)" stroke="var(--red)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <div className="flex flex-col gap-2">
          <Surface>
            <SectionTitle>{t("R Distribution")}</SectionTitle>
            <div className="mt-3 h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.rDistribution}>
                  <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.rDistribution.map((row) => (
                      <Cell key={row.bucket} fill={row.negative ? "var(--red)" : "var(--teal)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Surface>
          <Surface>
            <SectionTitle>{t("Streaks & Ratios")}</SectionTitle>
            <div className="num mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Best win streak")}</span><span className="font-semibold text-[var(--teal-dark)]">{stats.maxWinStreak}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Worst loss streak")}</span><span className="font-semibold text-[var(--red)]">{stats.maxLossStreak}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Avg win")}</span><span className="font-semibold">{stats.avgWin.toFixed(2)}R</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Avg loss")}</span><span className="font-semibold">-{stats.avgLoss.toFixed(2)}R</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Payoff ratio")}</span><span className="font-semibold">{stats.payoff.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Max Drawdown")}</span><span className="font-semibold text-[var(--red)]">{formatCurrency(stats.maxDrawdown)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Avg hold (win)")}</span><span className="font-semibold">{formatMinutes(stats.avgHoldWin)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Avg hold (loss)")}</span><span className="font-semibold">{formatMinutes(stats.avgHoldLoss)}</span></div>
            </div>
            {stats.excursionSamples > 0 && (
              <div className="num mt-3 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-3 text-[12px]">
                <div className="flex flex-col"><span className="text-[var(--muted)]">{t("Avg MAE")}</span><span className="font-semibold text-[var(--red)]">-{(stats.avgMae ?? 0).toFixed(2)}R</span></div>
                <div className="flex flex-col"><span className="text-[var(--muted)]">{t("Avg MFE")}</span><span className="font-semibold text-[var(--teal-dark)]">+{(stats.avgMfe ?? 0).toFixed(2)}R</span></div>
                <div className="flex flex-col"><span className="text-[var(--muted)]">{t("Capture rate")}</span><span className="font-semibold">{stats.captureRate === null ? "—" : formatPercent(Math.max(0, stats.captureRate))}</span></div>
              </div>
            )}
          </Surface>
        </div>
      </div>

      <Surface className="mt-2">
        <div className="flex items-center justify-between">
          <SectionTitle>{t("Daily P&L")}</SectionTitle>
          <span className="text-[11px] text-[var(--muted)]">{stats.dailyPnl.length} {t("trading days")}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {stats.dailyPnl.map((day) => {
            const intensity = Math.min(1, Math.abs(day.pnl) / stats.maxAbsDaily);
            const alpha = 0.15 + intensity * 0.85;
            return (
              <div
                key={day.date}
                title={`${day.date}: ${formatCurrency(day.pnl)}`}
                className="h-5 w-5 rounded-sm border border-[var(--line)]"
                style={{
                  backgroundColor:
                    day.pnl >= 0
                      ? `color-mix(in srgb, var(--teal) ${Math.round(alpha * 100)}%, transparent)`
                      : `color-mix(in srgb, var(--red) ${Math.round(alpha * 100)}%, transparent)`,
                }}
              />
            );
          })}
        </div>
      </Surface>

      <div className="mt-2 grid grid-cols-2 gap-2 max-[900px]:grid-cols-1">
        <Surface>
          <SectionTitle>{t("Hour Analysis")}</SectionTitle>
          <div className="mt-3 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourData}>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="r" radius={[4, 4, 0, 0]}>
                  {stats.hourData.map((row) => (
                    <Cell key={row.hour} fill={row.r >= 0 ? "var(--teal)" : "var(--red)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
        <Surface>
          <SectionTitle>{t("Day of Week")}</SectionTitle>
          <div className="mt-3 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.dayData}>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="r" radius={[4, 4, 0, 0]}>
                  {stats.dayData.map((row) => (
                    <Cell key={row.day} fill={row.r >= 0 ? "var(--teal)" : "var(--red)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 max-[900px]:grid-cols-1">
        <Surface>
          <SectionTitle>{t("Session Analysis")}</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-start text-[12px]">
              <thead className="border-y border-[var(--line)] text-[var(--muted)]">
                <tr>
                  {["Session", "Trades", "Win Rate", "Total R"].map((h) => (
                    <th key={h} className="h-9 px-2 font-semibold">{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.sessionData.map((s) => (
                  <tr key={s.name} className="border-b border-[var(--line)]">
                    <td className="h-9 px-2 font-semibold">{t(s.name)}</td>
                    <td className="num px-2">{s.total}</td>
                    <td className="num px-2">{formatPercent(s.winRate)}</td>
                    <td className={cn("num px-2 font-semibold", s.r >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>{s.r.toFixed(2)}R</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <Surface>
          <SectionTitle>{t("Ticker Analysis")}</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-start text-[12px]">
              <thead className="border-y border-[var(--line)] text-[var(--muted)]">
                <tr>
                  {["Ticker", "Trades", "Win Rate", "Total R", "P&L"].map((h) => (
                    <th key={h} className="h-9 px-2 font-semibold">{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.tickerData.map((row) => (
                  <tr key={row.ticker} className="border-b border-[var(--line)]">
                    <td className="h-9 px-2 font-semibold">{row.ticker}</td>
                    <td className="num px-2">{row.count}</td>
                    <td className="num px-2">{formatPercent(row.winRate)}</td>
                    <td className={cn("num px-2 font-semibold", row.r >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>{row.r.toFixed(2)}R</td>
                    <td className="num px-2">{formatCurrency(row.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 max-[960px]:grid-cols-2">
        <Kpi label={t("Total Trades")} value={String(stats.totalTrades)} />
        <Kpi label={t("Avg R")} value={`${stats.avgR.toFixed(2)}R`} accent={stats.avgR >= 0 ? "up" : "down"} />
        <Kpi label={t("Max Drawdown")} value={formatCurrency(stats.maxDrawdown)} accent="down" />
        <Kpi label={t("Rule Breaks")} value={String(stats.ruleBreaks)} accent={stats.ruleBreaks > 0 ? "down" : "neutral"} />
      </div>
    </ModuleShell>
  );
}
