import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImportView } from "@/components/modules/import-view";

export default async function ImportPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const batches = await prisma.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return <ImportView batches={JSON.parse(JSON.stringify(batches))} />;
}
