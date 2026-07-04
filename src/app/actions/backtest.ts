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

const candleSchema = z.object({
  t: z.number(),
  o: z.number().positive(),
  h: z.number().positive(),
  l: z.number().positive(),
  c: z.number().positive(),
  v: z.number().optional(),
});

const seriesSchema = z.object({
  symbol: z.string().min(1).max(20),
  timeframe: z.string().min(1).max(10),
  candles: z.array(candleSchema).min(10).max(50_000),
});

export async function savePriceSeries(input: z.input<typeof seriesSchema>) {
  const userId = await requireUser();
  const data = seriesSchema.parse(input);
  const series = await prisma.priceSeries.create({
    data: {
      userId,
      symbol: data.symbol.toUpperCase(),
      timeframe: data.timeframe,
      candles: data.candles as Prisma.InputJsonValue,
      candleCount: data.candles.length,
      startsAt: new Date(data.candles[0].t),
      endsAt: new Date(data.candles[data.candles.length - 1].t),
    },
  });
  revalidatePath("/lab");
  return { id: series.id };
}

export async function getPriceSeriesList() {
  const userId = await requireUser();
  return prisma.priceSeries.findMany({
    where: { userId },
    select: {
      id: true,
      symbol: true,
      timeframe: true,
      candleCount: true,
      startsAt: true,
      endsAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPriceSeriesCandles(id: string) {
  const userId = await requireUser();
  const series = await prisma.priceSeries.findFirst({
    where: { id, userId },
    select: { candles: true },
  });
  if (!series) throw new Error("Not found");
  return series.candles;
}

export async function deletePriceSeries(id: string) {
  const userId = await requireUser();
  await prisma.priceSeries.deleteMany({ where: { id, userId } });
  revalidatePath("/lab");
}

const runSchema = z.object({
  seriesId: z.string(),
  strategy: z.string().max(40),
  params: z.record(z.string(), z.union([z.string(), z.number()])),
  metrics: z.record(z.string(), z.union([z.string(), z.number(), z.null()])),
});

export async function saveBacktestRun(input: z.input<typeof runSchema>) {
  const userId = await requireUser();
  const data = runSchema.parse(input);
  const series = await prisma.priceSeries.findFirst({
    where: { id: data.seriesId, userId },
    select: { id: true },
  });
  if (!series) throw new Error("Series not found");
  const run = await prisma.backtestRun.create({
    data: {
      userId,
      seriesId: data.seriesId,
      strategy: data.strategy,
      params: data.params as Prisma.InputJsonValue,
      metrics: data.metrics as Prisma.InputJsonValue,
    },
  });
  revalidatePath("/lab");
  return { id: run.id };
}

export async function getBacktestRuns() {
  const userId = await requireUser();
  return prisma.backtestRun.findMany({
    where: { userId },
    include: { series: { select: { symbol: true, timeframe: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
