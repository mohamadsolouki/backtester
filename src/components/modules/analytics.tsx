"use client";

import { useMemo } from "react";
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

type SerializedTrade = {
  id: string;
  ticker: string;
  direction: string;
  sessionName: string;
  rMultiple: string | number;
  pnl: string | number;
  openedAt: string;
  ruleBreaks: { id: string; rule: string }[];
};

export function AnalyticsView({ trades }: { trades: SerializedTrade[] }) {
  const stats = useMemo(() => {
    const rValues = trades.map((t) => Number(t.rMultiple));
    const pnlValues = trades.map((t) => Number(t.pnl));
    const wins = rValues.filter((r) => r > 0);
    const losses = rValues.filter((r) => r < 0);
    const grossProfit = wins.reduce((s, r) => s + r, 0);
    const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0));

    const { rows: equityRows, maxDrawdown } = computeEquityCurve(trades);
    const equityCurve = equityRows.map((row) => ({
      ...row,
      date: new Date(row.date).toLocaleDateString(),
    }));

    const hourly: Record<number, { r: number; count: number }> = {};
    trades.forEach((t) => {
      const hour = new Date(t.openedAt).getHours();
      if (!hourly[hour]) hourly[hour] = { r: 0, count: 0 };
      hourly[hour].r += Number(t.rMultiple);
      hourly[hour].count += 1;
    });
    const hourData = Object.entries(hourly)
      .map(([h, v]) => ({ hour: `${h}:00`, r: v.r, count: v.count }))
      .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    const sessionData: Record<string, { r: number; wins: number; total: number }> = {};
    trades.forEach((t) => {
      const s = t.sessionName;
      if (!sessionData[s]) sessionData[s] = { r: 0, wins: 0, total: 0 };
      sessionData[s].r += Number(t.rMultiple);
      sessionData[s].total += 1;
      if (Number(t.rMultiple) > 0) sessionData[s].wins += 1;
    });

    const tickerData: Record<string, { r: number; count: number; pnl: number }> = {};
    trades.forEach((t) => {
      if (!tickerData[t.ticker]) tickerData[t.ticker] = { r: 0, count: 0, pnl: 0 };
      tickerData[t.ticker].r += Number(t.rMultiple);
      tickerData[t.ticker].count += 1;
      tickerData[t.ticker].pnl += Number(t.pnl);
    });

    return {
      winRate: trades.length ? wins.length / trades.length : 0,
      profitFactor: grossLoss ? grossProfit / grossLoss : 0,
      expectancy: trades.length ? rValues.reduce((s, r) => s + r, 0) / trades.length : 0,
      avgR: trades.length ? rValues.reduce((s, r) => s + r, 0) / trades.length : 0,
      totalPnl: pnlValues.reduce((s, p) => s + p, 0),
      maxDrawdown,
      totalTrades: trades.length,
      ruleBreaks: trades.filter((t) => t.ruleBreaks.length > 0).length,
      equityCurve,
      hourData,
      sessionData: Object.entries(sessionData).map(([name, data]) => ({
        name: name.replace(/_/g, " "),
        ...data,
        winRate: data.total ? data.wins / data.total : 0,
      })),
      tickerData: Object.entries(tickerData)
        .map(([ticker, data]) => ({ ticker, ...data }))
        .sort((a, b) => b.pnl - a.pnl),
    };
  }, [trades]);

  if (trades.length === 0) {
    return (
      <ModuleShell title="Analytics" description="Performance analytics computed from your real trade data.">
        <EmptyState title="No trades yet" description="Add trades to your journal or import from MetaTrader to see analytics." />
      </ModuleShell>
    );
  }

  return (
    <ModuleShell title="Analytics" description="Performance analytics computed from your real trade data.">
      <div className="grid grid-cols-4 gap-2 max-[960px]:grid-cols-2 max-[560px]:grid-cols-1">
        <Kpi label="Win Rate" value={formatPercent(stats.winRate)} />
        <Kpi label="Profit Factor" value={stats.profitFactor.toFixed(2)} />
        <Kpi label="Expectancy" value={`${stats.expectancy >= 0 ? "+" : ""}${stats.expectancy.toFixed(2)}R`} />
        <Kpi label="Total P&L" value={formatCurrency(stats.totalPnl)} />
      </div>

      <div className="mt-2 grid grid-cols-[1fr_340px] gap-2 max-[1080px]:grid-cols-1">
        <Surface>
          <SectionTitle>Equity Curve</SectionTitle>
          <div className="mt-3 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.equityCurve}>
                <defs>
                  <linearGradient id="aeq" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f9f95" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0f9f95" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf1ef" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area dataKey="equity" fill="url(#aeq)" stroke="#0f9f95" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>

        <Surface>
          <SectionTitle>Hour Analysis</SectionTitle>
          <div className="mt-3 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourData}>
                <CartesianGrid stroke="#edf1ef" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="r" radius={[4, 4, 0, 0]}>
                  {stats.hourData.map((row) => (
                    <Cell key={row.hour} fill={row.r >= 0 ? "#0f9f95" : "#d94848"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 max-[900px]:grid-cols-1">
        <Surface>
          <SectionTitle>Session Analysis</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="border-y border-[#e4ebe8] text-[#5f6d68]">
                <tr>
                  {["Session", "Trades", "Win Rate", "Total R"].map((h) => (
                    <th key={h} className="h-9 px-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.sessionData.map((s) => (
                  <tr key={s.name} className="border-b border-[#edf1ef]">
                    <td className="h-9 px-2 font-semibold">{s.name}</td>
                    <td className="px-2">{s.total}</td>
                    <td className="px-2">{formatPercent(s.winRate)}</td>
                    <td className={cn("px-2 font-semibold", s.r >= 0 ? "text-[#08746f]" : "text-[#d94848]")}>{s.r.toFixed(2)}R</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <Surface>
          <SectionTitle>Ticker Analysis</SectionTitle>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="border-y border-[#e4ebe8] text-[#5f6d68]">
                <tr>
                  {["Ticker", "Trades", "Total R", "P&L"].map((h) => (
                    <th key={h} className="h-9 px-2 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.tickerData.map((t) => (
                  <tr key={t.ticker} className="border-b border-[#edf1ef]">
                    <td className="h-9 px-2 font-semibold">{t.ticker}</td>
                    <td className="px-2">{t.count}</td>
                    <td className={cn("px-2 font-semibold", t.r >= 0 ? "text-[#08746f]" : "text-[#d94848]")}>{t.r.toFixed(2)}R</td>
                    <td className="px-2">{formatCurrency(t.pnl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 max-[960px]:grid-cols-2">
        <Kpi label="Total Trades" value={String(stats.totalTrades)} />
        <Kpi label="Avg R" value={`${stats.avgR.toFixed(2)}R`} />
        <Kpi label="Max Drawdown" value={formatCurrency(stats.maxDrawdown)} />
        <Kpi label="Rule Breaks" value={String(stats.ruleBreaks)} />
      </div>
    </ModuleShell>
  );
}
