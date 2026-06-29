"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Surface, SectionTitle, Kpi, StatusPill } from "@/components/ui";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";

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

type SerializedOpportunity = {
  id: string;
  ticker: string;
  setupName: string;
  status: string;
  confirmationCount: number;
  grade: string;
  bias: string;
  contextTags: { name: string; enabled: boolean }[];
  entries: { type: string; status: string }[];
};

type SerializedPlaybook = {
  id: string;
  name: string;
  context: string;
  active: boolean;
};

type Props = {
  opportunities: SerializedOpportunity[];
  trades: SerializedTrade[];
  playbooks: SerializedPlaybook[];
  metrics: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    expectancy: number;
    avgR: number;
    totalPnl: number;
    maxDrawdown: number;
    ruleBreaks: number;
  };
  equityCurve: { date: string; equity: number; pnl: number }[];
};

export function DashboardView({ opportunities, trades, playbooks, metrics, equityCurve }: Props) {
  const watching = opportunities.filter((o) => o.status === "WATCHING" || o.status === "PLANNED");
  const taken = opportunities.filter((o) => o.status === "TAKEN");

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2 max-[960px]:grid-cols-2 max-[560px]:grid-cols-1">
        <Kpi label="Win Rate" value={metrics.totalTrades ? formatPercent(metrics.winRate) : "—"} />
        <Kpi label="Profit Factor" value={metrics.totalTrades ? metrics.profitFactor.toFixed(2) : "—"} />
        <Kpi label="Expectancy" value={metrics.totalTrades ? `${metrics.expectancy >= 0 ? "+" : ""}${metrics.expectancy.toFixed(2)}R` : "—"} />
        <Kpi label="Total P&L" value={metrics.totalTrades ? formatCurrency(metrics.totalPnl) : "—"} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-2 max-[1100px]:grid-cols-1">
        <div className="space-y-2">
          {equityCurve.length > 1 && (
            <Surface>
              <SectionTitle>Equity Curve</SectionTitle>
              <div className="mt-3 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurve}>
                    <defs>
                      <linearGradient id="eq" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0f9f95" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#0f9f95" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#edf1ef" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area dataKey="equity" fill="url(#eq)" stroke="#0f9f95" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Surface>
          )}

          <Surface>
            <div className="flex items-center justify-between">
              <SectionTitle>Active Opportunities</SectionTitle>
              <Link href="/opportunities" className="text-[12px] font-medium text-[#08746f] hover:underline">
                View all <ChevronRight className="ml-1 inline h-3 w-3" />
              </Link>
            </div>
            {watching.length === 0 ? (
              <p className="mt-3 text-[13px] text-[#66746f]">
                No active opportunities.{" "}
                <Link href="/opportunities" className="text-[#08746f] hover:underline">Create one</Link> or{" "}
                <Link href="/import" className="text-[#08746f] hover:underline">import from MetaTrader</Link>.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-[12px]">
                  <thead className="border-y border-[#e4ebe8] text-[#5f6d68]">
                    <tr>
                      {["Ticker", "Setup", "Status", "Confirmations", "Grade"].map((h) => (
                        <th key={h} className="h-9 px-2 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {watching.slice(0, 8).map((opp) => (
                      <tr key={opp.id} className="border-b border-[#edf1ef]">
                        <td className="h-10 px-2 font-semibold">{opp.ticker}</td>
                        <td className="px-2">{opp.setupName}</td>
                        <td className="px-2"><StatusPill status={opp.status} /></td>
                        <td className="px-2">{opp.confirmationCount}</td>
                        <td className="px-2">{opp.grade ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Surface>

          <Surface>
            <div className="flex items-center justify-between">
              <SectionTitle>Recent Trades</SectionTitle>
              <Link href="/journal" className="text-[12px] font-medium text-[#08746f] hover:underline">
                View all <ChevronRight className="ml-1 inline h-3 w-3" />
              </Link>
            </div>
            {trades.length === 0 ? (
              <p className="mt-3 text-[13px] text-[#66746f]">
                No trades yet.{" "}
                <Link href="/journal" className="text-[#08746f] hover:underline">Add a trade</Link> or{" "}
                <Link href="/import" className="text-[#08746f] hover:underline">import from MetaTrader</Link>.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[500px] text-left text-[12px]">
                  <thead className="border-y border-[#e4ebe8] text-[#5f6d68]">
                    <tr>
                      {["Date", "Ticker", "Direction", "R", "P&L", "Rule Break"].map((h) => (
                        <th key={h} className="h-9 px-2 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 8).map((t) => (
                      <tr key={t.id} className="border-b border-[#edf1ef]">
                        <td className="h-10 px-2">{new Date(t.openedAt).toLocaleDateString()}</td>
                        <td className="px-2 font-semibold">{t.ticker}</td>
                        <td className="px-2"><StatusPill status={t.direction} label={t.direction} /></td>
                        <td className={cn("px-2 font-semibold", Number(t.rMultiple) >= 0 ? "text-[#08746f]" : "text-[#d94848]")}>
                          {Number(t.rMultiple).toFixed(1)}R
                        </td>
                        <td className="px-2">{formatCurrency(Number(t.pnl))}</td>
                        <td className="px-2">{t.ruleBreaks.length > 0 ? <StatusPill status="SKIPPED" label="Yes" /> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Surface>
        </div>

        <div className="space-y-2">
          <Surface>
            <SectionTitle>Quick Actions</SectionTitle>
            <div className="mt-3 space-y-2">
              {[
                { label: "Add Trade", href: "/journal", desc: "Record a new trade in your journal" },
                { label: "New Opportunity", href: "/opportunities", desc: "Plan a new trading idea" },
                { label: "Import Trades", href: "/import", desc: "Import from MetaTrader or CSV" },
                { label: "View Analytics", href: "/analytics", desc: "Review your performance" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block rounded-md border border-[#dbe2df] p-3 hover:border-[#89ccc6] hover:bg-[#effaf8]"
                >
                  <div className="text-[13px] font-semibold text-[#263331]">{item.label}</div>
                  <div className="mt-1 text-[12px] text-[#66746f]">{item.desc}</div>
                </Link>
              ))}
            </div>
          </Surface>

          <Surface>
            <SectionTitle>Active Playbooks</SectionTitle>
            {playbooks.length === 0 ? (
              <p className="mt-3 text-[13px] text-[#66746f]">
                No playbooks yet.{" "}
                <Link href="/playbook" className="text-[#08746f] hover:underline">Create one</Link>.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {playbooks.slice(0, 5).map((pb) => (
                  <Link
                    key={pb.id}
                    href="/playbook"
                    className="block rounded-md border border-[#dbe2df] p-3 hover:border-[#89ccc6] hover:bg-[#effaf8]"
                  >
                    <div className="text-[13px] font-semibold">{pb.name}</div>
                    <div className="mt-1 line-clamp-2 text-[12px] text-[#66746f]">{pb.context}</div>
                  </Link>
                ))}
              </div>
            )}
          </Surface>

          <Surface>
            <SectionTitle>Stats Summary</SectionTitle>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[#66746f]">Total Trades</span><span className="font-semibold">{metrics.totalTrades}</span></div>
              <div className="flex justify-between"><span className="text-[#66746f]">Avg R</span><span className="font-semibold">{metrics.avgR.toFixed(2)}R</span></div>
              <div className="flex justify-between"><span className="text-[#66746f]">Max Drawdown</span><span className="font-semibold text-[#d94848]">{formatCurrency(metrics.maxDrawdown)}</span></div>
              <div className="flex justify-between"><span className="text-[#66746f]">Rule Breaks</span><span className="font-semibold">{metrics.ruleBreaks}</span></div>
              <div className="flex justify-between"><span className="text-[#66746f]">Opportunities</span><span className="font-semibold">{watching.length} watching / {taken.length} taken</span></div>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
