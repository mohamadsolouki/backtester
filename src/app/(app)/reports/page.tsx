import { getTrades } from "@/app/actions/trades";
import { ReportsView } from "@/components/modules/reports";
import { parseDateRangeSearchParams, sessionsToDbValues, type DateRangeSearchParams } from "@/lib/date-range";
import type { SessionName as DbSessionName } from "@prisma/client";

export default async function ReportsPage({
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

  return <ReportsView trades={JSON.parse(JSON.stringify(trades))} />;
}
