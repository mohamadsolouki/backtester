"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function getWebhookToken() {
  const userId = await requireUser();
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { webhookToken: true },
  });
  return settings?.webhookToken ?? null;
}

/** Creates or rotates the TradingView webhook token. */
export async function regenerateWebhookToken() {
  const userId = await requireUser();
  const token = randomBytes(24).toString("hex");
  await prisma.userSettings.upsert({
    where: { userId },
    update: { webhookToken: token },
    create: { userId, webhookToken: token },
  });
  revalidatePath("/settings");
  return token;
}

/** Disables webhook ingestion by clearing the token. */
export async function revokeWebhookToken() {
  const userId = await requireUser();
  await prisma.userSettings.update({
    where: { userId },
    data: { webhookToken: null },
  });
  revalidatePath("/settings");
}
