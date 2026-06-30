"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contextTagNames } from "@/lib/domain";

const RULE_BREAK_DEFAULTS = [
  "Moved Stop",
  "Oversized Position",
  "Revenge Trade",
  "No Stop Set",
  "Chased Entry",
  "Ignored Setup Rules",
  "Early Exit",
  "FOMO Entry",
  "Held Past Target",
];

async function requireUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

function normalize(name: string) {
  return name.trim();
}

export async function getContextTagDefinitions() {
  const userId = await requireUser();
  const existing = await prisma.contextTagDefinition.count({ where: { userId } });
  if (existing === 0) {
    await prisma.contextTagDefinition.createMany({
      data: contextTagNames.map((name, i) => ({ userId, name, sortOrder: i })),
      skipDuplicates: true,
    });
  }
  return prisma.contextTagDefinition.findMany({
    where: { userId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createContextTagDefinition(name: string) {
  const userId = await requireUser();
  const normalized = normalize(name);
  if (!normalized) throw new Error("Name is required");
  return prisma.contextTagDefinition.upsert({
    where: { userId_name: { userId, name: normalized } },
    update: { active: true },
    create: { userId, name: normalized },
  });
}

export async function deactivateContextTagDefinition(id: string) {
  const userId = await requireUser();
  await prisma.contextTagDefinition.updateMany({ where: { id, userId }, data: { active: false } });
  revalidatePath("/settings");
}

export async function getRuleBreakDefinitions() {
  const userId = await requireUser();
  const existing = await prisma.ruleBreakDefinition.count({ where: { userId } });
  if (existing === 0) {
    await prisma.ruleBreakDefinition.createMany({
      data: RULE_BREAK_DEFAULTS.map((name, i) => ({ userId, name, sortOrder: i })),
      skipDuplicates: true,
    });
  }
  return prisma.ruleBreakDefinition.findMany({
    where: { userId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function createRuleBreakDefinition(name: string) {
  const userId = await requireUser();
  const normalized = normalize(name);
  if (!normalized) throw new Error("Name is required");
  return prisma.ruleBreakDefinition.upsert({
    where: { userId_name: { userId, name: normalized } },
    update: { active: true },
    create: { userId, name: normalized },
  });
}

export async function deactivateRuleBreakDefinition(id: string) {
  const userId = await requireUser();
  await prisma.ruleBreakDefinition.updateMany({ where: { id, userId }, data: { active: false } });
  revalidatePath("/settings");
}

export async function getDistinctTickers() {
  const userId = await requireUser();
  const [trades, opportunities] = await Promise.all([
    prisma.trade.findMany({ where: { userId }, select: { ticker: true }, distinct: ["ticker"] }),
    prisma.opportunity.findMany({ where: { userId }, select: { ticker: true }, distinct: ["ticker"] }),
  ]);
  const tickers = new Set([...trades.map((t) => t.ticker), ...opportunities.map((o) => o.ticker)]);
  return Array.from(tickers).sort();
}

export async function getDistinctSetupNames() {
  const userId = await requireUser();
  const [playbooks, opportunities] = await Promise.all([
    prisma.playbookSetup.findMany({ where: { userId }, select: { name: true }, distinct: ["name"] }),
    prisma.opportunity.findMany({ where: { userId }, select: { setupName: true }, distinct: ["setupName"] }),
  ]);
  const names = new Set([...playbooks.map((p) => p.name), ...opportunities.map((o) => o.setupName)]);
  return Array.from(names).sort();
}

export async function getDistinctPrimaryContexts() {
  const userId = await requireUser();
  const opportunities = await prisma.opportunity.findMany({
    where: { userId, primaryContext: { not: "" } },
    select: { primaryContext: true },
    distinct: ["primaryContext"],
  });
  return opportunities.map((o) => o.primaryContext).sort();
}
