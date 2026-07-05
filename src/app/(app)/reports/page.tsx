import { getTrades } from "@/app/actions/trades";
import { getReports } from "@/app/actions/reports";
import { ReportsView } from "@/components/modules/reports";
import { parseDateRangeSearchParams, sessionsToDbValues, type DateRangeSearchParams } from "@/lib/date-range";
import type { SessionName as DbSessionName } from "@prisma/client";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<DateRangeSearchParams>;
}) {
  const { range, sessions } = parseDateRangeSearchParams(await searchParams);

  const [trades, savedReports] = await Promise.all([
    getTrades({
      from: range.from,
      to: range.to,
      status: "CLOSED",
      sessionNames: sessionsToDbValues(sessions) as DbSessionName[],
    }),
    getReports(),
  ]);

  return (
    <ReportsView
      trades={JSON.parse(JSON.stringify(trades))}
      savedReports={JSON.parse(JSON.stringify(savedReports))}
    />
  );
}
