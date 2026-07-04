/**
 * TradingView alert webhook.
 *
 * Point a TradingView alert at:
 *   POST /api/webhooks/tradingview?token=YOUR_TOKEN
 * with a JSON message like:
 *   { "ticker": "{{ticker}}", "action": "buy", "price": {{close}},
 *     "qty": 1, "sl": 0, "tp": 0, "comment": "EMA cross", "account": "FTMO 100k" }
 *
 * action: "buy" | "sell" opens a trade, "close" closes the most recent open
 * trade for that ticker (computing P&L and R from the recorded stop).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { SessionName } from "@prisma/client";

const payloadSchema = z.object({
  ticker: z.string().min(1).max(20),
  action: z.enum(["buy", "sell", "close"]),
  price: z.coerce.number().positive(),
  qty: z.coerce.number().positive().optional(),
  sl: z.coerce.number().nonnegative().optional(),
  tp: z.coerce.number().nonnegative().optional(),
  comment: z.string().max(500).optional(),
  account: z.string().max(60).optional(),
  time: z.coerce.date().optional(),
});

function sessionFromHour(date: Date): SessionName {
  const hour = date.getUTCHours();
  if (hour < 7) return "PRE_MARKET";
  if (hour < 10) return "OPEN";
  if (hour < 14) return "MIDDAY";
  if (hour < 17) return "CLOSE";
  return "POST_MARKET";
}

export async function POST(request: NextRequest) {
  const token =
    request.nextUrl.searchParams.get("token") ??
    request.headers.get("x-webhook-token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const settings = await prisma.userSettings.findUnique({
    where: { webhookToken: token },
    select: { userId: true },
  });
  if (!settings) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const userId = settings.userId;

  let payload: z.infer<typeof payloadSchema>;
  try {
    payload = payloadSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid payload", detail: String(error) },
      { status: 400 },
    );
  }

  const ticker = payload.ticker.toUpperCase();
  const at = payload.time ?? new Date();

  if (payload.action === "close") {
    const open = await prisma.trade.findFirst({
      where: { userId, ticker, status: "OPEN" },
      orderBy: { openedAt: "desc" },
    });
    if (!open) {
      return NextResponse.json(
        { error: `No open trade found for ${ticker}` },
        { status: 404 },
      );
    }
    const entry = Number(open.entryPrice);
    const qty = Number(open.quantity ?? 1);
    const sign = open.direction === "LONG" ? 1 : -1;
    const pnl = (payload.price - entry) * qty * sign;
    const stop = open.stopPrice ? Number(open.stopPrice) : null;
    const riskPerUnit = stop ? Math.abs(entry - stop) : null;
    const rMultiple = riskPerUnit
      ? ((payload.price - entry) * sign) / riskPerUnit
      : 0;

    const closed = await prisma.trade.update({
      where: { id: open.id },
      data: {
        exitPrice: payload.price,
        closedAt: at,
        status: "CLOSED",
        pnl: Math.round(pnl * 100) / 100,
        rMultiple: Math.round(rMultiple * 100) / 100,
        notes: payload.comment
          ? `${open.notes ? `${open.notes}\n` : ""}${payload.comment}`
          : open.notes,
      },
    });
    return NextResponse.json({ ok: true, closed: closed.id });
  }

  // buy / sell → open a trade
  let accountId: string | undefined;
  if (payload.account) {
    const account = await prisma.tradingAccount.findFirst({
      where: { userId, name: payload.account, active: true },
      select: { id: true },
    });
    accountId = account?.id;
  }

  const trade = await prisma.trade.create({
    data: {
      userId,
      accountId,
      ticker,
      direction: payload.action === "buy" ? "LONG" : "SHORT",
      status: "OPEN",
      sessionName: sessionFromHour(at),
      quantity: payload.qty ?? 1,
      entryPrice: payload.price,
      stopPrice: payload.sl || undefined,
      takeProfit: payload.tp || undefined,
      rMultiple: 0,
      pnl: 0,
      openedAt: at,
      notes: payload.comment
        ? `[TradingView] ${payload.comment}`
        : "[TradingView] alert",
    },
  });

  return NextResponse.json({ ok: true, opened: trade.id });
}
