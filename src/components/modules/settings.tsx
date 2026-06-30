"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Surface, SectionTitle, ModuleShell, NumberField, ActionButton } from "@/components/ui";
import { Check } from "lucide-react";

type RiskSettings = {
  riskPerTrade: number;
  maxDailyLoss: number;
  maxOpenRisk: number;
  maxTrades: number;
  minR: number;
};

const defaults: RiskSettings = {
  riskPerTrade: 0.75,
  maxDailyLoss: 1500,
  maxOpenRisk: 1.5,
  maxTrades: 4,
  minR: 1.5,
};

function readStoredSettings(): RiskSettings {
  const stored = window.localStorage.getItem("tip-risk-settings");
  if (!stored) return defaults;
  try {
    return { ...defaults, ...JSON.parse(stored) };
  } catch {
    return defaults;
  }
}

export function SettingsView() {
  // Rendered via next/dynamic with ssr:false (see settings/page.tsx), so
  // `window` is always available here on first render — no effect needed.
  const [settings, setSettings] = useState<RiskSettings>(readStoredSettings);

  function update<K extends keyof RiskSettings>(key: K, value: number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    window.localStorage.setItem("tip-risk-settings", JSON.stringify(settings));
    toast.success("Settings saved");
  }

  return (
    <ModuleShell
      title="Settings"
      description="Risk controls and platform preferences."
      actions={<ActionButton icon={Check} onClick={save}>Save Settings</ActionButton>}
    >
      <Surface>
        <SectionTitle>Risk Configuration</SectionTitle>
        <p className="mt-1 text-[12px] text-[#66746f]">
          Stored locally in your browser. These limits are reference values shown across the app — they don&apos;t block trade entry automatically.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <NumberField label="Risk per Trade %" value={settings.riskPerTrade} onChange={(v) => update("riskPerTrade", v)} step="0.05" />
          <NumberField label="Max Daily Loss $" value={settings.maxDailyLoss} onChange={(v) => update("maxDailyLoss", v)} />
          <NumberField label="Max Open Risk %" value={settings.maxOpenRisk} onChange={(v) => update("maxOpenRisk", v)} step="0.1" />
          <NumberField label="Max Trades / Day" value={settings.maxTrades} onChange={(v) => update("maxTrades", v)} />
          <NumberField label="Min R Multiple" value={settings.minR} onChange={(v) => update("minR", v)} step="0.1" />
        </div>
      </Surface>
    </ModuleShell>
  );
}
