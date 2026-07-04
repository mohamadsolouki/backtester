"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FlaskConical, Play, Save, Trash2, Upload } from "lucide-react";
import { Surface, SectionTitle, ModuleShell, Kpi, EmptyState } from "@/components/ui";
import { cn, formatPercent } from "@/lib/utils";
import {
  parseOhlcCsv,
  runBacktest,
  defaultParams,
  type BacktestResult,
  type Candle,
  type StrategyId,
  type StrategyParams,
} from "@/lib/backtest";
import {
  savePriceSeries,
  getPriceSeriesCandles,
  deletePriceSeries,
  saveBacktestRun,
} from "@/app/actions/backtest";
import { useI18n } from "@/components/layout/i18n-provider";

type SeriesItem = {
  id: string;
  symbol: string;
  timeframe: string;
  candleCount: number;
  startsAt: string;
  endsAt: string;
};

type RunItem = {
  id: string;
  strategy: string;
  createdAt: string;
  metrics: Record<string, number | string | null>;
  series: { symbol: string; timeframe: string };
};

const STRATEGY_LABELS: Record<StrategyId, string> = {
  "ema-cross": "EMA Cross",
  breakout: "Breakout",
};

const inputClass =
  "num mt-1 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--teal)]";

function ParamField({ label, value, onChange, step = "1" }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <label>
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={inputClass} />
    </label>
  );
}

export function BacktestLabView({
  seriesList,
  runs,
}: {
  seriesList: SeriesItem[];
  runs: RunItem[];
}) {
  const { t } = useI18n();
  const [series, setSeries] = useState(seriesList);
  const [pending, startTransition] = useTransition();

  // Loaded data
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [loadedLabel, setLoadedLabel] = useState("");

  // Pending upload
  const [uploadCandles, setUploadCandles] = useState<Candle[] | null>(null);
  const [uploadSymbol, setUploadSymbol] = useState("");
  const [uploadTimeframe, setUploadTimeframe] = useState("");

  // Strategy config
  const [strategy, setStrategy] = useState<StrategyId>("ema-cross");
  const [params, setParams] = useState<StrategyParams>(defaultParams);
  const [result, setResult] = useState<BacktestResult | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseOhlcCsv(String(e.target?.result ?? ""));
      if (parsed.candles.length === 0) {
        toast.error(parsed.errors[0] ?? t("No valid candles found"));
        return;
      }
      setUploadCandles(parsed.candles);
      setUploadTimeframe(parsed.timeframeGuess);
      const guess = file.name.replace(/\.[a-z0-9]+$/i, "").toUpperCase().match(/[A-Z]{3}[A-Z0-9]{2,7}/);
      setUploadSymbol(guess ? guess[0] : "");
      setCandles(parsed.candles);
      setActiveSeriesId(null);
      setLoadedLabel(`${file.name} (${parsed.candles.length})`);
      setResult(null);
      toast.success(`${parsed.candles.length} ${t("candles loaded")} · ${parsed.timeframeGuess}`);
    };
    reader.readAsText(file);
  }

  function handleSaveSeries() {
    if (!uploadCandles) return;
    if (!uploadSymbol.trim()) {
      toast.error(t("Enter a symbol name before saving"));
      return;
    }
    startTransition(async () => {
      const { id } = await savePriceSeries({
        symbol: uploadSymbol.trim(),
        timeframe: uploadTimeframe || "?",
        candles: uploadCandles,
      });
      setSeries((prev) => [
        {
          id,
          symbol: uploadSymbol.trim().toUpperCase(),
          timeframe: uploadTimeframe || "?",
          candleCount: uploadCandles.length,
          startsAt: new Date(uploadCandles[0].t).toISOString(),
          endsAt: new Date(uploadCandles[uploadCandles.length - 1].t).toISOString(),
        },
        ...prev,
      ]);
      setActiveSeriesId(id);
      setUploadCandles(null);
      toast.success(t("Price series saved"));
    });
  }

  function handleLoadSeries(item: SeriesItem) {
    startTransition(async () => {
      const data = (await getPriceSeriesCandles(item.id)) as Candle[];
      setCandles(data);
      setActiveSeriesId(item.id);
      setLoadedLabel(`${item.symbol} ${item.timeframe} (${item.candleCount})`);
      setUploadCandles(null);
      setResult(null);
    });
  }

  function handleDeleteSeries(item: SeriesItem) {
    startTransition(async () => {
      await deletePriceSeries(item.id);
      setSeries((prev) => prev.filter((s) => s.id !== item.id));
      if (activeSeriesId === item.id) {
        setActiveSeriesId(null);
        setCandles(null);
        setResult(null);
      }
      toast.success(t("Series deleted"));
    });
  }

  function handleRun() {
    if (!candles) {
      toast.error(t("Load a price series first"));
      return;
    }
    const r = runBacktest(candles, strategy, params);
    setResult(r);
    if (r.metrics.trades === 0) toast.info(t("Strategy produced no trades on this data"));
  }

  function handleSaveRun() {
    if (!result || !activeSeriesId) {
      toast.error(t("Run a backtest on a saved series to store the result"));
      return;
    }
    startTransition(async () => {
      await saveBacktestRun({
        seriesId: activeSeriesId,
        strategy,
        params: {
          direction: params.direction,
          stopPct: params.stopPct,
          fromHour: params.fromHour,
          toHour: params.toHour,
          ...(strategy === "ema-cross"
            ? { fast: params.fast, slow: params.slow }
            : { lookback: params.lookback, exitLookback: params.exitLookback }),
        },
        metrics: {
          trades: result.metrics.trades,
          winRate: Math.round(result.metrics.winRate * 1000) / 1000,
          profitFactor: Number.isFinite(result.metrics.profitFactor)
            ? Math.round(result.metrics.profitFactor * 100) / 100
            : 999,
          totalReturnPct: Math.round(result.metrics.totalReturnPct * 100) / 100,
          maxDrawdownPct: Math.round(result.metrics.maxDrawdownPct * 100) / 100,
          avgR: result.metrics.avgR === null ? null : Math.round(result.metrics.avgR * 100) / 100,
        },
      });
      toast.success(t("Backtest run saved"));
    });
  }

  const equityData = useMemo(
    () =>
      result?.equityCurve.map((point) => ({
        date: new Date(point.t).toLocaleDateString(),
        equity: point.equity,
      })) ?? [],
    [result],
  );

  return (
    <ModuleShell
      title={t("Backtest Lab")}
      eyebrow={t("Analyze")}
      description={t("Upload OHLC candles from any platform and test rule-based strategies before risking capital.")}
    >
      <div className="grid grid-cols-[320px_1fr] gap-2 max-[1080px]:grid-cols-1">
        {/* Data panel */}
        <div className="space-y-2">
          <Surface>
            <SectionTitle>{t("Price Data")}</SectionTitle>
            <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--line)] p-4 text-center transition-all hover:border-[var(--teal)] hover:bg-[var(--teal-soft)]">
              <Upload className="h-6 w-6 text-[var(--teal)]" />
              <span className="mt-1.5 text-[12px] font-semibold">{t("Upload OHLC CSV")}</span>
              <span className="mt-0.5 text-[11px] text-[var(--muted)]">{t("time, open, high, low, close columns")}</span>
              <input
                type="file"
                className="hidden"
                accept=".csv,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.currentTarget.value = "";
                }}
              />
            </label>

            {uploadCandles && (
              <div className="mt-3 space-y-2 rounded-md border border-[var(--line)] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className="text-[12px] text-[var(--muted)]">{t("Symbol")}</span>
                    <input value={uploadSymbol} onChange={(e) => setUploadSymbol(e.target.value.toUpperCase())} placeholder="EURUSD" className={inputClass} />
                  </label>
                  <label>
                    <span className="text-[12px] text-[var(--muted)]">{t("Timeframe")}</span>
                    <input value={uploadTimeframe} onChange={(e) => setUploadTimeframe(e.target.value)} placeholder="H1" className={inputClass} />
                  </label>
                </div>
                <button
                  onClick={handleSaveSeries}
                  disabled={pending}
                  className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--teal)] text-[12px] font-semibold text-white hover:bg-[var(--teal-dark)] disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" /> {t("Save series")}
                </button>
              </div>
            )}

            <div className="mt-3 space-y-1.5">
              {series.length === 0 && !uploadCandles && (
                <p className="text-[11px] text-[var(--muted)]">{t("No saved series yet. Export candles from MT5 or TradingView as CSV and upload them here.")}</p>
              )}
              {series.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-[12px]",
                    activeSeriesId === item.id ? "border-[var(--teal)]/60 bg-[var(--teal-soft)]" : "border-[var(--line)]",
                  )}
                >
                  <button onClick={() => handleLoadSeries(item)} className="text-start">
                    <span className="font-semibold">{item.symbol}</span>
                    <span className="ms-1.5 text-[var(--muted)]">{item.timeframe}</span>
                    <span className="num ms-1.5 text-[var(--muted)]">{item.candleCount}</span>
                  </button>
                  <button onClick={() => handleDeleteSeries(item)} disabled={pending} className="text-[var(--muted)] hover:text-[var(--red)]" title={t("Delete series")}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Surface>

          <Surface>
            <SectionTitle>{t("Strategy")}</SectionTitle>
            <div className="mt-3 space-y-3">
              <select value={strategy} onChange={(e) => setStrategy(e.target.value as StrategyId)} className={inputClass}>
                {Object.entries(STRATEGY_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{t(label)}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                {strategy === "ema-cross" ? (
                  <>
                    <ParamField label={t("Fast EMA")} value={params.fast} onChange={(v) => setParams((p) => ({ ...p, fast: v }))} />
                    <ParamField label={t("Slow EMA")} value={params.slow} onChange={(v) => setParams((p) => ({ ...p, slow: v }))} />
                  </>
                ) : (
                  <>
                    <ParamField label={t("Entry lookback")} value={params.lookback} onChange={(v) => setParams((p) => ({ ...p, lookback: v }))} />
                    <ParamField label={t("Exit lookback")} value={params.exitLookback} onChange={(v) => setParams((p) => ({ ...p, exitLookback: v }))} />
                  </>
                )}
                <ParamField label={t("Stop %")} value={params.stopPct} onChange={(v) => setParams((p) => ({ ...p, stopPct: v }))} step="0.1" />
                <label>
                  <span className="text-[12px] text-[var(--muted)]">{t("Direction")}</span>
                  <select
                    value={params.direction}
                    onChange={(e) => setParams((p) => ({ ...p, direction: e.target.value as StrategyParams["direction"] }))}
                    className={inputClass}
                  >
                    <option value="both">{t("Both")}</option>
                    <option value="long">{t("Long only")}</option>
                    <option value="short">{t("Short only")}</option>
                  </select>
                </label>
                <ParamField label={t("From hour (UTC)")} value={params.fromHour} onChange={(v) => setParams((p) => ({ ...p, fromHour: v }))} />
                <ParamField label={t("To hour (UTC)")} value={params.toHour} onChange={(v) => setParams((p) => ({ ...p, toHour: v }))} />
              </div>
              <button
                onClick={handleRun}
                disabled={!candles}
                className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[var(--teal)] text-[12px] font-semibold text-white hover:bg-[var(--teal-dark)] disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" /> {t("Run Backtest")}
              </button>
              {loadedLabel && (
                <p className="text-center text-[11px] text-[var(--muted)]">{t("Loaded")}: {loadedLabel}</p>
              )}
            </div>
          </Surface>
        </div>

        {/* Results panel */}
        <div className="space-y-2">
          {!result ? (
            <Surface>
              <div className="flex min-h-[300px] items-center justify-center">
                <EmptyState
                  title={t("No backtest yet")}
                  description={t("Upload or select a price series, configure a strategy, and press Run Backtest.")}
                />
              </div>
            </Surface>
          ) : (
            <>
              <div className="stagger grid grid-cols-4 gap-2 max-[900px]:grid-cols-2">
                <Kpi label={t("Trades")} value={String(result.metrics.trades)} />
                <Kpi label={t("Win Rate")} value={formatPercent(result.metrics.winRate)} accent={result.metrics.winRate >= 0.5 ? "up" : "down"} />
                <Kpi
                  label={t("Profit Factor")}
                  value={Number.isFinite(result.metrics.profitFactor) ? result.metrics.profitFactor.toFixed(2) : "∞"}
                  accent={result.metrics.profitFactor >= 1 ? "up" : "down"}
                />
                <Kpi
                  label={t("Total Return")}
                  value={`${result.metrics.totalReturnPct >= 0 ? "+" : ""}${result.metrics.totalReturnPct.toFixed(1)}%`}
                  accent={result.metrics.totalReturnPct >= 0 ? "up" : "down"}
                />
              </div>

              <Surface>
                <div className="flex items-center justify-between">
                  <SectionTitle>{t("Backtest Equity (start = 100)")}</SectionTitle>
                  <button
                    onClick={handleSaveRun}
                    disabled={pending || !activeSeriesId}
                    title={!activeSeriesId ? t("Save the series first to store runs") : undefined}
                    className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--line)] px-3 text-[12px] font-semibold hover:bg-[var(--panel-soft)] disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" /> {t("Save run")}
                  </button>
                </div>
                <div className="mt-3 h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityData}>
                      <defs>
                        <linearGradient id="bteq" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--teal)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--teal)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                      <Tooltip />
                      <Area dataKey="equity" fill="url(#bteq)" stroke="var(--teal)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="num mt-2 grid grid-cols-4 gap-2 text-[12px] text-[var(--muted)] max-[700px]:grid-cols-2">
                  <span>{t("Expectancy")}: {result.metrics.expectancyPct >= 0 ? "+" : ""}{result.metrics.expectancyPct.toFixed(2)}%</span>
                  <span>{t("Max Drawdown")}: {result.metrics.maxDrawdownPct.toFixed(1)}%</span>
                  <span>{t("Avg win")}: {result.metrics.avgWinPct.toFixed(2)}%</span>
                  <span>{t("Avg loss")}: {result.metrics.avgLossPct.toFixed(2)}%</span>
                </div>
              </Surface>

              <Surface>
                <SectionTitle>{t("Simulated Trades")}</SectionTitle>
                <div className="mt-3 max-h-[300px] overflow-auto">
                  <table className="w-full text-start text-[12px]">
                    <thead className="sticky top-0 border-y border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]">
                      <tr>
                        {["Date", "Dir", "Entry", "Exit", "P&L %", "R", "Exit Reason"].map((h) => (
                          <th key={h} className="h-8 px-2 text-start font-semibold">{t(h)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.slice(0, 200).map((trade, i) => (
                        <tr key={i} className="border-b border-[var(--line)]">
                          <td className="num h-8 px-2 text-[var(--muted)]">{new Date(trade.entryTime).toLocaleDateString()}</td>
                          <td className={cn("px-2 font-medium", trade.direction === "LONG" ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>{t(trade.direction)}</td>
                          <td className="num px-2">{trade.entryPrice.toFixed(4)}</td>
                          <td className="num px-2">{trade.exitPrice.toFixed(4)}</td>
                          <td className={cn("num px-2 font-semibold", trade.pnlPct >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                            {trade.pnlPct >= 0 ? "+" : ""}{trade.pnlPct.toFixed(2)}%
                          </td>
                          <td className="num px-2">{trade.r === null ? "—" : trade.r.toFixed(2)}</td>
                          <td className="px-2 text-[var(--muted)]">{t(trade.exitReason)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Surface>
            </>
          )}

          {runs.length > 0 && (
            <Surface>
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-[var(--teal-dark)]" />
                <SectionTitle>{t("Saved Runs")}</SectionTitle>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-start text-[12px]">
                  <thead className="border-y border-[var(--line)] text-[var(--muted)]">
                    <tr>
                      {["Date", "Series", "Strategy", "Trades", "Win Rate", "Return %"].map((h) => (
                        <th key={h} className="h-8 px-2 text-start font-semibold">{t(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id} className="border-b border-[var(--line)]">
                        <td className="num h-8 px-2 text-[var(--muted)]">{new Date(run.createdAt).toLocaleDateString()}</td>
                        <td className="px-2 font-semibold">{run.series.symbol} {run.series.timeframe}</td>
                        <td className="px-2">{t(STRATEGY_LABELS[run.strategy as StrategyId] ?? run.strategy)}</td>
                        <td className="num px-2">{String(run.metrics.trades ?? "—")}</td>
                        <td className="num px-2">{typeof run.metrics.winRate === "number" ? formatPercent(run.metrics.winRate) : "—"}</td>
                        <td className={cn("num px-2 font-semibold", Number(run.metrics.totalReturnPct ?? 0) >= 0 ? "text-[var(--teal-dark)]" : "text-[var(--red)]")}>
                          {typeof run.metrics.totalReturnPct === "number" ? `${run.metrics.totalReturnPct >= 0 ? "+" : ""}${run.metrics.totalReturnPct}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Surface>
          )}
        </div>
      </div>
    </ModuleShell>
  );
}
