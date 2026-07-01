import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BacktestView } from "@/components/modules/backtest";

export default async function BacktestPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const trades = await prisma.trade.findMany({
    where: { userId, status: "CLOSED" },
    include: {
      ruleBreaks: true,
      opportunity: { include: { contextTags: true } },
      contextTags: true,
    },
    orderBy: { openedAt: "desc" },
  });

  return <BacktestView trades={JSON.parse(JSON.stringify(trades))} />;
}
