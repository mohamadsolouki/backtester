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
import { OnboardingBanner } from "@/components/modules/onboarding-banner";
import { useI18n } from "@/components/layout/i18n-provider";

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
  showOnboarding?: boolean;
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

export function DashboardView({ opportunities, trades, playbooks, metrics, equityCurve, showOnboarding }: Props) {
  const { t } = useI18n();
  const watching = opportunities.filter((o) => o.status === "WATCHING" || o.status === "PLANNED");
  const taken = opportunities.filter((o) => o.status === "TAKEN");

  return (
    <div className="space-y-2">
      {showOnboarding && <OnboardingBanner />}
      <div className="stagger grid grid-cols-4 gap-2 max-[960px]:grid-cols-2 max-[560px]:grid-cols-1">
        <Kpi label={t("Win Rate")} value={metrics.totalTrades ? formatPercent(metrics.winRate) : "—"} accent={metrics.winRate >= 0.5 ? "up" : "down"} />
        <Kpi label={t("Profit Factor")} value={metrics.totalTrades ? metrics.profitFactor.toFixed(2) : "—"} accent={metrics.profitFactor >= 1 ? "up" : "down"} />
        <Kpi label={t("Expectancy")} value={metrics.totalTrades ? `${metrics.expectancy >= 0 ? "+" : ""}${metrics.expectancy.toFixed(2)}R` : "—"} accent={metrics.expectancy >= 0 ? "up" : "down"} />
        <Kpi label={t("Total P&L")} value={metrics.totalTrades ? formatCurrency(metrics.totalPnl) : "—"} accent={metrics.totalPnl >= 0 ? "up" : "down"} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-2 max-[1100px]:grid-cols-1">
        <div className="space-y-2">
          {equityCurve.length > 1 && (
            <Surface>
              <SectionTitle>{t("Equity Curve")}</SectionTitle>
              <div className="mt-3 h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurve}>
                    <defs>
                      <linearGradient id="eq" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="var(--teal)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--teal)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }} />
                    <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }} />
                    <Tooltip />
                    <Area dataKey="equity" fill="url(#eq)" stroke="var(--teal)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Surface>
          )}

          <Surface>
            <div className="flex items-center justify-between">
              <SectionTitle>{t("Active Opportunities")}</SectionTitle>
              <Link href="/opportunities" className="text-[12px] font-medium text-[var(--teal-dark)] hover:underline">
                {t("View all")} <ChevronRight className="ms-1 inline h-3 w-3 rtl:-scale-x-100" />
              </Link>
            </div>
            {watching.length === 0 ? (
              <p className="mt-3 text-[13px] text-[var(--muted)]">
                {t("No active opportunities.")}{" "}
                <Link href="/opportunities" className="text-[var(--teal-dark)] hover:underline">{t("Create one")}</Link> {t("or")}{" "}
                <Link href="/import" className="text-[var(--teal-dark)] hover:underline">{t("import from MetaTrader")}</Link>.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[500px] text-start text-[12px]">
                  <thead className="border-y border-[var(--line)] text-[var(--muted)]">
                    <tr>
                      {["Ticker", "Setup", "Status", "Confirmations", "Grade"].map((h) => (
                        <th key={h} className="h-9 px-2 font-semibold">{t(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {watching.slice(0, 8).map((opp) => (
                      <tr key={opp.id} className="border-b border-[var(--line)]">
                        <td className="h-10 px-2 font-semibold">{opp.ticker}</td>
                        <td className="px-2">{opp.setupName}</td>
                        <td className="px-2"><StatusPill status={opp.status} /></td>
                        <td className="num px-2">{opp.confirmationCount}</td>
                        <td className="num px-2">{opp.grade ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Surface>

          <Surface>
            <div className="flex items-center justify-between">
              <SectionTitle>{t("Recent Trades")}</SectionTitle>
              <Link href="/journal" className="text-[12px] font-medium text-[var(--teal-dark)] hover:underline">
                {t("View all")} <ChevronRight className="ms-1 inline h-3 w-3 rtl:-scale-x-100" />
              </Link>
            </div>
            {trades.length === 0 ? (
              <p className="mt-3 text-[13px] text-[var(--muted)]">
                {t("No trades yet.")}{" "}
                <Link href="/journal" className="text-[var(--teal-dark)] hover:underline">{t("Add a trade")}</Link> {t("or")}{" "}
                <Link href="/import" className="text-[var(--teal-dark)] hover:underline">{t("import from MetaTrader")}</Link>.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[500px] text-start text-[12px]">
                  <thead className="border-y border-[var(--line)] text-[var(--muted)]">
                    <tr>
                      {["Date", "Ticker", "Direction", "R", "P&L", "Rule Break"].map((h) => (
                        <th key={h} className="h-9 px-2 font-semibold">{t(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 8).map((tr) => (
                      <tr key={tr.id} className="border-b border-[var(--line)]">
                        <td className="num h-10 px-2 text-[var(--muted)]">{new Date(tr.openedAt).toLocaleDateString()}</td>
                        <td className="px-2 font-semibold">{tr.ticker}</td>
                        <td className="px-2"><StatusPill status={tr.direction} label={tr.direction} /></td>
                        <td className={cn("num px-2 font-semibold", Number(tr.rMultiple) >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                          {Number(tr.rMultiple).toFixed(1)}R
                        </td>
                        <td className="num px-2">{formatCurrency(Number(tr.pnl))}</td>
                        <td className="px-2">{tr.ruleBreaks.length > 0 ? <StatusPill status="SKIPPED" label="Yes" /> : "—"}</td>
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
            <SectionTitle>{t("Quick Actions")}</SectionTitle>
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
                  className="shadow-lift block rounded-md border border-[var(--line)] p-3 hover:border-[var(--teal)]/50 hover:bg-[var(--panel-soft)]"
                >
                  <div className="text-[13px] font-semibold text-[var(--ink)]">{t(item.label)}</div>
                  <div className="mt-1 text-[12px] text-[var(--muted)]">{t(item.desc)}</div>
                </Link>
              ))}
            </div>
          </Surface>

          <Surface>
            <SectionTitle>{t("Active Playbooks")}</SectionTitle>
            {playbooks.length === 0 ? (
              <p className="mt-3 text-[13px] text-[var(--muted)]">
                {t("No playbooks yet.")}{" "}
                <Link href="/playbook" className="text-[var(--teal-dark)] hover:underline">{t("Create one")}</Link>.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {playbooks.slice(0, 5).map((pb) => (
                  <Link
                    key={pb.id}
                    href="/playbook"
                    className="shadow-lift block rounded-md border border-[var(--line)] p-3 hover:border-[var(--teal)]/50 hover:bg-[var(--panel-soft)]"
                  >
                    <div className="text-[13px] font-semibold">{pb.name}</div>
                    <div className="mt-1 line-clamp-2 text-[12px] text-[var(--muted)]">{pb.context}</div>
                  </Link>
                ))}
              </div>
            )}
          </Surface>

          <Surface>
            <SectionTitle>{t("Stats Summary")}</SectionTitle>
            <div className="mt-3 space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Total Trades")}</span><span className="num font-semibold">{metrics.totalTrades}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Avg R")}</span><span className="num font-semibold">{metrics.avgR.toFixed(2)}R</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Max Drawdown")}</span><span className="num font-semibold text-[var(--red)]">{formatCurrency(metrics.maxDrawdown)}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Rule Breaks")}</span><span className="num font-semibold">{metrics.ruleBreaks}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted)]">{t("Opportunities")}</span><span className="num font-semibold">{watching.length} {t("Watching")} / {taken.length} {t("Taken")}</span></div>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
