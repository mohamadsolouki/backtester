import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@playbookos.app";
const DEMO_PASSWORD = "DemoTrader2026!";

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD, 12);

  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log("Demo user already exists, wiping and reseeding their data...");
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: { name: "Demo Trader", email: DEMO_EMAIL, passwordHash },
  });

  const playbook = await prisma.playbookSetup.create({
    data: {
      userId: user.id,
      name: "Momentum Break",
      context: "Trend alignment with breakout after compression.",
      active: true,
      validConditions: ["Price above 20 EMA", "Strong momentum, ATR > 1.2x 20", "Relative strength greater than market"],
      invalidConditions: ["Price below 50 EMA", "Within prior day's value area", "News within 30 minutes"],
      entryLogic: "E1: Break of high + close above\nE2: Pullback to 20 EMA + hold\nE3: New high + momentum expansion",
      exitLogic: "Scale at 1R / 2R\nTrail below 20 EMA\nTime exit if no follow-through by EOD",
    },
  });

  await prisma.playbookSetup.create({
    data: {
      userId: user.id,
      name: "Bull Flag",
      context: "Impulse leg, controlled pullback, then continuation trigger.",
      active: true,
      validConditions: ["Impulse leg is clean", "Pullback holds above midpoint", "Volume dries up on pullback"],
      invalidConditions: ["Flag retraces more than 70%", "Entry is far from EMA", "Market internals diverge"],
      entryLogic: "E1: Break flag high\nE2: Retest holds\nE3: Add only after new high",
      exitLogic: "Partial at measured move\nScratch under flag low\nNo add after failed breakout",
    },
  });

  const tickers = ["NQ", "ES", "CL", "GC", "RTY"] as const;
  const sessions = ["PRE_MARKET", "OPEN", "MIDDAY", "CLOSE", "POST_MARKET"] as const;
  const setups = ["Momentum Break", "Bull Flag", "Opening Drive", "Trend Continuation", "Rejection + Retest"];
  const tagNames = ["MTR", "BTB", "EMA_DIVERGENCE", "SPIKE", "BREAKOUT", "TRADING_RANGE", "MICRO_CHANNEL"] as const;

  const now = Date.now();
  const trades = [];
  for (let i = 0; i < 24; i++) {
    const daysAgo = Math.floor(i * 1.5);
    const openedAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 6) * 60 * 60 * 1000);
    const direction = Math.random() > 0.4 ? "LONG" : "SHORT";
    const win = Math.random() > 0.42;
    const rMultiple = win ? +(0.8 + Math.random() * 2.4).toFixed(2) : -+(0.4 + Math.random() * 1.2).toFixed(2);
    const entryPrice = 4000 + Math.random() * 16000;
    const pnl = +(rMultiple * (150 + Math.random() * 250)).toFixed(2);
    const ticker = tickers[i % tickers.length];

    trades.push({
      userId: user.id,
      ticker,
      direction: direction as "LONG" | "SHORT",
      status: "CLOSED" as const,
      sessionName: sessions[i % sessions.length],
      quantity: 1 + Math.floor(Math.random() * 3),
      entryPrice,
      exitPrice: entryPrice + (direction === "LONG" ? rMultiple : -rMultiple) * 12,
      rMultiple,
      pnl,
      fees: 4.5,
      openedAt,
      closedAt: new Date(openedAt.getTime() + (20 + Math.random() * 90) * 60 * 1000),
      notes: win
        ? "Followed the plan, clean execution on the trigger."
        : "Entry chased slightly late, stop placement could be tighter next time.",
    });
  }

  for (const t of trades) {
    const trade = await prisma.trade.create({ data: t });
    if (Math.random() > 0.8) {
      await prisma.ruleBreak.create({
        data: {
          tradeId: trade.id,
          rule: "Moved stop loss after entry",
          severity: 2,
          description: "Widened stop mid-trade instead of accepting the original risk.",
        },
      });
    }
    if (Math.random() > 0.5) {
      await prisma.review.create({
        data: {
          userId: user.id,
          tradeId: trade.id,
          score: Number(t.rMultiple) > 0 ? 8 : 4,
          lesson: Number(t.rMultiple) > 0
            ? "Patience on the E2 confirmation paid off — waited for the retest instead of chasing."
            : "Sized in too early before the second confirmation; wait for full context next time.",
          actionItem: "Review entry timing against the playbook checklist before the next session.",
        },
      });
    }
  }

  for (let i = 0; i < 6; i++) {
    const enabledTags = tagNames.filter(() => Math.random() > 0.5);
    const confirmations = enabledTags.reduce((sum, t) => sum + (t === "TRADING_RANGE" ? -1 : 1), 0);
    const grades = ["A_PLUS", "A", "A_MINUS", "B_PLUS", "B", "C"] as const;

    await prisma.opportunity.create({
      data: {
        userId: user.id,
        ticker: tickers[i % tickers.length],
        pair: tickers[i % tickers.length],
        setupName: setups[i % setups.length],
        market: "Futures",
        bias: i % 2 === 0 ? "Bullish" : "Bearish",
        primaryContext: "Trend continuation above the 20 EMA with supportive internals.",
        sessionName: sessions[i % sessions.length],
        status: i < 2 ? "WATCHING" : i < 4 ? "TAKEN" : "SKIPPED",
        confirmationCount: confirmations,
        grade: grades[Math.min(grades.length - 1, Math.max(0, 5 - confirmations))],
        riskReward: +(1.2 + Math.random() * 1.6).toFixed(1),
        notes: "Watching for the second confirmation before committing size.",
        contextTags: {
          create: tagNames.map((name) => ({
            name,
            enabled: enabledTags.includes(name),
            weight: name === "TRADING_RANGE" ? -1 : 1,
          })),
        },
        entries: {
          create: [
            { type: "E1", status: i < 4 ? "TAKEN" : "WAITING" },
            { type: "E2", status: i < 3 ? "TAKEN" : "WAITING" },
            { type: "E3", status: "WAITING" },
          ],
        },
      },
    });
  }

  await prisma.sOPDocument.create({
    data: {
      userId: user.id,
      title: "Daily Trading SOP",
      versions: {
        create: {
          version: "1.0.0",
          changeLog: "Initial demo SOP",
          content: {
            groups: [
              {
                title: "Prepare",
                items: [
                  { label: "Review overnight action", checked: true },
                  { label: "Mark key levels", checked: true },
                  { label: "Check economic calendar", checked: true },
                  { label: "Plan high-quality setups", checked: false },
                ],
              },
              {
                title: "Execute",
                items: [
                  { label: "Trade only playbook setups", checked: true },
                  { label: "Follow E1/E2/E3 plan", checked: true },
                  { label: "Manage risk per rules", checked: false },
                  { label: "No overtrading", checked: false },
                ],
              },
              {
                title: "Review",
                items: [
                  { label: "Log every trade", checked: true },
                  { label: "Grade every opportunity", checked: false },
                  { label: "Note lessons learned", checked: false },
                ],
              },
            ],
          },
        },
      },
    },
  });

  console.log(`Seeded demo user ${DEMO_EMAIL} with playbook ${playbook.id}, ${trades.length} trades, 6 opportunities, and an SOP.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
