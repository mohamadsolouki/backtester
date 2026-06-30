import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function computeEquityCurve(
  trades: { openedAt: string | Date; pnl: string | number }[]
) {
  return trades.reduce<{ rows: { date: string; equity: number; pnl: number }[]; equity: number; maxEquity: number; maxDrawdown: number }>(
    (acc, t) => {
      const equity = acc.equity + Number(t.pnl);
      const maxEquity = Math.max(acc.maxEquity, equity);
      const maxDrawdown = Math.min(acc.maxDrawdown, equity - maxEquity);
      const date = typeof t.openedAt === "string" ? t.openedAt.slice(0, 10) : t.openedAt.toISOString().slice(0, 10);
      return {
        rows: [...acc.rows, { date, equity, pnl: Number(t.pnl) }],
        equity,
        maxEquity,
        maxDrawdown,
      };
    },
    { rows: [], equity: 0, maxEquity: 0, maxDrawdown: 0 }
  );
}
