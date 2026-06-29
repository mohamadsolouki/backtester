import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardView } from "@/components/modules/dashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const [opportunities, trades, playbooks] = await Promise.all([
    prisma.opportunity.findMany({
      where: { userId },
      include: { contextTags: true, entries: true },
      orderBy: { plannedAt: "desc" },
      take: 20,
    }),
    prisma.trade.findMany({
      where: { userId, status: "CLOSED" },
      include: { ruleBreaks: true },
      orderBy: { openedAt: "desc" },
      take: 50,
    }),
    prisma.playbookSetup.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rValues = trades.map((t) => Number(t.rMultiple));
  const wins = rValues.filter((r) => r > 0);
  const losses = rValues.filter((r) => r < 0);
  const grossProfit = wins.reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0));

  let equity = 0;
  let maxEquity = 0;
  let maxDrawdown = 0;
  const equityCurve = trades
    .slice()
    .reverse()
    .map((t) => {
      equity += Number(t.pnl);
      maxEquity = Math.max(maxEquity, equity);
      maxDrawdown = Math.min(maxDrawdown, equity - maxEquity);
      return { date: t.openedAt.toISOString().slice(0, 10), equity, pnl: Number(t.pnl) };
    });

  const metrics = {
    totalTrades: trades.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : 0,
    expectancy: trades.length ? rValues.reduce((s, r) => s + r, 0) / trades.length : 0,
    avgR: trades.length ? rValues.reduce((s, r) => s + r, 0) / trades.length : 0,
    totalPnl: trades.reduce((s, t) => s + Number(t.pnl), 0),
    maxDrawdown,
    ruleBreaks: trades.filter((t) => t.ruleBreaks.length > 0).length,
  };

  return (
    <DashboardView
      opportunities={JSON.parse(JSON.stringify(opportunities))}
      trades={JSON.parse(JSON.stringify(trades))}
      playbooks={JSON.parse(JSON.stringify(playbooks))}
      metrics={metrics}
      equityCurve={equityCurve}
    />
  );
}
