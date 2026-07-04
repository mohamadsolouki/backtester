import { getUserSettings } from "@/app/actions/settings";
import { getContextTagDefinitions, getRuleBreakDefinitions } from "@/app/actions/vocab";
import { getAccountsWithEquity } from "@/app/actions/accounts";
import { SettingsView } from "@/components/modules/settings";

export default async function SettingsPage() {
  const [settings, contextTags, ruleBreaks, accounts] = await Promise.all([
    getUserSettings(),
    getContextTagDefinitions(),
    getRuleBreakDefinitions(),
    getAccountsWithEquity(),
  ]);

  return (
    <SettingsView
      initialSettings={settings}
      contextTags={JSON.parse(JSON.stringify(contextTags))}
      ruleBreaks={JSON.parse(JSON.stringify(ruleBreaks))}
      accounts={JSON.parse(JSON.stringify(accounts))}
    />
  );
}
