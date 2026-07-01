"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionName as DbSessionName } from "@prisma/client";
import { z } from "zod";
import { getContextTagDefinitions } from "@/app/actions/vocab";

/** Contrarian context tags count against confirmation; everything else counts for it. */
const NEGATIVE_WEIGHT_TAGS = new Set(["Trading Range"]);

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

const createTradeSchema = z.object({
  ticker: z.string().min(1).max(20),
  direction: z.enum(["LONG", "SHORT"]),
  sessionName: z.enum(["PRE_MARKET", "OPEN", "MIDDAY", "CLOSE", "POST_MARKET"]),
  quantity: z.number().positive().optional(),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional(),
  rMultiple: z.number(),
  pnl: z.number(),
  fees: z.number().default(0),
  openedAt: z.coerce.date(),
  closedAt: z.coerce.date().optional(),
  status: z.enum(["OPEN", "CLOSED", "SCRATCH"]).default("CLOSED"),
  notes: z.string().optional(),
  opportunityId: z.string().optional(),
  ruleBreaks: z
    .array(
      z.object({
        rule: z.string(),
        severity: z.number().int().min(1).max(5).default(1),
        description: z.string().optional(),
      }),
    )
    .optional(),
});

export async function createTrade(input: z.input<typeof createTradeSchema>) {
  const userId = await requireUser();
  const data = createTradeSchema.parse(input);

  const trade = await prisma.trade.create({
    data: {
      userId,
      ticker: data.ticker.toUpperCase(),
      direction: data.direction,
      sessionName: data.sessionName,
      quantity: data.quantity,
      entryPrice: data.entryPrice,
      exitPrice: data.exitPrice,
      rMultiple: data.rMultiple,
      pnl: data.pnl,
      fees: data.fees,
      openedAt: data.openedAt,
      closedAt: data.closedAt,
      status: data.status,
      notes: data.notes,
      opportunityId: data.opportunityId || undefined,
      ruleBreaks: data.ruleBreaks?.length
        ? { create: data.ruleBreaks }
        : undefined,
    },
  });

  revalidatePath("/journal");
  revalidatePath("/analytics");
  revalidatePath("/");
  return trade;
}

export async function getTrades(filters?: {
  from?: Date;
  to?: Date;
  ticker?: string;
  direction?: "LONG" | "SHORT";
  status?: "OPEN" | "CLOSED" | "SCRATCH";
  sessionNames?: DbSessionName[];
}) {
  const userId = await requireUser();
  return prisma.trade.findMany({
    where: {
      userId,
      ...(filters?.from || filters?.to
        ? {
            openedAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters?.ticker ? { ticker: filters.ticker } : {}),
      ...(filters?.direction ? { direction: filters.direction } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.sessionNames?.length
        ? { sessionName: { in: filters.sessionNames } }
        : {}),
    },
    include: {
      ruleBreaks: true,
      review: true,
      screenshots: true,
      opportunity: { include: { contextTags: true } },
      contextTags: true,
    },
    orderBy: [{ openedAt: "desc" }, { createdAt: "asc" }],
  });
}

export async function getTrade(id: string) {
  const userId = await requireUser();
  return prisma.trade.findFirst({
    where: { id, userId },
    include: {
      ruleBreaks: true,
      review: true,
      screenshots: true,
      opportunity: { include: { contextTags: true } },
      contextTags: true,
    },
  });
}

/** Lazily seeds a trade's own context tags from the user's tag vocabulary, then returns them. */
export async function ensureTradeContextTags(tradeId: string) {
  const userId = await requireUser();
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId },
  });
  if (!trade) throw new Error("Not found");

  const existing = await prisma.tradeContextTag.findMany({
    where: { tradeId },
    orderBy: { name: "asc" },
  });
  if (existing.length > 0) return existing;

  const tagDefinitions = await getContextTagDefinitions();
  if (tagDefinitions.length === 0) return [];

  await prisma.tradeContextTag.createMany({
    data: tagDefinitions.map((tag) => ({
      tradeId,
      name: tag.name,
      weight: NEGATIVE_WEIGHT_TAGS.has(tag.name) ? -1 : 1,
    })),
    skipDuplicates: true,
  });

  return prisma.tradeContextTag.findMany({
    where: { tradeId },
    orderBy: { name: "asc" },
  });
}

export async function toggleTradeContextTag(tradeId: string, tagId: string) {
  const userId = await requireUser();
  const trade = await prisma.trade.findFirst({
    where: { id: tradeId, userId },
  });
  if (!trade) throw new Error("Not found");

  const tag = await prisma.tradeContextTag.findFirst({
    where: { id: tagId, tradeId },
  });
  if (!tag) throw new Error("Tag not found");

  await prisma.tradeContextTag.update({
    where: { id: tagId },
    data: { enabled: !tag.enabled },
  });
  revalidatePath("/journal");
  revalidatePath("/backtest");
  revalidatePath("/");
}

export async function updateTrade(
  id: string,
  input: Partial<z.infer<typeof createTradeSchema>> & {
    ruleBreaksToAdd?: { rule: string; severity: number }[];
    ruleBreakIdsToRemove?: string[];
  },
) {
  const userId = await requireUser();
  const existing = await prisma.trade.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Not found");

  const { ruleBreaksToAdd, ruleBreakIdsToRemove, ...fields } = input;

  await prisma.$transaction(async (tx) => {
    await tx.trade.update({
      where: { id },
      data: {
        ...(fields.ticker ? { ticker: fields.ticker.toUpperCase() } : {}),
        ...(fields.direction ? { direction: fields.direction } : {}),
        ...(fields.sessionName ? { sessionName: fields.sessionName } : {}),
        ...(fields.quantity !== undefined ? { quantity: fields.quantity } : {}),
        ...(fields.entryPrice !== undefined
          ? { entryPrice: fields.entryPrice }
          : {}),
        ...(fields.exitPrice !== undefined
          ? { exitPrice: fields.exitPrice }
          : {}),
        ...(fields.rMultiple !== undefined
          ? { rMultiple: fields.rMultiple }
          : {}),
        ...(fields.pnl !== undefined ? { pnl: fields.pnl } : {}),
        ...(fields.fees !== undefined ? { fees: fields.fees } : {}),
        ...(fields.openedAt ? { openedAt: fields.openedAt } : {}),
        ...(fields.closedAt ? { closedAt: fields.closedAt } : {}),
        ...(fields.status ? { status: fields.status } : {}),
        ...(fields.notes !== undefined ? { notes: fields.notes } : {}),
      },
    });
    if (ruleBreakIdsToRemove?.length) {
      await tx.ruleBreak.deleteMany({
        where: { id: { in: ruleBreakIdsToRemove }, tradeId: id },
      });
    }
    if (ruleBreaksToAdd?.length) {
      await tx.ruleBreak.createMany({
        data: ruleBreaksToAdd.map((rb) => ({ ...rb, tradeId: id })),
      });
    }
  });

  revalidatePath("/journal");
  revalidatePath("/analytics");
  revalidatePath("/");
}

export async function deleteTrade(id: string) {
  const userId = await requireUser();
  await prisma.trade.delete({ where: { id, userId } });
  revalidatePath("/journal");
  revalidatePath("/analytics");
  revalidatePath("/");
}

export async function clearAllTrades() {
  const userId = await requireUser();
  await prisma.$transaction([
    prisma.trade.deleteMany({ where: { userId } }),
    prisma.importBatch.deleteMany({ where: { userId } }),
  ]);
  revalidatePath("/journal");
  revalidatePath("/analytics");
  revalidatePath("/import");
  revalidatePath("/");
}

export async function checkImportDuplicates(
  candidates: {
    ticker: string;
    direction: "LONG" | "SHORT";
    openedAt: string;
    entryPrice: number;
  }[],
): Promise<boolean[]> {
  const userId = await requireUser();
  const results: boolean[] = [];

  for (const c of candidates) {
    const openedAt = new Date(c.openedAt);
    const existing = await prisma.trade.findFirst({
      where: {
        userId,
        ticker: c.ticker.toUpperCase(),
        direction: c.direction,
        openedAt: {
          gte: new Date(openedAt.getTime() - 60_000),
          lte: new Date(openedAt.getTime() + 60_000),
        },
        entryPrice: {
          gte: c.entryPrice * 0.9999 - 0.001,
          lte: c.entryPrice * 1.0001 + 0.001,
        },
      },
      select: { id: true },
    });
    results.push(!!existing);
  }

  return results;
}

export async function bulkCreateTrades(
  trades: z.input<typeof createTradeSchema>[],
  fileName?: string,
) {
  const userId = await requireUser();
  const results = [];
  let skipped = 0;

  for (const input of trades) {
    const data = createTradeSchema.parse(input);
    // Server-side dedup safety net — same key as checkImportDuplicates
    const duplicate = await prisma.trade.findFirst({
      where: {
        userId,
        ticker: data.ticker.toUpperCase(),
        direction: data.direction,
        openedAt: {
          gte: new Date(data.openedAt.getTime() - 60_000),
          lte: new Date(data.openedAt.getTime() + 60_000),
        },
        entryPrice: {
          gte: Number(data.entryPrice) * 0.9999 - 0.001,
          lte: Number(data.entryPrice) * 1.0001 + 0.001,
        },
      },
      select: { id: true },
    });
    if (duplicate) {
      skipped++;
      continue;
    }

    const trade = await prisma.trade.create({
      data: {
        userId,
        ticker: data.ticker.toUpperCase(),
        direction: data.direction,
        sessionName: data.sessionName,
        quantity: data.quantity,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        rMultiple: data.rMultiple,
        pnl: data.pnl,
        fees: data.fees,
        openedAt: data.openedAt,
        closedAt: data.closedAt,
        status: data.status,
        notes: data.notes,
        opportunityId: data.opportunityId || undefined,
      },
    });
    results.push(trade);
  }

  const batch = await prisma.importBatch.create({
    data: {
      userId,
      fileName: fileName ?? "import",
      fileType: "metatrader",
      rowCount: trades.length,
      validRows: results.length,
      errorRows: skipped,
      mapping: {},
    },
  });

  revalidatePath("/journal");
  revalidatePath("/analytics");
  revalidatePath("/import");
  revalidatePath("/");
  return { trades: results, skipped, batch };
}

export async function getTradeStats() {
  const userId = await requireUser();
  const trades = await prisma.trade.findMany({
    where: { userId, status: "CLOSED" },
    select: {
      rMultiple: true,
      pnl: true,
      openedAt: true,
      direction: true,
      ticker: true,
      sessionName: true,
    },
    orderBy: [{ openedAt: "asc" }, { createdAt: "asc" }],
  });

  const rValues = trades.map((t) => Number(t.rMultiple));
  const pnlValues = trades.map((t) => Number(t.pnl));
  const wins = rValues.filter((r) => r > 0);
  const losses = rValues.filter((r) => r < 0);
  const grossProfit = wins.reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0));

  let equity = 0;
  let maxEquity = 0;
  let maxDrawdown = 0;
  const equityCurve = trades.map((t) => {
    equity += Number(t.pnl);
    maxEquity = Math.max(maxEquity, equity);
    maxDrawdown = Math.min(maxDrawdown, equity - maxEquity);
    return {
      date: t.openedAt.toISOString().slice(0, 10),
      equity,
      pnl: Number(t.pnl),
    };
  });

  return {
    totalTrades: trades.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    profitFactor: grossLoss
      ? grossProfit / grossLoss
      : grossProfit > 0
        ? Infinity
        : 0,
    expectancy: trades.length
      ? rValues.reduce((s, r) => s + r, 0) / trades.length
      : 0,
    avgR: trades.length
      ? rValues.reduce((s, r) => s + r, 0) / trades.length
      : 0,
    totalPnl: pnlValues.reduce((s, p) => s + p, 0),
    maxDrawdown,
    equityCurve,
    ruleBreakCount: 0,
  };
}
