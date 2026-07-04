"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Plus, Trash2, Wallet, X } from "lucide-react";
import { Surface, SectionTitle, ModuleShell, NumberField, ActionButton, Segmented } from "@/components/ui";
import { updateUserSettings } from "@/app/actions/settings";
import { clearAllTrades } from "@/app/actions/trades";
import {
  createTradingAccount,
  archiveTradingAccount,
  type TradePlatformName,
} from "@/app/actions/accounts";
import { formatCurrency } from "@/lib/utils";
import { platformLabels } from "@/lib/domain";
import {
  createContextTagDefinition,
  createRuleBreakDefinition,
  deactivateContextTagDefinition,
  deactivateRuleBreakDefinition,
} from "@/app/actions/vocab";
import { useI18n } from "@/components/layout/i18n-provider";

type UserSettingsData = {
  riskPerTrade: string | number;
  maxDailyLoss: string | number;
  maxOpenRisk: string | number;
  maxTrades: string | number;
  minR: string | number;
};

type VocabItem = { id: string; name: string };

type AccountItem = {
  id: string;
  name: string;
  platform: string;
  currency: string;
  startingBalance: string | number;
  tradeCount: number;
  netPnl: number;
  equity: number;
};

const PLATFORMS: TradePlatformName[] = [
  "MT4",
  "MT5",
  "CTRADER",
  "TRADINGVIEW",
  "BINANCE",
  "BYBIT",
  "OTHER",
];

const LEGACY_STORAGE_KEY = "tip-risk-settings";

export function SettingsView({
  initialSettings,
  contextTags,
  ruleBreaks,
  accounts,
}: {
  initialSettings: UserSettingsData;
  contextTags: VocabItem[];
  ruleBreaks: VocabItem[];
  accounts: AccountItem[];
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"General" | "Accounts" | "Vocabulary">("General");
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
      toast.success(t("Settings saved"));
    });
  }

  return (
    <ModuleShell
      title={t("Settings")}
      eyebrow={t("System")}
      description={t("Risk controls, vocabulary, and platform preferences.")}
      actions={
        <Segmented value={tab} options={["General", "Accounts", "Vocabulary"]} onChange={(v) => setTab(v as typeof tab)} />
      }
    >
      {tab === "Accounts" ? (
        <AccountsPanel accounts={accounts} />
      ) : tab === "General" ? (
        <div className="space-y-3">
          <Surface>
            <div className="flex items-center justify-between">
              <SectionTitle>{t("Risk Configuration")}</SectionTitle>
              <ActionButton icon={Check} onClick={save} disabled={pending}>
                {pending ? t("Saving...") : t("Save Settings")}
              </ActionButton>
            </div>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              {t("Reference values shown across the app — they don't block trade entry automatically. Synced to your account.")}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
              <NumberField label={t("Risk per Trade %")} value={settings.riskPerTrade} onChange={(v) => update("riskPerTrade", v)} step="0.05" />
              <NumberField label={t("Max Daily Loss $")} value={settings.maxDailyLoss} onChange={(v) => update("maxDailyLoss", v)} />
              <NumberField label={t("Max Open Risk %")} value={settings.maxOpenRisk} onChange={(v) => update("maxOpenRisk", v)} step="0.1" />
              <NumberField label={t("Max Trades / Day")} value={settings.maxTrades} onChange={(v) => update("maxTrades", v)} />
              <NumberField label={t("Min R Multiple")} value={settings.minR} onChange={(v) => update("minR", v)} step="0.1" />
            </div>
          </Surface>
          <DangerZone />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-[768px]:grid-cols-1">
          <VocabPanel
            title={t("Context Tags")}
            description={t("Confirmation signals attached to new opportunities for grading.")}
            items={contextTags}
            onCreate={createContextTagDefinition}
            onRemove={deactivateContextTagDefinition}
          />
          <VocabPanel
            title={t("Rule Break Reasons")}
            description={t("Behavioral violations selectable when journaling a trade.")}
            items={ruleBreaks}
            onCreate={createRuleBreakDefinition}
            onRemove={deactivateRuleBreakDefinition}
          />
        </div>
      )}
    </ModuleShell>
  );
}

function AccountsPanel({ accounts }: { accounts: AccountItem[] }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [list, setList] = useState(accounts);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<TradePlatformName>("MT5");
  const [currency, setCurrency] = useState("USD");
  const [balance, setBalance] = useState(10000);

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const created = await createTradingAccount({
        name: trimmed,
        platform,
        currency: currency.trim().toUpperCase() || "USD",
        startingBalance: balance,
      });
      setList((prev) => [
        ...prev.filter((a) => a.id !== created.id),
        {
          id: created.id,
          name: created.name,
          platform: created.platform,
          currency: created.currency,
          startingBalance: Number(created.startingBalance),
          tradeCount: 0,
          netPnl: 0,
          equity: Number(created.startingBalance),
        },
      ]);
      setName("");
      toast.success(`${t("Account added")}: ${trimmed}`);
    });
  }

  function handleArchive(account: AccountItem) {
    startTransition(async () => {
      await archiveTradingAccount(account.id);
      setList((prev) => prev.filter((a) => a.id !== account.id));
      toast.success(`${t("Account archived")}: ${account.name}`);
    });
  }

  const inputClass =
    "h-9 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] outline-none focus:border-[var(--teal)]";

  return (
    <div className="space-y-3">
      <Surface>
        <SectionTitle>{t("Trading Accounts")}</SectionTitle>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          {t("Each broker, prop-firm challenge, or exchange account you trade. Trades, imports, and analytics can be scoped per account.")}
        </p>
        <div className="mt-4 grid grid-cols-5 gap-2 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={t("Account name...")}
            className={inputClass}
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as TradePlatformName)}
            className={inputClass}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{platformLabels[p]}</option>
            ))}
          </select>
          <input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="USD"
            maxLength={10}
            className={inputClass}
          />
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(Number(e.target.value))}
            placeholder={t("Starting balance")}
            className={inputClass}
          />
          <button
            onClick={handleAdd}
            disabled={pending}
            className="flex h-9 items-center justify-center gap-1 rounded-md bg-[var(--teal)] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("Add Account")}
          </button>
        </div>
        <div className="mt-4 space-y-1.5">
          {list.length === 0 && (
            <p className="rounded-md border border-dashed border-[var(--line)] p-4 text-center text-[12px] text-[var(--muted)]">
              {t("No accounts yet. Add your first broker or exchange account above.")}
            </p>
          )}
          {list.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--line)] px-3 py-2.5 text-[13px]"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="h-4 w-4 text-[var(--teal-dark)]" />
                <div>
                  <span className="font-semibold">{account.name}</span>
                  <span className="ms-2 rounded-sm border border-[var(--line)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">
                    {platformLabels[account.platform] ?? account.platform}
                  </span>
                </div>
              </div>
              <div className="num flex items-center gap-4 text-[12px]">
                <span className="text-[var(--muted)]">{account.tradeCount} {t("Trades")}</span>
                <span className={account.netPnl >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]"}>
                  {account.netPnl >= 0 ? "+" : ""}{formatCurrency(account.netPnl)}
                </span>
                <span className="font-semibold">
                  {t("Equity")} {formatCurrency(account.equity)} {account.currency}
                </span>
                <button
                  onClick={() => handleArchive(account)}
                  disabled={pending}
                  title={t("Archive account")}
                  className="text-[var(--muted)] hover:text-[var(--red)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function DangerZone() {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handleClear() {
    if (!confirm) { setConfirm(true); return; }
    startTransition(async () => {
      await clearAllTrades();
      toast.success(t("All trades and import history cleared"));
      setConfirm(false);
    });
  }

  return (
    <Surface>
      <SectionTitle>{t("Danger Zone")}</SectionTitle>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        {t("These actions are irreversible. Use them to reset your account to a clean state, e.g. after testing with demo data.")}
      </p>
      <div className="mt-4 flex items-center justify-between rounded-md border border-[var(--red)]/30 bg-[var(--red)]/5 p-4">
        <div>
          <p className="text-[13px] font-semibold text-[var(--ink)]">{t("Clear all trades & import history")}</p>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">
            {t("Permanently deletes every trade, rule break, review, and import batch. Opportunities and settings are kept.")}
          </p>
        </div>
        {confirm ? (
          <div className="ms-4 flex shrink-0 items-center gap-2">
            <button onClick={() => setConfirm(false)} className="h-8 rounded-md border border-[var(--line)] px-3 text-[12px] font-medium">
              {t("Cancel")}
            </button>
            <button
              onClick={handleClear}
              disabled={pending}
              className="flex h-8 items-center gap-1.5 rounded-md bg-[var(--red)] px-4 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {pending ? t("Clearing…") : t("Yes, delete all")}
            </button>
          </div>
        ) : (
          <button
            onClick={handleClear}
            className="ms-4 shrink-0 h-8 rounded-md border border-[var(--red)]/40 px-3 text-[12px] font-semibold text-[var(--red)] hover:bg-[var(--red)]/10"
          >
            {t("Clear All Trades")}
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
  const { t } = useI18n();
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
      toast.success(`${t("Added")} "${trimmed}"`);
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
          placeholder={t("Add new...")}
          className="h-9 flex-1 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] outline-none focus:border-[var(--teal)]"
        />
        <button
          onClick={handleAdd}
          disabled={pending}
          className="flex h-9 items-center gap-1 rounded-md bg-[var(--teal)] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("Add")}
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
