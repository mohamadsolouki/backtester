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

const platformEnum = z.enum([
  "MT4",
  "MT5",
  "CTRADER",
  "TRADINGVIEW",
  "BINANCE",
  "BYBIT",
  "OTHER",
]);

const accountSchema = z.object({
  name: z.string().min(1).max(60),
  platform: platformEnum.default("MT5"),
  currency: z.string().min(3).max(10).default("USD"),
  startingBalance: z.number().min(0).default(0),
});

export type TradePlatformName = z.infer<typeof platformEnum>;

function revalidateAccountPaths() {
  revalidatePath("/settings");
  revalidatePath("/journal");
  revalidatePath("/import");
  revalidatePath("/analytics");
  revalidatePath("/");
}

export async function getTradingAccounts() {
  const userId = await requireUser();
  return prisma.tradingAccount.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { trades: true } } },
  });
}

/** Account list plus cumulative P&L so equity can be shown anywhere. */
export async function getAccountsWithEquity() {
  const userId = await requireUser();
  const accounts = await prisma.tradingAccount.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "asc" },
  });
  const pnl = await prisma.trade.groupBy({
    by: ["accountId"],
    where: { userId, accountId: { not: null }, status: "CLOSED" },
    _sum: { pnl: true, fees: true },
    _count: true,
  });
  const byAccount = new Map(pnl.map((row) => [row.accountId, row]));
  return accounts.map((account) => {
    const row = byAccount.get(account.id);
    const netPnl = Number(row?._sum.pnl ?? 0) - Number(row?._sum.fees ?? 0);
    return {
      ...account,
      tradeCount: row?._count ?? 0,
      netPnl,
      equity: Number(account.startingBalance) + netPnl,
    };
  });
}

export async function createTradingAccount(
  input: z.input<typeof accountSchema>,
) {
  const userId = await requireUser();
  const data = accountSchema.parse(input);
  const account = await prisma.tradingAccount.upsert({
    where: { userId_name: { userId, name: data.name } },
    update: { ...data, active: true },
    create: { userId, ...data },
  });
  revalidateAccountPaths();
  return account;
}

export async function updateTradingAccount(
  id: string,
  input: Partial<z.input<typeof accountSchema>>,
) {
  const userId = await requireUser();
  const existing = await prisma.tradingAccount.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new Error("Not found");
  const data = accountSchema.partial().parse(input);
  const account = await prisma.tradingAccount.update({
    where: { id },
    data,
  });
  revalidateAccountPaths();
  return account;
}

/** Soft-delete: keeps historical trades linked, hides the account from pickers. */
export async function archiveTradingAccount(id: string) {
  const userId = await requireUser();
  const existing = await prisma.tradingAccount.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new Error("Not found");
  await prisma.tradingAccount.update({
    where: { id },
    data: { active: false },
  });
  revalidateAccountPaths();
}
