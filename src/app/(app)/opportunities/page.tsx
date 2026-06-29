import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OpportunitiesView } from "@/components/modules/opportunities";

export default async function OpportunitiesPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const opportunities = await prisma.opportunity.findMany({
    where: { userId },
    include: { contextTags: true, entries: true, trade: true, review: true },
    orderBy: { plannedAt: "desc" },
  });

  return <OpportunitiesView opportunities={JSON.parse(JSON.stringify(opportunities))} />;
}
