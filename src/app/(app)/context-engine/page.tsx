import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContextEngineView } from "@/components/modules/context-engine";

export default async function ContextEnginePage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const opportunities = await prisma.opportunity.findMany({
    where: { userId },
    include: { contextTags: true, entries: true },
    orderBy: { plannedAt: "desc" },
  });

  return <ContextEngineView opportunities={JSON.parse(JSON.stringify(opportunities))} />;
}
