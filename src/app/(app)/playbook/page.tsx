import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PlaybookView } from "@/components/modules/playbook";

export default async function PlaybookPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user!.id;

  const playbooks = await prisma.playbookSetup.findMany({
    where: { userId },
    include: { screenshots: true },
    orderBy: { createdAt: "desc" },
  });

  return <PlaybookView playbooks={JSON.parse(JSON.stringify(playbooks))} />;
}
