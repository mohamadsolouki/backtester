"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

const saveSchema = z.object({
  period: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  metrics: z.record(z.string(), z.union([z.string(), z.number()])),
  notes: z.string().max(2000).optional(),
});

export async function saveReport(input: z.input<typeof saveSchema>) {
  const userId = await requireUser();
  const data = saveSchema.parse(input);
  const report = await prisma.report.create({
    data: {
      userId,
      period: data.period,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      metrics: data.metrics as Prisma.InputJsonValue,
      notes: data.notes,
    },
  });
  revalidatePath("/reports");
  return { id: report.id };
}

export async function getReports() {
  const userId = await requireUser();
  return prisma.report.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function deleteReport(id: string) {
  const userId = await requireUser();
  await prisma.report.deleteMany({ where: { id, userId } });
  revalidatePath("/reports");
}
