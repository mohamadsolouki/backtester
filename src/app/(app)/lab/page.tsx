import { getPriceSeriesList, getBacktestRuns } from "@/app/actions/backtest";
import { BacktestLabView } from "@/components/modules/backtest-lab";

export default async function BacktestLabPage() {
  const [seriesList, runs] = await Promise.all([
    getPriceSeriesList(),
    getBacktestRuns(),
  ]);

  return (
    <BacktestLabView
      seriesList={JSON.parse(JSON.stringify(seriesList))}
      runs={JSON.parse(JSON.stringify(runs))}
    />
  );
}
