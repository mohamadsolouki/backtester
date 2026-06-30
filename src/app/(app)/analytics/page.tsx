import { getTrades } from "@/app/actions/trades";
import { AnalyticsView } from "@/components/modules/analytics";
import { parseDateRangeSearchParams, sessionsToDbValues, type DateRangeSearchParams } from "@/lib/date-range";
import type { SessionName as DbSessionName } from "@prisma/client";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<DateRangeSearchParams>;
}) {
  const { range, sessions } = parseDateRangeSearchParams(await searchParams);

  const trades = await getTrades({
    from: range.from,
    to: range.to,
    status: "CLOSED",
    sessionNames: sessionsToDbValues(sessions) as DbSessionName[],
  });

  return <AnalyticsView trades={JSON.parse(JSON.stringify(trades.slice().reverse()))} />;
}
