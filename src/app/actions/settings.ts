"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { UserSettings } from "@prisma/client";
import { z } from "zod";

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Prisma's Decimal fields aren't plain objects — server actions can only return JSON-safe data to client components. */
function serialize(settings: UserSettings) {
  return {
    ...settings,
    riskPerTrade: Number(settings.riskPerTrade),
    maxDailyLoss: Number(settings.maxDailyLoss),
    maxOpenRisk: Number(settings.maxOpenRisk),
    minR: Number(settings.minR),
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function getUserSettings() {
  const userId = await requireUser();
  const existing = await prisma.userSettings.findUnique({ where: { userId } });
  const settings = existing ?? (await prisma.userSettings.create({ data: { userId } }));
  return serialize(settings);
}

const updateSchema = z.object({
  riskPerTrade: z.number().positive().optional(),
  maxDailyLoss: z.number().positive().optional(),
  maxOpenRisk: z.number().positive().optional(),
  maxTrades: z.number().int().positive().optional(),
  minR: z.number().optional(),
  theme: z.enum(["light", "dark"]).optional(),
  onboardingSeen: z.boolean().optional(),
});

export async function updateUserSettings(input: z.input<typeof updateSchema>) {
  const userId = await requireUser();
  const data = updateSchema.parse(input);

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  revalidatePath("/settings");
  return serialize(settings);
}
