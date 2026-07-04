/**
 * Universal trade-history importers.
 *
 * Adds TradingView (strategy-tester "List of Trades" and generic position
 * exports), Binance Futures position-history, and Bybit closed-P&L CSV
 * support on top of the MetaTrader parsers, plus a single auto-detecting
 * entry point for any uploaded file.
 */

import {
  detectDelimiter,
  parseDate,
  parseMetaTraderFile,
  splitCsvRow,
  toNumber,
  type ParseResult,
  type ParsedTrade,
} from "./metatrader";

// ---------------------------------------------------------------------------
// Shared CSV helpers
// ---------------------------------------------------------------------------

type CsvTable = { headers: string[]; rows: string[][] };

function readCsv(content: string): CsvTable | null {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return null;
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvRow(lines[0], delimiter).map((h) =>
    h.replace(/^﻿/, "").trim().toLowerCase(),
  );
  const rows = lines.slice(1).map((l) => splitCsvRow(l, delimiter));
  return { headers, rows };
}

function col(table: CsvTable, ...names: string[]): number {
  for (const name of names) {
    const idx = table.headers.findIndex(
      (h) => h === name || h.startsWith(name),
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

function cell(row: string[], idx: number): string {
  return idx >= 0 && idx < row.length ? row[idx].trim() : "";
}

/** Lenient date parser: MT patterns first, then ISO-without-seconds, then Date.parse. */
function parseAnyDate(raw: string): Date | null {
  if (!raw) return null;
  const direct = parseDate(raw);
  if (direct) return direct;
  const withSeconds = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}$/.test(raw.trim())
    ? `${raw.trim()}:00`
    : raw.trim();
  return parseDate(withSeconds);
}

function looseNumber(raw: string): number {
  if (!raw) return 0;
  // Strip currency symbols, unit suffixes ("0.5 BTC"), thousands separators.
  const cleaned = raw.replace(/[^0-9.eE+-]/g, "");
  const value = Number(cleaned);
  return isNaN(value) ? toNumber(raw) : value;
}

/** Best-effort symbol guess from a file name, e.g. "EURUSD_2024_list-of-trades.csv". */
export function symbolFromFileName(fileName: string | undefined): string {
  if (!fileName) return "UNKNOWN";
  const base = fileName.replace(/\.[a-z0-9]+$/i, "");
  const match = base.toUpperCase().match(/[A-Z]{3}[A-Z0-9]{2,7}/);
  return match ? match[0] : "UNKNOWN";
}

// ---------------------------------------------------------------------------
// TradingView
// ---------------------------------------------------------------------------

/**
 * TradingView strategy tester "List of Trades" export: paired
 * "Entry Long"/"Exit Long" rows sharing a trade number, no symbol column.
 */
export function parseTradingViewCsv(
  content: string,
  fileName?: string,
): ParseResult {
  const trades: ParsedTrade[] = [];
  const errors: string[] = [];
  const table = readCsv(content);
  if (!table) {
    return { trades, errors: ["Empty or invalid CSV"], format: "tradingview" };
  }

  const iTrade = col(table, "trade #", "trade");
  const iType = col(table, "type");
  const iSignal = col(table, "signal");
  const iTime = col(table, "date/time", "date", "time");
  const iPrice = col(table, "price");
  const iQty = col(table, "contracts", "qty", "quantity");
  const iProfit = col(table, "profit");
  const iSymbol = col(table, "symbol", "ticker", "instrument");

  if (iType < 0 || iTime < 0 || iPrice < 0) {
    return {
      trades,
      errors: ["Not a recognised TradingView export (missing Type/Date/Price columns)"],
      format: "tradingview",
    };
  }

  const fallbackSymbol = symbolFromFileName(fileName);

  type Leg = { time: Date; price: number; qty: number; signal: string; profit: number; symbol: string };
  const groups = new Map<string, { entry?: Leg & { direction: "LONG" | "SHORT" }; exit?: Leg }>();

  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r];
    const type = cell(row, iType).toLowerCase();
    if (!type.includes("entry") && !type.includes("exit")) continue;
    const time = parseAnyDate(cell(row, iTime));
    if (!time) {
      errors.push(`Row ${r + 2}: invalid date "${cell(row, iTime)}"`);
      continue;
    }
    const key = iTrade >= 0 ? cell(row, iTrade) : String(r);
    const leg: Leg = {
      time,
      price: looseNumber(cell(row, iPrice)),
      qty: looseNumber(cell(row, iQty)) || 1,
      signal: cell(row, iSignal),
      profit: looseNumber(cell(row, iProfit)),
      symbol: iSymbol >= 0 ? cell(row, iSymbol).toUpperCase() : "",
    };
    const group = groups.get(key) ?? {};
    if (type.includes("entry")) {
      group.entry = { ...leg, direction: type.includes("short") ? "SHORT" : "LONG" };
    } else {
      group.exit = leg;
    }
    groups.set(key, group);
  }

  for (const [key, group] of groups) {
    if (!group.entry) continue;
    trades.push({
      ticket: key,
      symbol: group.entry.symbol || fallbackSymbol,
      direction: group.entry.direction,
      volume: group.entry.qty,
      entryPrice: group.entry.price,
      exitPrice: group.exit?.price ?? 0,
      stopLoss: null,
      takeProfit: null,
      openedAt: group.entry.time,
      closedAt: group.exit?.time ?? null,
      commission: 0,
      swap: 0,
      profit: group.exit?.profit ?? group.entry.profit,
      comment: group.entry.signal,
    });
  }

  trades.sort((a, b) => a.openedAt.getTime() - b.openedAt.getTime());
  if (trades.length === 0 && errors.length === 0) {
    errors.push("No trades found in the TradingView export");
  }
  return { trades, errors, format: "tradingview" };
}

// ---------------------------------------------------------------------------
// Binance (Futures position history / closed positions export)
// ---------------------------------------------------------------------------

export function parseBinanceCsv(content: string): ParseResult {
  const trades: ParsedTrade[] = [];
  const errors: string[] = [];
  const table = readCsv(content);
  if (!table) {
    return { trades, errors: ["Empty or invalid CSV"], format: "binance" };
  }

  const iSymbol = col(table, "symbol", "pair");
  const iSide = col(table, "side", "position side", "direction");
  const iEntry = col(table, "entry price", "avg. entry", "avg entry", "open price");
  const iExit = col(table, "avg. close price", "avg close price", "close price", "exit price");
  const iPnl = col(table, "realized pnl", "realized profit", "closing pnl", "pnl");
  const iQty = col(table, "closed vol", "max open interest", "qty", "amount", "size");
  const iOpened = col(table, "opened", "open time", "time opened", "created");
  const iClosed = col(table, "closed", "close time", "time closed", "updated");

  if (iSymbol < 0 || iEntry < 0) {
    return {
      trades,
      errors: ["Not a recognised Binance export (missing Symbol/Entry Price columns)"],
      format: "binance",
    };
  }

  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r];
    const symbol = cell(row, iSymbol).toUpperCase();
    if (!symbol) continue;
    const openedAt = parseAnyDate(cell(row, iOpened)) ?? parseAnyDate(cell(row, iClosed));
    if (!openedAt) {
      errors.push(`Row ${r + 2}: missing open/close time`);
      continue;
    }
    const side = cell(row, iSide).toLowerCase();
    trades.push({
      ticket: `${symbol}-${openedAt.getTime()}`,
      symbol,
      direction: side.includes("short") || side.includes("sell") ? "SHORT" : "LONG",
      volume: looseNumber(cell(row, iQty)),
      entryPrice: looseNumber(cell(row, iEntry)),
      exitPrice: looseNumber(cell(row, iExit)),
      stopLoss: null,
      takeProfit: null,
      openedAt,
      closedAt: parseAnyDate(cell(row, iClosed)),
      commission: 0,
      swap: 0,
      profit: looseNumber(cell(row, iPnl)),
      comment: "",
    });
  }

  if (trades.length === 0 && errors.length === 0) {
    errors.push("No positions found in the Binance export");
  }
  return { trades, errors, format: "binance" };
}

// ---------------------------------------------------------------------------
// Bybit (Closed P&L export)
// ---------------------------------------------------------------------------

export function parseBybitCsv(content: string): ParseResult {
  const trades: ParsedTrade[] = [];
  const errors: string[] = [];
  const table = readCsv(content);
  if (!table) {
    return { trades, errors: ["Empty or invalid CSV"], format: "bybit" };
  }

  const iSymbol = col(table, "contracts", "symbol", "pair");
  const iDir = col(table, "closing direction", "side", "direction", "trade type");
  const iQty = col(table, "qty", "closed size", "quantity");
  const iEntry = col(table, "entry price", "avg entry price", "order price");
  const iExit = col(table, "exit price", "avg exit price");
  const iPnl = col(table, "closed p&l", "closed pnl", "realized p&l", "realized pnl");
  const iTime = col(table, "trade time", "transaction time", "time", "create time");

  if (iSymbol < 0 || iPnl < 0) {
    return {
      trades,
      errors: ["Not a recognised Bybit export (missing Contracts/Closed P&L columns)"],
      format: "bybit",
    };
  }

  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r];
    const symbol = cell(row, iSymbol).toUpperCase();
    if (!symbol) continue;
    const time = parseAnyDate(cell(row, iTime)) ?? new Date();
    const dir = cell(row, iDir).toLowerCase();
    // Bybit "Closing Direction" is the closing order side: closing a LONG is a Sell.
    const isShort = dir.includes("close short") || dir === "buy" || dir.includes("short");
    const isLong = dir.includes("close long") || dir === "sell" || dir.includes("long");
    trades.push({
      ticket: `${symbol}-${time.getTime()}-${r}`,
      symbol,
      direction: isShort && !isLong ? "SHORT" : "LONG",
      volume: looseNumber(cell(row, iQty)),
      entryPrice: looseNumber(cell(row, iEntry)),
      exitPrice: looseNumber(cell(row, iExit)),
      stopLoss: null,
      takeProfit: null,
      openedAt: time,
      closedAt: time,
      commission: 0,
      swap: 0,
      profit: looseNumber(cell(row, iPnl)),
      comment: "",
    });
  }

  if (trades.length === 0 && errors.length === 0) {
    errors.push("No closed positions found in the Bybit export");
  }
  return { trades, errors, format: "bybit" };
}

// ---------------------------------------------------------------------------
// Auto-detecting entry point
// ---------------------------------------------------------------------------

export type SourcePlatform = "metatrader" | "tradingview" | "binance" | "bybit";

export function detectCsvPlatform(content: string): SourcePlatform {
  const firstLine = content.split(/\r?\n/, 1)[0]?.toLowerCase() ?? "";
  if (
    firstLine.includes("closed p&l") ||
    firstLine.includes("closing direction") ||
    (firstLine.includes("contracts") && firstLine.includes("exit price"))
  ) {
    return "bybit";
  }
  if (
    firstLine.includes("realized pnl") ||
    firstLine.includes("avg. close price") ||
    firstLine.includes("closing pnl")
  ) {
    return "binance";
  }
  if (
    firstLine.includes("trade #") ||
    firstLine.includes("profit %") ||
    firstLine.includes("cum. profit") ||
    (firstLine.includes("signal") && firstLine.includes("date/time"))
  ) {
    return "tradingview";
  }
  return "metatrader";
}

/**
 * Parse any supported trade-history file: MT4 HTML, MT5 XML, or CSV from
 * MetaTrader, TradingView, Binance, or Bybit.
 */
export function parseTradeFile(content: string, fileName?: string): ParseResult {
  const trimmed = content.trimStart();
  const isMarkup =
    trimmed.startsWith("<") ||
    trimmed.toLowerCase().includes("<html") ||
    trimmed.startsWith("<?xml");

  if (!isMarkup) {
    switch (detectCsvPlatform(content)) {
      case "tradingview":
        return parseTradingViewCsv(content, fileName);
      case "binance":
        return parseBinanceCsv(content);
      case "bybit":
        return parseBybitCsv(content);
      case "metatrader":
        break;
    }
  }

  return parseMetaTraderFile(content);
}
