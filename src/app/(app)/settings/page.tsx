import { getUserSettings } from "@/app/actions/settings";
import { getContextTagDefinitions, getRuleBreakDefinitions } from "@/app/actions/vocab";
import { SettingsView } from "@/components/modules/settings";

export default async function SettingsPage() {
  const [settings, contextTags, ruleBreaks] = await Promise.all([
    getUserSettings(),
    getContextTagDefinitions(),
    getRuleBreakDefinitions(),
  ]);

  return (
    <SettingsView
      initialSettings={settings}
      contextTags={JSON.parse(JSON.stringify(contextTags))}
      ruleBreaks={JSON.parse(JSON.stringify(ruleBreaks))}
    />
  );
}
