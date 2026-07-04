import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTradingAccounts } from "@/app/actions/accounts";
import { ImportView } from "@/components/modules/import-view";

export default async function ImportPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const [batches, accounts] = await Promise.all([
    prisma.importBatch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getTradingAccounts(),
  ]);

  return (
    <ImportView
      batches={JSON.parse(JSON.stringify(batches))}
      accountOptions={accounts.map((a) => ({ id: a.id, name: a.name }))}
    />
  );
}
