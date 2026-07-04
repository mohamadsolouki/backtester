import { getAccountsWithEquity } from "@/app/actions/accounts";
import { getTrades } from "@/app/actions/trades";
import { getUserSettings } from "@/app/actions/settings";
import { RiskView } from "@/components/modules/risk";

export default async function RiskPage() {
  const [accounts, trades, settings] = await Promise.all([
    getAccountsWithEquity(),
    getTrades({ status: "CLOSED" }),
    getUserSettings(),
  ]);

  return (
    <RiskView
      accounts={JSON.parse(JSON.stringify(accounts))}
      trades={trades.map((t) => ({
        accountId: t.accountId,
        pnl: Number(t.pnl),
        openedAt: t.openedAt.toISOString(),
      }))}
      defaultRiskPercent={Number(settings.riskPerTrade)}
    />
  );
}
