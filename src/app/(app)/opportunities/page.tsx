import { getOpportunities } from "@/app/actions/opportunities";
import { getDistinctPrimaryContexts, getDistinctSetupNames, getDistinctTickers } from "@/app/actions/vocab";
import { OpportunitiesView } from "@/components/modules/opportunities";
import { parseDateRangeSearchParams, sessionsToDbValues, type DateRangeSearchParams } from "@/lib/date-range";
import type { SessionName as DbSessionName } from "@prisma/client";

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<DateRangeSearchParams>;
}) {
  const { range, sessions } = parseDateRangeSearchParams(await searchParams);

  const [opportunities, tickers, setupNames, primaryContexts] = await Promise.all([
    getOpportunities({
      from: range.from,
      to: range.to,
      sessionNames: sessionsToDbValues(sessions) as DbSessionName[],
    }),
    getDistinctTickers(),
    getDistinctSetupNames(),
    getDistinctPrimaryContexts(),
  ]);

  return (
    <OpportunitiesView
      opportunities={JSON.parse(JSON.stringify(opportunities))}
      tickerOptions={tickers}
      setupOptions={setupNames}
      primaryContextOptions={primaryContexts}
    />
  );
}
