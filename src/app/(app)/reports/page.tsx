import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReportsView } from "@/components/modules/reports";

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const trades = await prisma.trade.findMany({
    where: { userId, status: "CLOSED" },
    include: { ruleBreaks: true },
    orderBy: { openedAt: "desc" },
  });

  return <ReportsView trades={JSON.parse(JSON.stringify(trades))} />;
}
