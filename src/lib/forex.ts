/**
 * Forex/CFD position-sizing math.
 *
 * Symbol classes are inferred from the ticker: JPY-quoted pairs use a 0.01
 * pip, metals and indices use point-based sizing, everything else defaults
 * to a standard 0.0001-pip forex contract of 100,000 units.
 */

export type SymbolClass = "forex" | "forex-jpy" | "gold" | "silver" | "index" | "crypto";

const INDEX_TICKERS = new Set([
  "US30", "NAS100", "SPX500", "GER40", "UK100", "US500", "USTEC",
  "NQ", "ES", "YM", "DAX", "FTSE", "DJI", "NDX",
]);

const CRYPTO_BASES = ["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "BNB", "LTC", "DOT", "AVAX", "LINK"];

export function classifySymbol(rawSymbol: string): SymbolClass {
  const symbol = rawSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (symbol.startsWith("XAU")) return "gold";
  if (symbol.startsWith("XAG")) return "silver";
  if (INDEX_TICKERS.has(symbol)) return "index";
  if (CRYPTO_BASES.some((base) => symbol.startsWith(base))) return "crypto";
  if (symbol.includes("JPY")) return "forex-jpy";
  return "forex";
}

export function pipSize(symbol: string): number {
  switch (classifySymbol(symbol)) {
    case "forex-jpy": return 0.01;
    case "gold": return 0.1;
    case "silver": return 0.01;
    case "index": return 1;
    case "crypto": return 1;
    default: return 0.0001;
  }
}

/** Units per 1.0 lot. */
export function contractSize(symbol: string): number {
  switch (classifySymbol(symbol)) {
    case "gold": return 100;
    case "silver": return 5000;
    case "index": return 1;
    case "crypto": return 1;
    default: return 100_000;
  }
}

/**
 * USD value of one pip for one lot.
 *
 * Assumes a USD account. For USD-quoted symbols (EURUSD, XAUUSD, BTCUSD) the
 * value is exact; for USD-base pairs (USDJPY, USDCHF) it converts through the
 * current price; for crosses supply `quoteToUsd` (rate of the quote currency
 * in USD) for an exact figure.
 */
export function pipValuePerLot(
  symbol: string,
  price: number,
  quoteToUsd?: number,
): number {
  const cleaned = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const raw = pipSize(symbol) * contractSize(symbol);
  const cls = classifySymbol(symbol);
  if (cls === "index" || cls === "crypto") return raw;
  if (cleaned.endsWith("USD") || cleaned.endsWith("USDT") || cleaned.endsWith("USDC")) return raw;
  if (cleaned.startsWith("USD") && price > 0) return raw / price;
  return raw * (quoteToUsd ?? 1);
}

export type PositionSizeInput = {
  balance: number;
  riskPercent: number;
  entryPrice: number;
  stopPrice: number;
  symbol: string;
  quoteToUsd?: number;
};

export type PositionSizeResult = {
  riskAmount: number;
  stopDistance: number;
  stopPips: number;
  pipValue: number;
  lots: number;
  units: number;
  valid: boolean;
  reason?: string;
};

export function positionSize(input: PositionSizeInput): PositionSizeResult {
  const { balance, riskPercent, entryPrice, stopPrice, symbol } = input;
  const riskAmount = (balance * riskPercent) / 100;
  const stopDistance = Math.abs(entryPrice - stopPrice);
  const pip = pipSize(symbol);
  const stopPips = stopDistance / pip;
  const pipValue = pipValuePerLot(symbol, entryPrice, input.quoteToUsd);

  if (!balance || !riskPercent || !entryPrice || !stopPrice) {
    return { riskAmount, stopDistance, stopPips, pipValue, lots: 0, units: 0, valid: false, reason: "Fill in balance, risk, entry, and stop" };
  }
  if (stopDistance === 0) {
    return { riskAmount, stopDistance, stopPips, pipValue, lots: 0, units: 0, valid: false, reason: "Stop must differ from entry" };
  }

  const lots = riskAmount / (stopPips * pipValue);
  return {
    riskAmount,
    stopDistance,
    stopPips,
    pipValue,
    lots,
    units: lots * contractSize(symbol),
    valid: true,
  };
}
