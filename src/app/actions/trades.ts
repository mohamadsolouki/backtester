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
  ruleBreaks: z.array(z.object({
    rule: z.string(),
    severity: z.number().int().min(1).max(5).default(1),
    description: z.string().optional(),
  })).optional(),
});

export async function createTrade(input: z.infer<typeof createTradeSchema>) {
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
    },
    include: { ruleBreaks: true, review: true, screenshots: true, opportunity: true },
    orderBy: { openedAt: "desc" },
  });
}

export async function getTrade(id: string) {
  const userId = await requireUser();
  return prisma.trade.findFirst({
    where: { id, userId },
    include: { ruleBreaks: true, review: true, screenshots: true, opportunity: true },
  });
}

export async function updateTrade(id: string, input: Partial<z.infer<typeof createTradeSchema>>) {
  const userId = await requireUser();
  const existing = await prisma.trade.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Not found");

  const trade = await prisma.trade.update({
    where: { id },
    data: {
      ...(input.ticker ? { ticker: input.ticker.toUpperCase() } : {}),
      ...(input.direction ? { direction: input.direction } : {}),
      ...(input.sessionName ? { sessionName: input.sessionName } : {}),
      ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
      ...(input.entryPrice !== undefined ? { entryPrice: input.entryPrice } : {}),
      ...(input.exitPrice !== undefined ? { exitPrice: input.exitPrice } : {}),
      ...(input.rMultiple !== undefined ? { rMultiple: input.rMultiple } : {}),
      ...(input.pnl !== undefined ? { pnl: input.pnl } : {}),
      ...(input.fees !== undefined ? { fees: input.fees } : {}),
      ...(input.openedAt ? { openedAt: input.openedAt } : {}),
      ...(input.closedAt ? { closedAt: input.closedAt } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  revalidatePath("/journal");
  revalidatePath("/analytics");
  revalidatePath("/");
  return trade;
}

export async function deleteTrade(id: string) {
  const userId = await requireUser();
  await prisma.trade.delete({ where: { id, userId } });
  revalidatePath("/journal");
  revalidatePath("/analytics");
  revalidatePath("/");
}

export async function bulkCreateTrades(trades: z.infer<typeof createTradeSchema>[]) {
  const userId = await requireUser();
  const results = [];

  for (const input of trades) {
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
      },
    });
    results.push(trade);
  }

  const batch = await prisma.importBatch.create({
    data: {
      userId,
      fileName: "metatrader-import",
      fileType: "metatrader",
      rowCount: trades.length,
      validRows: results.length,
      errorRows: trades.length - results.length,
      mapping: {},
    },
  });

  revalidatePath("/journal");
  revalidatePath("/analytics");
  revalidatePath("/import");
  revalidatePath("/");
  return { trades: results, batch };
}

export async function getTradeStats() {
  const userId = await requireUser();
  const trades = await prisma.trade.findMany({
    where: { userId, status: "CLOSED" },
    select: { rMultiple: true, pnl: true, openedAt: true, direction: true, ticker: true, sessionName: true },
    orderBy: { openedAt: "asc" },
  });

  const rValues = trades.map(t => Number(t.rMultiple));
  const pnlValues = trades.map(t => Number(t.pnl));
  const wins = rValues.filter(r => r > 0);
  const losses = rValues.filter(r => r < 0);
  const grossProfit = wins.reduce((s, r) => s + r, 0);
  const grossLoss = Math.abs(losses.reduce((s, r) => s + r, 0));

  let equity = 0;
  let maxEquity = 0;
  let maxDrawdown = 0;
  const equityCurve = trades.map(t => {
    equity += Number(t.pnl);
    maxEquity = Math.max(maxEquity, equity);
    maxDrawdown = Math.min(maxDrawdown, equity - maxEquity);
    return { date: t.openedAt.toISOString().slice(0, 10), equity, pnl: Number(t.pnl) };
  });

  return {
    totalTrades: trades.length,
    winRate: trades.length ? wins.length / trades.length : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    expectancy: trades.length ? rValues.reduce((s, r) => s + r, 0) / trades.length : 0,
    avgR: trades.length ? rValues.reduce((s, r) => s + r, 0) / trades.length : 0,
    totalPnl: pnlValues.reduce((s, p) => s + p, 0),
    maxDrawdown,
    equityCurve,
    ruleBreakCount: 0,
  };
}
