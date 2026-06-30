"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionName as DbSessionName, SkipReason } from "@prisma/client";
import { z } from "zod";
import { getContextTagDefinitions } from "@/app/actions/vocab";

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

const createSchema = z.object({
  ticker: z.string().min(1).max(20),
  pair: z.string().optional(),
  setupName: z.string().min(1),
  market: z.string().default("Futures"),
  bias: z.string().min(1),
  primaryContext: z.string().min(1),
  sessionName: z.enum(["PRE_MARKET", "OPEN", "MIDDAY", "CLOSE", "POST_MARKET"]),
  riskReward: z.number().optional(),
  notes: z.string().optional(),
});

/** Contrarian context tags count against confirmation; everything else counts for it. */
const NEGATIVE_WEIGHT_TAGS = new Set(["Trading Range"]);

export async function createOpportunity(input: z.input<typeof createSchema>) {
  const userId = await requireUser();
  const data = createSchema.parse(input);

  const tagDefinitions = await getContextTagDefinitions();

  const opportunity = await prisma.opportunity.create({
    data: {
      userId,
      ticker: data.ticker.toUpperCase(),
      pair: data.pair ?? data.ticker.toUpperCase(),
      setupName: data.setupName,
      market: data.market,
      bias: data.bias,
      primaryContext: data.primaryContext,
      sessionName: data.sessionName,
      status: "WATCHING",
      riskReward: data.riskReward,
      notes: data.notes,
      contextTags: {
        create: tagDefinitions.map((tag) => ({
          name: tag.name,
          weight: NEGATIVE_WEIGHT_TAGS.has(tag.name) ? -1 : 1,
        })),
      },
      entries: {
        create: [
          { type: "E1", status: "WAITING" },
          { type: "E2", status: "WAITING" },
          { type: "E3", status: "WAITING" },
        ],
      },
    },
  });

  revalidatePath("/opportunities");
  revalidatePath("/");
  return opportunity;
}

export async function getOpportunities(filters?: {
  from?: Date;
  to?: Date;
  sessionNames?: DbSessionName[];
}) {
  const userId = await requireUser();
  return prisma.opportunity.findMany({
    where: {
      userId,
      ...(filters?.from || filters?.to
        ? {
            plannedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters?.sessionNames?.length ? { sessionName: { in: filters.sessionNames } } : {}),
    },
    include: { contextTags: true, entries: true, trade: true, review: true },
    orderBy: { plannedAt: "desc" },
  });
}

export async function getOpportunity(id: string) {
  const userId = await requireUser();
  return prisma.opportunity.findFirst({
    where: { id, userId },
    include: { contextTags: true, entries: true, trade: true, review: true, screenshots: true },
  });
}

export async function updateOpportunityStatus(id: string, status: "PLANNED" | "WATCHING" | "TAKEN" | "SKIPPED" | "NOT_FORMED" | "REVIEWED") {
  const userId = await requireUser();
  const opportunity = await prisma.opportunity.update({
    where: { id, userId },
    data: {
      status,
      ...(status === "TAKEN" ? { takenAt: new Date() } : {}),
    },
  });
  revalidatePath("/opportunities");
  revalidatePath("/");
  return opportunity;
}

export async function toggleContextTag(opportunityId: string, tagId: string) {
  const userId = await requireUser();
  const opp = await prisma.opportunity.findFirst({ where: { id: opportunityId, userId } });
  if (!opp) throw new Error("Not found");

  const tag = await prisma.contextTag.findUnique({ where: { id: tagId } });
  if (!tag || tag.opportunityId !== opportunityId) throw new Error("Not found");

  await prisma.contextTag.update({
    where: { id: tagId },
    data: { enabled: !tag.enabled },
  });

  const tags = await prisma.contextTag.findMany({ where: { opportunityId } });
  const confirmations = tags.reduce((sum, t) => sum + (t.enabled ? t.weight : 0), 0);

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: { confirmationCount: confirmations },
  });

  revalidatePath("/opportunities");
  revalidatePath("/");
  return { confirmations };
}

export async function updateEntry(
  opportunityId: string,
  entryType: "E1" | "E2" | "E3",
  status: "TAKEN" | "SKIPPED" | "NOT_FORMED" | "WAITING",
  skipReason?: SkipReason
) {
  const userId = await requireUser();
  const opp = await prisma.opportunity.findFirst({ where: { id: opportunityId, userId } });
  if (!opp) throw new Error("Not found");

  await prisma.entry.update({
    where: { opportunityId_type: { opportunityId, type: entryType } },
    data: {
      status,
      skipReason: status === "SKIPPED" && skipReason ? skipReason : null,
    },
  });

  if (status === "TAKEN") {
    await prisma.opportunity.update({ where: { id: opportunityId }, data: { status: "TAKEN", takenAt: new Date() } });
  }

  revalidatePath("/opportunities");
  revalidatePath("/");
}

export async function updateOpportunityNotes(id: string, notes: string) {
  const userId = await requireUser();
  await prisma.opportunity.update({
    where: { id, userId },
    data: { notes },
  });
  revalidatePath("/opportunities");
}

export async function deleteOpportunity(id: string) {
  const userId = await requireUser();
  await prisma.opportunity.delete({ where: { id, userId } });
  revalidatePath("/opportunities");
  revalidatePath("/");
}
