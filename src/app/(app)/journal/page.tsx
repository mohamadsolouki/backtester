import { getTrades } from "@/app/actions/trades";
import { getDistinctTickers, getRuleBreakDefinitions } from "@/app/actions/vocab";
import { JournalView } from "@/components/modules/journal";
import { parseDateRangeSearchParams, sessionsToDbValues, type DateRangeSearchParams } from "@/lib/date-range";
import type { SessionName as DbSessionName } from "@prisma/client";

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<DateRangeSearchParams>;
}) {
  const { range, sessions } = parseDateRangeSearchParams(await searchParams);

  const [trades, tickers, ruleBreakDefinitions] = await Promise.all([
    getTrades({
      from: range.from,
      to: range.to,
      sessionNames: sessionsToDbValues(sessions) as DbSessionName[],
    }),
    getDistinctTickers(),
    getRuleBreakDefinitions(),
  ]);

  return (
    <JournalView
      trades={JSON.parse(JSON.stringify(trades))}
      tickerOptions={tickers}
      ruleBreakOptions={ruleBreakDefinitions.map((d) => d.name)}
    />
  );
}
