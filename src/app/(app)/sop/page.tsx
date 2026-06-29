import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SopView } from "@/components/modules/sop";

export default async function SopPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const documents = await prisma.sOPDocument.findMany({
    where: { userId, active: true },
    include: { versions: { orderBy: { publishedAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return <SopView documents={JSON.parse(JSON.stringify(documents))} />;
}
