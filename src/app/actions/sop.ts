"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getSopDocuments() {
  const userId = await requireUser();
  return prisma.sOPDocument.findMany({
    where: { userId, active: true },
    include: { versions: { orderBy: { publishedAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSopDocument(title: string, content: Record<string, unknown>) {
  const userId = await requireUser();

  const doc = await prisma.sOPDocument.create({
    data: {
      userId,
      title,
      versions: {
        create: {
          version: "1.0.0",
          content: content as any,
          changeLog: "Initial version",
        },
      },
    },
    include: { versions: true },
  });

  revalidatePath("/sop");
  return doc;
}

export async function publishSopVersion(sopId: string, content: Record<string, unknown>, changeLog: string) {
  const userId = await requireUser();
  const doc = await prisma.sOPDocument.findFirst({ where: { id: sopId, userId } });
  if (!doc) throw new Error("Not found");

  const latest = await prisma.sOPVersion.findFirst({
    where: { sopId },
    orderBy: { publishedAt: "desc" },
  });

  const parts = (latest?.version ?? "1.0.0").split(".").map(Number);
  parts[1] += 1;
  const nextVersion = parts.join(".");

  const version = await prisma.sOPVersion.create({
    data: {
      sopId,
      version: nextVersion,
      content: content as any,
      changeLog,
    },
  });

  revalidatePath("/sop");
  return version;
}

export async function deleteSopDocument(id: string) {
  const userId = await requireUser();
  await prisma.sOPDocument.update({
    where: { id, userId },
    data: { active: false },
  });
  revalidatePath("/sop");
}
