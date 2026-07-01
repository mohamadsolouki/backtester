"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Plus, Trash2, X } from "lucide-react";
import { Surface, SectionTitle, ModuleShell, NumberField, ActionButton, Segmented } from "@/components/ui";
import { updateUserSettings } from "@/app/actions/settings";
import { clearAllTrades } from "@/app/actions/trades";
import {
  createContextTagDefinition,
  createRuleBreakDefinition,
  deactivateContextTagDefinition,
  deactivateRuleBreakDefinition,
} from "@/app/actions/vocab";

type UserSettingsData = {
  riskPerTrade: string | number;
  maxDailyLoss: string | number;
  maxOpenRisk: string | number;
  maxTrades: string | number;
  minR: string | number;
};

type VocabItem = { id: string; name: string };

const LEGACY_STORAGE_KEY = "tip-risk-settings";

export function SettingsView({
  initialSettings,
  contextTags,
  ruleBreaks,
}: {
  initialSettings: UserSettingsData;
  contextTags: VocabItem[];
  ruleBreaks: VocabItem[];
}) {
  const [tab, setTab] = useState<"General" | "Vocabulary">("General");
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState({
    riskPerTrade: Number(initialSettings.riskPerTrade),
    maxDailyLoss: Number(initialSettings.maxDailyLoss),
    maxOpenRisk: Number(initialSettings.maxOpenRisk),
    maxTrades: Number(initialSettings.maxTrades),
    minR: Number(initialSettings.minR),
  });

  useEffect(() => {
    // One-time migration: pull any pre-existing browser-local risk settings into the
    // account-level record, then clear the legacy key so this never runs again.
    const stored = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) return;
    let parsed: Partial<typeof settings>;
    try {
      parsed = JSON.parse(stored);
    } catch {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings((prev) => ({ ...prev, ...parsed }));
    updateUserSettings(parsed).then(() => {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    });
  }, []);

  function update<K extends keyof typeof settings>(key: K, value: number) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      await updateUserSettings(settings);
      toast.success("Settings saved");
    });
  }

  return (
    <ModuleShell
      title="Settings"
      eyebrow="System"
      description="Risk controls, vocabulary, and platform preferences."
      actions={
        <Segmented value={tab} options={["General", "Vocabulary"]} onChange={(v) => setTab(v as typeof tab)} />
      }
    >
      {tab === "General" ? (
        <div className="space-y-3">
          <Surface>
            <div className="flex items-center justify-between">
              <SectionTitle>Risk Configuration</SectionTitle>
              <ActionButton icon={Check} onClick={save} disabled={pending}>
                {pending ? "Saving..." : "Save Settings"}
              </ActionButton>
            </div>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              Reference values shown across the app — they don&apos;t block trade entry automatically. Synced to your account.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
              <NumberField label="Risk per Trade %" value={settings.riskPerTrade} onChange={(v) => update("riskPerTrade", v)} step="0.05" />
              <NumberField label="Max Daily Loss $" value={settings.maxDailyLoss} onChange={(v) => update("maxDailyLoss", v)} />
              <NumberField label="Max Open Risk %" value={settings.maxOpenRisk} onChange={(v) => update("maxOpenRisk", v)} step="0.1" />
              <NumberField label="Max Trades / Day" value={settings.maxTrades} onChange={(v) => update("maxTrades", v)} />
              <NumberField label="Min R Multiple" value={settings.minR} onChange={(v) => update("minR", v)} step="0.1" />
            </div>
          </Surface>
          <DangerZone />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-[768px]:grid-cols-1">
          <VocabPanel
            title="Context Tags"
            description="Confirmation signals attached to new opportunities for grading."
            items={contextTags}
            onCreate={createContextTagDefinition}
            onRemove={deactivateContextTagDefinition}
          />
          <VocabPanel
            title="Rule Break Reasons"
            description="Behavioral violations selectable when journaling a trade."
            items={ruleBreaks}
            onCreate={createRuleBreakDefinition}
            onRemove={deactivateRuleBreakDefinition}
          />
        </div>
      )}
    </ModuleShell>
  );
}

function DangerZone() {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handleClear() {
    if (!confirm) { setConfirm(true); return; }
    startTransition(async () => {
      await clearAllTrades();
      toast.success("All trades and import history cleared");
      setConfirm(false);
    });
  }

  return (
    <Surface>
      <SectionTitle>Danger Zone</SectionTitle>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        These actions are irreversible. Use them to reset your account to a clean state, e.g. after testing with demo data.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-md border border-[var(--red)]/30 bg-[var(--red)]/5 p-4">
        <div>
          <p className="text-[13px] font-semibold text-[var(--ink)]">Clear all trades &amp; import history</p>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">
            Permanently deletes every trade, rule break, review, and import batch. Opportunities and settings are kept.
          </p>
        </div>
        {confirm ? (
          <div className="ml-4 flex shrink-0 items-center gap-2">
            <button onClick={() => setConfirm(false)} className="h-8 rounded-md border border-[var(--line)] px-3 text-[12px] font-medium">
              Cancel
            </button>
            <button
              onClick={handleClear}
              disabled={pending}
              className="flex h-8 items-center gap-1.5 rounded-md bg-[var(--red)] px-4 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {pending ? "Clearing…" : "Yes, delete all"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleClear}
            className="ml-4 shrink-0 h-8 rounded-md border border-[var(--red)]/40 px-3 text-[12px] font-semibold text-[var(--red)] hover:bg-[var(--red)]/10"
          >
            Clear All Trades
          </button>
        )}
      </div>
    </Surface>
  );
}

function VocabPanel({
  title,
  description,
  items,
  onCreate,
  onRemove,
}: {
  title: string;
  description: string;
  items: VocabItem[];
  onCreate: (name: string) => Promise<{ id: string; name: string }>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [list, setList] = useState(items);

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const created = await onCreate(trimmed);
      setList((prev) => [...prev.filter((i) => i.id !== created.id), created]);
      setName("");
      toast.success(`Added "${trimmed}"`);
    });
  }

  function handleRemove(item: VocabItem) {
    startTransition(async () => {
      await onRemove(item.id);
      setList((prev) => prev.filter((i) => i.id !== item.id));
    });
  }

  return (
    <Surface>
      <SectionTitle>{title}</SectionTitle>
      <p className="mt-1 text-[12px] text-[var(--muted)]">{description}</p>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add new..."
          className="h-9 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] outline-none focus:border-[var(--teal)]"
        />
        <button
          onClick={handleAdd}
          disabled={pending}
          className="flex h-9 items-center gap-1 rounded-md bg-[var(--teal)] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      <div className="mt-3 space-y-1">
        {list.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-md border border-[var(--line)] px-3 py-2 text-[13px]"
          >
            {item.name}
            <button onClick={() => handleRemove(item)} disabled={pending} className="text-[var(--muted)] hover:text-[var(--red)]">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Surface>
  );
}
