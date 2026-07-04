/**
 * Backtest Lab engine: OHLC parsing, indicators, and rule-based strategies.
 *
 * Pure functions — runs client-side for instant feedback, results are
 * optionally persisted through server actions.
 */

export type Candle = {
  t: number; // unix ms
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

export type OhlcParseResult = {
  candles: Candle[];
  errors: string[];
  timeframeGuess: string;
};

export type StrategyId = "ema-cross" | "breakout";

export type StrategyParams = {
  direction: "long" | "short" | "both";
  /** Stop distance as % of entry price; 0 disables the protective stop. */
  stopPct: number;
  /** Restrict entries to UTC hours [fromHour, toHour); equal values disable the filter. */
  fromHour: number;
  toHour: number;
  // ema-cross
  fast: number;
  slow: number;
  // breakout
  lookback: number;
  exitLookback: number;
};

export const defaultParams: StrategyParams = {
  direction: "both",
  stopPct: 1,
  fromHour: 0,
  toHour: 0,
  fast: 9,
  slow: 21,
  lookback: 20,
  exitLookback: 10,
};

export type BtTrade = {
  direction: "LONG" | "SHORT";
  entryIndex: number;
  exitIndex: number;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  pnlPct: number;
  r: number | null;
  exitReason: "signal" | "stop" | "end";
};

export type BacktestMetrics = {
  trades: number;
  winRate: number;
  profitFactor: number;
  expectancyPct: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  avgWinPct: number;
  avgLossPct: number;
  avgR: number | null;
};

export type BacktestResult = {
  trades: BtTrade[];
  metrics: BacktestMetrics;
  equityCurve: { t: number; equity: number }[];
};

// ---------------------------------------------------------------------------
// OHLC CSV parsing
// ---------------------------------------------------------------------------

function parseOhlcDate(raw: string): number | null {
  const trimmed = raw.trim().replace(/^"|"$/g, "");
  if (!trimmed) return null;
  if (/^\d{10}$/.test(trimmed)) return Number(trimmed) * 1000;
  if (/^\d{13}$/.test(trimmed)) return Number(trimmed);
  const normalised = trimmed
    .replace(/^(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3")
    .replace(/^(\d{4})\/(\d{2})\/(\d{2})/, "$1-$2-$3")
    .replace(" ", "T");
  const withZ = /T\d{2}:\d{2}/.test(normalised) ? normalised : `${normalised}T00:00`;
  const parsed = Date.parse(withZ.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(withZ) ? withZ : `${withZ}Z`);
  return isNaN(parsed) ? null : parsed;
}

export function parseOhlcCsv(content: string): OhlcParseResult {
  const errors: string[] = [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 3) {
    return { candles: [], errors: ["File needs a header row and at least two candles"], timeframeGuess: "?" };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));

  const find = (...names: string[]) =>
    headers.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));

  const iTime = find("time", "date", "datetime", "timestamp", "gmt time", "local time");
  const iOpen = find("open");
  const iHigh = find("high");
  const iLow = find("low");
  const iClose = find("close", "price");
  const iVol = find("volume", "vol", "tick");

  if (iTime < 0 || iOpen < 0 || iHigh < 0 || iLow < 0 || iClose < 0) {
    return {
      candles: [],
      errors: ["Header must include time/date, open, high, low, and close columns"],
      timeframeGuess: "?",
    };
  }

  const candles: Candle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter);
    const t = parseOhlcDate(cells[iTime] ?? "");
    const o = Number(cells[iOpen]);
    const h = Number(cells[iHigh]);
    const l = Number(cells[iLow]);
    const c = Number(cells[iClose]);
    if (t === null || [o, h, l, c].some((x) => isNaN(x) || x <= 0)) {
      if (errors.length < 5) errors.push(`Row ${i + 1}: invalid candle data`);
      continue;
    }
    const candle: Candle = { t, o, h, l, c };
    if (iVol >= 0 && cells[iVol] !== undefined && cells[iVol] !== "") {
      const v = Number(cells[iVol]);
      if (!isNaN(v)) candle.v = v;
    }
    candles.push(candle);
  }

  candles.sort((a, b) => a.t - b.t);

  let timeframeGuess = "?";
  if (candles.length > 2) {
    const gaps = candles.slice(1, 50).map((candle, i) => candle.t - candles[i].t).filter((g) => g > 0);
    const gap = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 0;
    const minutes = Math.round(gap / 60000);
    if (minutes >= 1440) timeframeGuess = `D${Math.round(minutes / 1440)}`;
    else if (minutes >= 60) timeframeGuess = `H${Math.round(minutes / 60)}`;
    else if (minutes >= 1) timeframeGuess = `M${minutes}`;
  }

  if (candles.length === 0 && errors.length === 0) errors.push("No valid candles found");
  return { candles, errors, timeframeGuess };
}

// ---------------------------------------------------------------------------
// Indicators
// ---------------------------------------------------------------------------

export function ema(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      out.push(null);
      continue;
    }
    if (prev === null) {
      const seed = values.slice(i - period + 1, i + 1).reduce((s, v) => s + v, 0) / period;
      prev = seed;
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out.push(prev);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

type Signal = 1 | -1 | 0; // desired position

function emaCrossSignals(candles: Candle[], params: StrategyParams): Signal[] {
  const closes = candles.map((c) => c.c);
  const fast = ema(closes, Math.max(2, params.fast));
  const slow = ema(closes, Math.max(3, params.slow));
  return candles.map((_, i) => {
    const f = fast[i];
    const s = slow[i];
    if (f === null || s === null) return 0;
    return f > s ? 1 : f < s ? -1 : 0;
  });
}

function breakoutSignals(candles: Candle[], params: StrategyParams): Signal[] {
  const lookback = Math.max(2, params.lookback);
  const exitLookback = Math.max(2, params.exitLookback);
  const signals: Signal[] = new Array(candles.length).fill(0);
  let position: Signal = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i < lookback) {
      signals[i] = position;
      continue;
    }
    const highest = Math.max(...candles.slice(i - lookback, i).map((c) => c.h));
    const lowest = Math.min(...candles.slice(i - lookback, i).map((c) => c.l));
    const exitHigh = Math.max(...candles.slice(Math.max(0, i - exitLookback), i).map((c) => c.h));
    const exitLow = Math.min(...candles.slice(Math.max(0, i - exitLookback), i).map((c) => c.l));
    const close = candles[i].c;

    if (position === 1 && close < exitLow) position = 0;
    if (position === -1 && close > exitHigh) position = 0;
    if (close > highest) position = 1;
    else if (close < lowest) position = -1;
    signals[i] = position;
  }
  return signals;
}

function entryAllowed(candle: Candle, params: StrategyParams): boolean {
  if (params.fromHour === params.toHour) return true;
  const hour = new Date(candle.t).getUTCHours();
  if (params.fromHour < params.toHour) return hour >= params.fromHour && hour < params.toHour;
  return hour >= params.fromHour || hour < params.toHour;
}

export function runBacktest(
  candles: Candle[],
  strategy: StrategyId,
  input: Partial<StrategyParams> = {},
): BacktestResult {
  const params = { ...defaultParams, ...input };
  const signals = strategy === "ema-cross" ? emaCrossSignals(candles, params) : breakoutSignals(candles, params);

  const trades: BtTrade[] = [];
  let position: Signal = 0;
  let entryIndex = -1;
  let entryPrice = 0;
  let stopPrice = 0;

  const close = (i: number, exitPrice: number, reason: BtTrade["exitReason"]) => {
    const dir = position === 1 ? 1 : -1;
    const pnlPct = ((exitPrice - entryPrice) / entryPrice) * 100 * dir;
    trades.push({
      direction: position === 1 ? "LONG" : "SHORT",
      entryIndex,
      exitIndex: i,
      entryTime: candles[entryIndex].t,
      exitTime: candles[i].t,
      entryPrice,
      exitPrice,
      pnlPct,
      r: params.stopPct > 0 ? pnlPct / params.stopPct : null,
      exitReason: reason,
    });
    position = 0;
  };

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];

    // Protective stop first (intrabar)
    if (position !== 0 && params.stopPct > 0) {
      if (position === 1 && candle.l <= stopPrice) {
        close(i, stopPrice, "stop");
      } else if (position === -1 && candle.h >= stopPrice) {
        close(i, stopPrice, "stop");
      }
    }

    const desired = signals[i];
    if (position !== 0 && desired !== position) {
      close(i, candle.c, "signal");
    }
    if (position === 0 && desired !== 0 && entryAllowed(candle, params)) {
      const allowed =
        params.direction === "both" ||
        (params.direction === "long" && desired === 1) ||
        (params.direction === "short" && desired === -1);
      if (allowed) {
        position = desired;
        entryIndex = i;
        entryPrice = candle.c;
        stopPrice =
          desired === 1
            ? entryPrice * (1 - params.stopPct / 100)
            : entryPrice * (1 + params.stopPct / 100);
      }
    }
  }
  if (position !== 0) close(candles.length - 1, candles[candles.length - 1].c, "end");

  // Metrics
  const winsArr = trades.filter((t) => t.pnlPct > 0);
  const lossesArr = trades.filter((t) => t.pnlPct < 0);
  const grossProfit = winsArr.reduce((s, t) => s + t.pnlPct, 0);
  const grossLoss = Math.abs(lossesArr.reduce((s, t) => s + t.pnlPct, 0));
  const rValues = trades.map((t) => t.r).filter((r): r is number => r !== null);

  const equityCurve: { t: number; equity: number }[] = [];
  const dd = trades.reduce(
    (acc, trade) => {
      const equity = acc.equity * (1 + trade.pnlPct / 100);
      const peak = Math.max(acc.peak, equity);
      equityCurve.push({ t: trade.exitTime, equity: Math.round(equity * 100) / 100 });
      return { equity, peak, maxDd: Math.min(acc.maxDd, ((equity - peak) / peak) * 100 ) };
    },
    { equity: 100, peak: 100, maxDd: 0 },
  );

  const metrics: BacktestMetrics = {
    trades: trades.length,
    winRate: trades.length ? winsArr.length / trades.length : 0,
    profitFactor: grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    expectancyPct: trades.length ? trades.reduce((s, t) => s + t.pnlPct, 0) / trades.length : 0,
    totalReturnPct: dd.equity - 100,
    maxDrawdownPct: dd.maxDd,
    avgWinPct: winsArr.length ? grossProfit / winsArr.length : 0,
    avgLossPct: lossesArr.length ? grossLoss / lossesArr.length : 0,
    avgR: rValues.length ? rValues.reduce((s, r) => s + r, 0) / rValues.length : null,
  };

  return { trades, metrics, equityCurve };
}
