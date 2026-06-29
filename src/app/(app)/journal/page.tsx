import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JournalView } from "@/components/modules/journal";

export default async function JournalPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const trades = await prisma.trade.findMany({
    where: { userId },
    include: { ruleBreaks: true, review: true, opportunity: true },
    orderBy: { openedAt: "desc" },
  });

  return <JournalView trades={JSON.parse(JSON.stringify(trades))} />;
}
