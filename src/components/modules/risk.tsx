"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, Calculator, AlertTriangle, Check } from "lucide-react";
import { Surface, SectionTitle, ModuleShell, EmptyState } from "@/components/ui";
import { Combobox } from "@/components/ui/combobox";
import { formatCurrency, cn } from "@/lib/utils";
import { positionSize, pipSize, classifySymbol } from "@/lib/forex";
import { defaultTickers } from "@/lib/domain";
import { useI18n } from "@/components/layout/i18n-provider";

type AccountItem = {
  id: string;
  name: string;
  currency: string;
  startingBalance: string | number;
  equity: number;
  netPnl: number;
};

type LightTrade = {
  accountId: string | null;
  pnl: string | number;
  openedAt: string;
};

type PropRules = { dailyLossPct: number; maxDrawdownPct: number; profitTargetPct: number };

const DEFAULT_RULES: PropRules = { dailyLossPct: 5, maxDrawdownPct: 10, profitTargetPct: 10 };
const RULES_KEY = "trade-os-prop-rules";

export function RiskView({
  accounts,
  trades,
  defaultRiskPercent,
}: {
  accounts: AccountItem[];
  trades: LightTrade[];
  defaultRiskPercent: number;
}) {
  const { t } = useI18n();

  return (
    <ModuleShell
      title={t("Risk Engine")}
      eyebrow={t("Plan")}
      description={t("Position sizing and prop-firm rule tracking. Size every trade from risk, not from feel.")}
    >
      <div className="grid grid-cols-2 gap-2 max-[1000px]:grid-cols-1">
        <PositionSizeCalculator accounts={accounts} defaultRiskPercent={defaultRiskPercent} />
        <PropFirmTracker accounts={accounts} trades={trades} />
      </div>
    </ModuleShell>
  );
}

function Field({ label, value, onChange, step = "0.01" }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <label>
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      <input
        type="number"
        step={step}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="num mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]"
      />
    </label>
  );
}

function PositionSizeCalculator({
  accounts,
  defaultRiskPercent,
}: {
  accounts: AccountItem[];
  defaultRiskPercent: number;
}) {
  const { t } = useI18n();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const account = accounts.find((a) => a.id === accountId);
  const [balanceOverride, setBalanceOverride] = useState<number | null>(
    account ? null : 10000,
  );
  const balance =
    balanceOverride ?? (account ? Math.round(account.equity * 100) / 100 : 10000);
  const setBalance = setBalanceOverride;
  const [riskPercent, setRiskPercent] = useState(defaultRiskPercent);
  const [symbol, setSymbol] = useState("EURUSD");
  const [entry, setEntry] = useState(0);
  const [stop, setStop] = useState(0);

  const result = useMemo(
    () =>
      positionSize({
        balance,
        riskPercent,
        entryPrice: entry,
        stopPrice: stop,
        symbol: symbol || "EURUSD",
      }),
    [balance, riskPercent, entry, stop, symbol],
  );

  const symbolClass = classifySymbol(symbol || "EURUSD");

  return (
    <Surface>
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-[var(--teal-dark)]" />
        <SectionTitle>{t("Position Size Calculator")}</SectionTitle>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {accounts.length > 0 && (
          <label className="col-span-2">
            <span className="text-[12px] text-[var(--muted)]">{t("Account")}</span>
            <select
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setBalanceOverride(null);
              }}
              className="mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] outline-none focus:border-[var(--teal)]"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {formatCurrency(a.equity)} {a.currency}
                </option>
              ))}
            </select>
          </label>
        )}
        <Field label={t("Balance ($)")} value={balance} onChange={setBalance} step="100" />
        <Field label={t("Risk per Trade %")} value={riskPercent} onChange={setRiskPercent} step="0.05" />
        <div className="col-span-2">
          <Combobox label={t("Symbol")} value={symbol} onChange={setSymbol} options={[...defaultTickers]} placeholder="EURUSD" />
        </div>
        <Field label={t("Entry Price")} value={entry} onChange={setEntry} />
        <Field label={t("Stop Loss")} value={stop} onChange={setStop} />
      </div>

      <div className="mt-4 rounded-md border border-[var(--line)] bg-[var(--panel-soft)] p-4">
        {result.valid ? (
          <div className="num grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">{t("Risk amount")}</span>
              <span className="font-semibold text-[var(--red)]">{formatCurrency(result.riskAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">{t("Stop distance")}</span>
              <span className="font-semibold">{result.stopPips.toFixed(1)} {symbolClass === "index" || symbolClass === "crypto" ? t("points") : t("pips")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">{t("Pip value / lot")}</span>
              <span className="font-semibold">{formatCurrency(result.pipValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">{t("Units")}</span>
              <span className="font-semibold">{Math.round(result.units).toLocaleString()}</span>
            </div>
            <div className="col-span-2 mt-1 flex items-center justify-between border-t border-[var(--line)] pt-3">
              <span className="text-[13px] font-semibold">{t("Position size")}</span>
              <span className="font-display text-[22px] font-semibold text-[var(--teal-dark)]">
                {result.lots.toFixed(2)} {t("lots")}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-[var(--muted)]">{t(result.reason ?? "Fill in the fields to size the trade")}</p>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
        {t("Assumes a USD account. Cross pairs (non-USD quote) are approximate — verify pip value with your broker.")}
        {" "}{t("Pip size")}: {pipSize(symbol || "EURUSD")}
      </p>
    </Surface>
  );
}

function ruleBar(value: number, limit: number) {
  return Math.max(0, Math.min(1, limit === 0 ? 0 : value / limit));
}

function PropFirmTracker({
  accounts,
  trades,
}: {
  accounts: AccountItem[];
  trades: LightTrade[];
}) {
  const { t } = useI18n();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [rules, setRules] = useState<PropRules>(DEFAULT_RULES);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(RULES_KEY) ?? "{}");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored[accountId]) setRules({ ...DEFAULT_RULES, ...stored[accountId] });
      else setRules(DEFAULT_RULES);
    } catch {
      setRules(DEFAULT_RULES);
    }
  }, [accountId]);

  function updateRule<K extends keyof PropRules>(key: K, value: number) {
    setRules((prev) => {
      const next = { ...prev, [key]: value };
      try {
        const stored = JSON.parse(window.localStorage.getItem(RULES_KEY) ?? "{}");
        stored[accountId] = next;
        window.localStorage.setItem(RULES_KEY, JSON.stringify(stored));
      } catch { /* ignore quota errors */ }
      return next;
    });
  }

  const account = accounts.find((a) => a.id === accountId);

  const status = useMemo(() => {
    if (!account) return null;
    const starting = Number(account.startingBalance);
    const accountTrades = trades
      .filter((trade) => trade.accountId === account.id)
      .sort((a, b) => a.openedAt.localeCompare(b.openedAt));

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayPnl = accountTrades
      .filter((trade) => trade.openedAt.slice(0, 10) === todayKey)
      .reduce((s, trade) => s + Number(trade.pnl), 0);

    const equity = account.equity;
    const dailyLimit = (starting * rules.dailyLossPct) / 100;
    const ddLimit = (starting * rules.maxDrawdownPct) / 100;
    const drawdownUsed = Math.max(0, starting - equity);
    const target = starting * (1 + rules.profitTargetPct / 100);
    const targetProgress = target === starting ? 0 : (equity - starting) / (target - starting);

    return {
      starting,
      equity,
      todayPnl,
      dailyLimit,
      dailyUsed: Math.max(0, -todayPnl),
      dailyBreached: dailyLimit > 0 && -todayPnl >= dailyLimit,
      ddLimit,
      drawdownUsed,
      ddBreached: ddLimit > 0 && drawdownUsed >= ddLimit,
      target,
      targetProgress,
      targetHit: equity >= target && rules.profitTargetPct > 0,
    };
  }, [account, trades, rules]);

  if (accounts.length === 0) {
    return (
      <Surface>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--teal-dark)]" />
          <SectionTitle>{t("Prop-Firm Rule Tracker")}</SectionTitle>
        </div>
        <div className="mt-4">
          <EmptyState
            title={t("No accounts yet")}
            description={t("Add a trading account in Settings → Accounts to track prop-firm rules against it.")}
          />
        </div>
      </Surface>
    );
  }

  return (
    <Surface>
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-[var(--teal-dark)]" />
        <SectionTitle>{t("Prop-Firm Rule Tracker")}</SectionTitle>
      </div>
      <div className="mt-4 space-y-3">
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] outline-none focus:border-[var(--teal)]"
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <div className="grid grid-cols-3 gap-2">
          <Field label={t("Daily loss %")} value={rules.dailyLossPct} onChange={(v) => updateRule("dailyLossPct", v)} step="0.5" />
          <Field label={t("Max drawdown %")} value={rules.maxDrawdownPct} onChange={(v) => updateRule("maxDrawdownPct", v)} step="0.5" />
          <Field label={t("Profit target %")} value={rules.profitTargetPct} onChange={(v) => updateRule("profitTargetPct", v)} step="0.5" />
        </div>

        {status && (
          <div className="space-y-3 pt-1">
            <RuleGauge
              label={t("Daily loss used")}
              used={status.dailyUsed}
              limit={status.dailyLimit}
              breached={status.dailyBreached}
              detail={`${formatCurrency(status.todayPnl)} ${t("today")}`}
            />
            <RuleGauge
              label={t("Max drawdown used")}
              used={status.drawdownUsed}
              limit={status.ddLimit}
              breached={status.ddBreached}
              detail={`${t("Equity")} ${formatCurrency(status.equity)}`}
            />
            <div>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="font-medium">{t("Profit target")}</span>
                <span className={cn("num font-semibold", status.targetHit ? "text-[var(--teal-dark)]" : "text-[var(--muted)]")}>
                  {formatCurrency(status.equity)} / {formatCurrency(status.target)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--teal)] transition-all"
                  style={{ width: `${Math.round(Math.max(0, Math.min(1, status.targetProgress)) * 100)}%` }}
                />
              </div>
              {status.targetHit && (
                <p className="mt-1.5 flex items-center gap-1 text-[12px] font-semibold text-[var(--teal-dark)]">
                  <Check className="h-3.5 w-3.5" /> {t("Target reached")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </Surface>
  );
}

function RuleGauge({
  label,
  used,
  limit,
  breached,
  detail,
}: {
  label: string;
  used: number;
  limit: number;
  breached: boolean;
  detail: string;
}) {
  const { t } = useI18n();
  const ratio = ruleBar(used, limit);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px]">
        <span className="font-medium">{label}</span>
        <span className={cn("num font-semibold", breached ? "text-[var(--red)]" : "text-[var(--muted)]")}>
          {formatCurrency(used)} / {formatCurrency(limit)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--panel-soft)]">
        <div
          className={cn("h-full rounded-full transition-all", breached ? "bg-[var(--red)]" : ratio > 0.7 ? "bg-[var(--amber)]" : "bg-[var(--teal)]")}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
      <p className={cn("mt-1 text-[11px]", breached ? "flex items-center gap-1 font-semibold text-[var(--red)]" : "text-[var(--muted)]")}>
        {breached && <AlertTriangle className="h-3 w-3" />} {breached ? t("Rule breached") : detail}
      </p>
    </div>
  );
}
