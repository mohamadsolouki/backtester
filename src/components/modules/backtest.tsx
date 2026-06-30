"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Surface, SectionTitle, ModuleShell, EmptyState } from "@/components/ui";
import { formatPercent, cn } from "@/lib/utils";
import { Upload } from "lucide-react";

type SerializedTrade = {
  id: string;
  ticker: string;
  rMultiple: string | number;
  pnl: string | number;
  openedAt: string;
  opportunity: { contextTags: { name: string; enabled: boolean }[] } | null;
};

export function BacktestView({ trades }: { trades: SerializedTrade[] }) {
  const contextMatrix = useMemo(() => {
    const byTag: Record<string, { wins: number; total: number; rSum: number }> = {};
    trades.forEach((t) => {
      const tags = t.opportunity?.contextTags.filter((tag) => tag.enabled) ?? [];
      tags.forEach((tag) => {
        if (!byTag[tag.name]) byTag[tag.name] = { wins: 0, total: 0, rSum: 0 };
        byTag[tag.name].total += 1;
        byTag[tag.name].rSum += Number(t.rMultiple);
        if (Number(t.rMultiple) > 0) byTag[tag.name].wins += 1;
      });
    });
    return Object.entries(byTag)
      .map(([tag, data]) => ({
        tag: tag.replace(/_/g, " "),
        winRate: data.total ? data.wins / data.total : 0,
        expectancy: data.total ? data.rSum / data.total : 0,
        samples: data.total,
      }))
      .sort((a, b) => b.expectancy - a.expectancy);
  }, [trades]);

  return (
    <ModuleShell
      title="Edge Lab"
      description="Context performance computed from trades linked to graded opportunities."
      actions={
        <Link
          href="/import"
          className="flex h-9 items-center gap-2 rounded-md border border-[var(--teal)]/40 bg-[var(--panel)] px-3 text-[12px] font-semibold text-[var(--teal-dark)] hover:bg-[var(--panel-soft)]"
        >
          <Upload className="h-3.5 w-3.5" />
          Import Trades
        </Link>
      }
    >
      {contextMatrix.length === 0 ? (
        <EmptyState
          title="No context-tagged trades yet"
          description="Link trades to opportunities with context tags to see which setups actually perform best."
        />
      ) : (
        <Surface>
          <SectionTitle>Context Performance Matrix</SectionTitle>
          <div className="mt-3 grid grid-cols-2 gap-2 max-[768px]:grid-cols-1">
            {contextMatrix.map((row) => (
              <div key={row.tag} className="rounded-md border border-[var(--line)] p-3 text-[12px]">
                <div className="flex items-center justify-between font-semibold">
                  <span>{row.tag}</span>
                  <span className={cn(row.expectancy >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                    {row.expectancy >= 0 ? "+" : ""}{row.expectancy.toFixed(2)}R
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[var(--muted)]">
                  <span>Win Rate {formatPercent(row.winRate)}</span>
                  <span>{row.samples < 20 ? "⚠ " : ""}Samples {row.samples}</span>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}
    </ModuleShell>
  );
}
