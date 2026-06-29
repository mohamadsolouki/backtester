import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AnalyticsView } from "@/components/modules/analytics";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const trades = await prisma.trade.findMany({
    where: { userId, status: "CLOSED" },
    include: { ruleBreaks: true },
    orderBy: { openedAt: "asc" },
  });

  return <AnalyticsView trades={JSON.parse(JSON.stringify(trades))} />;
}
