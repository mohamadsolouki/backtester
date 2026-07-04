/**
 * MetaTrader trade history parser.
 *
 * Handles MT4 HTML statements, MT5 XML exports, MT5 "Trade History Report"
 * Excel exports, and generic CSV files, normalising them into a common
 * ParsedTrade format.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ParsedTrade = {
  ticket: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  volume: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: Date;
  closedAt: Date | null;
  commission: number;
  swap: number;
  profit: number;
  comment: string;
};

export type ParseResult = {
  trades: ParsedTrade[];
  errors: string[];
  format:
    | "mt4-html"
    | "mt5-xml"
    | "mt5-xlsx"
    | "csv"
    | "tradingview"
    | "binance"
    | "bybit"
    | "unknown";
};

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------

const DATE_PATTERNS: { re: RegExp; build: (m: RegExpMatchArray) => Date }[] = [
  // 2024.01.15 10:30:00
  {
    re: /^(\d{4})[./](\d{2})[./](\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
    build: (m) =>
      new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6]),
      ),
  },
  // 2024-01-15T10:30:00 (ISO-ish, with or without T)
  {
    re: /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})$/,
    build: (m) =>
      new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6]),
      ),
  },
  // 2024/01/15 10:30:00
  {
    re: /^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/,
    build: (m) =>
      new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6]),
      ),
  },
  // Date-only fallback: 2024.01.15 / 2024-01-15 / 2024/01/15
  {
    re: /^(\d{4})[./-](\d{2})[./-](\d{2})$/,
    build: (m) => new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
  },
];

export function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  for (const { re, build } of DATE_PATTERNS) {
    const m = trimmed.match(re);
    if (m) {
      const d = build(m);
      if (!isNaN(d.getTime())) return d;
    }
  }

  // Last resort: native Date constructor
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toNumber(raw: string | undefined): number {
  if (raw === undefined || raw === null) return 0;
  const cleaned = raw.replace(/\s/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
}

function toDirection(raw: string): "LONG" | "SHORT" {
  const lower = raw.toLowerCase().trim();
  if (lower === "sell" || lower === "short") return "SHORT";
  return "LONG";
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

function isTradeLine(type: string): boolean {
  const lower = type.toLowerCase().trim();
  return lower === "buy" || lower === "sell";
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

export function detectFormat(content: string): "mt4-html" | "mt5-xml" | "csv" | "unknown" {
  const trimmed = content.trim();

  // MT4 HTML: contains <html and a table with "Ticket" header
  if (/<html[\s>]/i.test(trimmed) && /ticket/i.test(trimmed)) {
    return "mt4-html";
  }

  // MT5 XML: starts with XML declaration or has <report>/<trades> tags
  if (
    /^<\?xml/i.test(trimmed) ||
    (/<trades?[\s>]/i.test(trimmed) && /<ticket[\s>]/i.test(trimmed))
  ) {
    return "mt5-xml";
  }

  // CSV/TSV: first line looks like a header with trade-related columns
  const firstLine = trimmed.split(/\r?\n/)[0] ?? "";
  const headerLower = firstLine.toLowerCase();
  if (
    (headerLower.includes("ticket") || headerLower.includes("symbol")) &&
    (headerLower.includes("profit") || headerLower.includes("price"))
  ) {
    return "csv";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// MT4 HTML Parser
// ---------------------------------------------------------------------------

export function parseMT4Html(html: string): ParseResult {
  const trades: ParsedTrade[] = [];
  const errors: string[] = [];

  if (!html.trim()) {
    errors.push("Empty input");
    return { trades, errors, format: "mt4-html" };
  }

  // Find all tables and locate the one whose header row contains "Ticket"
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tradesTableBody: string | null = null;

  let tableMatch: RegExpExecArray | null;
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableContent = tableMatch[1];
    // Check if first row contains "Ticket"
    const firstRowMatch = tableContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (firstRowMatch && /ticket/i.test(stripHtml(firstRowMatch[1]))) {
      tradesTableBody = tableContent;
      break;
    }
  }

  if (!tradesTableBody) {
    errors.push("Could not find trades table (no table with 'Ticket' header found)");
    return { trades, errors, format: "mt4-html" };
  }

  // Extract all rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[] = [];
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tradesTableBody)) !== null) {
    rows.push(rowMatch[1]);
  }

  // First row is header - skip it
  // MT4 column order:
  //  0: Ticket, 1: Open Time, 2: Type, 3: Size, 4: Item (symbol),
  //  5: Price (open), 6: S/L, 7: T/P, 8: Close Time, 9: Price (close),
  // 10: Commission, 11: Taxes, 12: Swap, 13: Profit
  for (let i = 1; i < rows.length; i++) {
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rows[i])) !== null) {
      cells.push(stripHtml(cellMatch[1]));
    }

    if (cells.length < 14) {
      // Could be a summary row or otherwise incomplete
      if (cells.length > 0 && cells[0].trim() !== "") {
        errors.push(`Row ${i}: expected 14 columns, got ${cells.length} (skipped)`);
      }
      continue;
    }

    const type = cells[2];
    if (!isTradeLine(type)) {
      // Skip non-trade rows (balance, credit, etc.)
      continue;
    }

    const openedAt = parseDate(cells[1]);
    if (!openedAt) {
      errors.push(`Row ${i} (ticket ${cells[0]}): invalid open time "${cells[1]}"`);
      continue;
    }

    const closedAt = parseDate(cells[8]);
    const sl = toNumber(cells[6]);
    const tp = toNumber(cells[7]);

    trades.push({
      ticket: cells[0].trim(),
      symbol: cells[4].trim(),
      direction: toDirection(type),
      volume: toNumber(cells[3]),
      entryPrice: toNumber(cells[5]),
      exitPrice: toNumber(cells[9]),
      stopLoss: sl === 0 ? null : sl,
      takeProfit: tp === 0 ? null : tp,
      openedAt,
      closedAt,
      commission: toNumber(cells[10]),
      swap: toNumber(cells[12]),
      profit: toNumber(cells[13]),
      comment: "",
    });
  }

  if (trades.length === 0 && errors.length === 0) {
    errors.push("No valid trades found in the HTML statement");
  }

  return { trades, errors, format: "mt4-html" };
}

// ---------------------------------------------------------------------------
// MT5 XML Parser
// ---------------------------------------------------------------------------

function extractXmlTagValue(xml: string, tagName: string): string | null {
  // Case-insensitive tag extraction
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function extractAllXmlBlocks(xml: string, tagName: string): string[] {
  const re = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?<\\/${tagName}>`, "gi");
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    matches.push(m[0]);
  }
  return matches;
}

export function parseMT5Xml(xml: string): ParseResult {
  const trades: ParsedTrade[] = [];
  const errors: string[] = [];

  if (!xml.trim()) {
    errors.push("Empty input");
    return { trades, errors, format: "mt5-xml" };
  }

  // Find all <trade> blocks (case-insensitive).
  // They might be nested under <trades> inside <report>, or directly at root.
  const tradeBlocks = extractAllXmlBlocks(xml, "trade");

  if (tradeBlocks.length === 0) {
    errors.push("No <trade> elements found in the XML");
    return { trades, errors, format: "mt5-xml" };
  }

  for (let i = 0; i < tradeBlocks.length; i++) {
    const block = tradeBlocks[i];

    const ticket = extractXmlTagValue(block, "ticket");
    const symbol = extractXmlTagValue(block, "symbol");
    const type = extractXmlTagValue(block, "type");
    const openTimeRaw = extractXmlTagValue(block, "openTime");

    if (!ticket) {
      errors.push(`Trade block ${i + 1}: missing <ticket>`);
      continue;
    }
    if (!type) {
      errors.push(`Trade block ${i + 1} (ticket ${ticket}): missing <type>`);
      continue;
    }
    if (!openTimeRaw) {
      errors.push(`Trade block ${i + 1} (ticket ${ticket}): missing <openTime>`);
      continue;
    }

    const openedAt = parseDate(openTimeRaw);
    if (!openedAt) {
      errors.push(`Trade block ${i + 1} (ticket ${ticket}): invalid openTime "${openTimeRaw}"`);
      continue;
    }

    if (!isTradeLine(type)) {
      // Skip non-trade entries (balance adjustments etc.)
      continue;
    }

    const closeTimeRaw = extractXmlTagValue(block, "closeTime");
    const closedAt = closeTimeRaw ? parseDate(closeTimeRaw) : null;

    const sl = toNumber(extractXmlTagValue(block, "stopLoss") ?? "");
    const tp = toNumber(extractXmlTagValue(block, "takeProfit") ?? "");

    // Volume can appear as "volume" or "lots"
    const volumeRaw =
      extractXmlTagValue(block, "volume") ?? extractXmlTagValue(block, "lots") ?? "0";

    trades.push({
      ticket: ticket.trim(),
      symbol: (symbol ?? "").trim(),
      direction: toDirection(type),
      volume: toNumber(volumeRaw),
      entryPrice: toNumber(extractXmlTagValue(block, "openPrice") ?? ""),
      exitPrice: toNumber(extractXmlTagValue(block, "closePrice") ?? ""),
      stopLoss: sl === 0 ? null : sl,
      takeProfit: tp === 0 ? null : tp,
      openedAt,
      closedAt,
      commission: toNumber(extractXmlTagValue(block, "commission") ?? ""),
      swap: toNumber(extractXmlTagValue(block, "swap") ?? ""),
      profit: toNumber(extractXmlTagValue(block, "profit") ?? ""),
      comment: (extractXmlTagValue(block, "comment") ?? "").trim(),
    });
  }

  if (trades.length === 0 && errors.length === 0) {
    errors.push("No valid trades found in the XML");
  }

  return { trades, errors, format: "mt5-xml" };
}

// ---------------------------------------------------------------------------
// MT5 Excel "Trade History Report" Parser
// ---------------------------------------------------------------------------
//
// The standard MT5 terminal "Report" -> "Save as report" Excel export packs
// three tables into one sheet, stacked vertically: Positions, Orders, and
// Deals (followed by a Results summary). Of the three, "Positions" is the
// one that matters here — each row is already a single closed position with
// matched open/close price, S/L, T/P, commission, swap, and profit, which
// maps directly onto our per-position Trade model. Orders/Deals are the
// lower-level order- and execution-level records MT5 also logs (useful for
// MT5's own auditing, not for journaling individual trades) and are skipped.
//
// Column order under the "Positions" header:
//   0 Time (open)  1 Position (ticket)  2 Symbol  3 Type  4 Volume
//   5 Price (open) 6 S/L  7 T/P  8 Time (close)  9 Price (close)
//  10 Commission  11 Swap  12 Profit

type SheetCell = string | number | undefined | null;

function cellString(value: SheetCell): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function cellNumber(value: SheetCell): number {
  if (typeof value === "number") return value;
  return toNumber(cellString(value));
}

/**
 * Parses rows already extracted from the workbook (via
 * `XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true })` in the
 * browser) — kept separate from the actual `xlsx` read so this module's
 * other parsers stay dependency-free.
 */
export function parseMT5ExcelRows(rows: SheetCell[][]): ParseResult {
  const trades: ParsedTrade[] = [];
  const errors: string[] = [];

  const sectionStart = rows.findIndex((row) => cellString(row[0]).toLowerCase() === "positions");
  if (sectionStart === -1) {
    errors.push('Could not find a "Positions" section in the Excel report. Expected an MT5 "Trade History Report" export.');
    return { trades, errors, format: "mt5-xlsx" };
  }

  // sectionStart + 1 is the column header row ("Time", "Position", "Symbol", ...) — data starts after it.
  for (let i = sectionStart + 2; i < rows.length; i++) {
    const row = rows[i];
    const first = cellString(row[0]);
    if (!first) break; // blank row marks the end of the Positions section
    if (first.toLowerCase() === "orders") break;

    const type = cellString(row[3]);
    if (!isTradeLine(type)) continue;

    const openedAt = parseDate(first);
    if (!openedAt) {
      errors.push(`Row ${i + 1} (position ${cellString(row[1])}): invalid open time "${first}"`);
      continue;
    }

    const closedAt = parseDate(cellString(row[8]));
    const sl = cellNumber(row[6]);
    const tp = cellNumber(row[7]);

    trades.push({
      ticket: cellString(row[1]),
      symbol: cellString(row[2]),
      direction: toDirection(type),
      volume: cellNumber(row[4]),
      entryPrice: cellNumber(row[5]),
      exitPrice: cellNumber(row[9]),
      stopLoss: sl === 0 ? null : sl,
      takeProfit: tp === 0 ? null : tp,
      openedAt,
      closedAt,
      commission: cellNumber(row[10]),
      swap: cellNumber(row[11]),
      profit: cellNumber(row[12]),
      comment: "",
    });
  }

  if (trades.length === 0 && errors.length === 0) {
    errors.push("No closed positions found in the Positions section.");
  }

  return { trades, errors, format: "mt5-xlsx" };
}

// ---------------------------------------------------------------------------
// CSV/TSV Parser
// ---------------------------------------------------------------------------

/** Canonical column names mapped from common MT export header variations. */
const COLUMN_ALIASES: Record<string, string> = {
  ticket: "ticket",
  "#": "ticket",
  "order": "ticket",
  "order#": "ticket",
  "deal": "ticket",
  symbol: "symbol",
  item: "symbol",
  instrument: "symbol",
  type: "type",
  direction: "type",
  side: "type",
  size: "volume",
  volume: "volume",
  lots: "volume",
  "open price": "entryPrice",
  openprice: "entryPrice",
  "entry price": "entryPrice",
  price: "entryPrice",
  "close price": "exitPrice",
  closeprice: "exitPrice",
  "exit price": "exitPrice",
  "s/l": "stopLoss",
  sl: "stopLoss",
  "stop loss": "stopLoss",
  stoploss: "stopLoss",
  "t/p": "takeProfit",
  tp: "takeProfit",
  "take profit": "takeProfit",
  takeprofit: "takeProfit",
  "open time": "openTime",
  opentime: "openTime",
  opened: "openTime",
  "open date": "openTime",
  "close time": "closeTime",
  closetime: "closeTime",
  closed: "closeTime",
  "close date": "closeTime",
  commission: "commission",
  swap: "swap",
  profit: "profit",
  "net profit": "profit",
  comment: "comment",
  taxes: "taxes",
};

export function detectDelimiter(header: string): string {
  const tabCount = (header.match(/\t/g) ?? []).length;
  const commaCount = (header.match(/,/g) ?? []).length;
  const semicolonCount = (header.match(/;/g) ?? []).length;

  if (tabCount >= commaCount && tabCount >= semicolonCount) return "\t";
  if (semicolonCount > commaCount) return ";";
  return ",";
}

export function splitCsvRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function parseMTCsv(csv: string): ParseResult {
  const trades: ParsedTrade[] = [];
  const errors: string[] = [];

  if (!csv.trim()) {
    errors.push("Empty input");
    return { trades, errors, format: "csv" };
  }

  const lines = csv.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    errors.push("CSV must contain a header row and at least one data row");
    return { trades, errors, format: "csv" };
  }

  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  const rawHeaders = splitCsvRow(headerLine, delimiter);

  // Map header positions to canonical field names
  const columnMap = new Map<number, string>();
  for (let i = 0; i < rawHeaders.length; i++) {
    const normalised = rawHeaders[i].toLowerCase().trim();
    const canonical = COLUMN_ALIASES[normalised];
    if (canonical) {
      columnMap.set(i, canonical);
    }
  }

  // We need at least ticket and type (or some trade-identifying columns)
  const fieldNames = new Set(columnMap.values());
  if (!fieldNames.has("ticket") && !fieldNames.has("symbol")) {
    errors.push("CSV headers do not match expected MetaTrader column names");
    return { trades, errors, format: "csv" };
  }

  for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
    const cells = splitCsvRow(lines[rowIdx], delimiter);
    const row: Record<string, string> = {};
    columnMap.forEach((fieldName, colIdx) => {
      if (colIdx < cells.length) {
        row[fieldName] = cells[colIdx];
      }
    });

    // Skip rows without a type or with non-trade types
    const type = (row["type"] ?? "").trim();
    if (!type) continue;
    if (!isTradeLine(type)) continue;

    const openedAt = parseDate(row["openTime"] ?? "");
    if (!openedAt) {
      const ticket = row["ticket"] ?? `row ${rowIdx + 1}`;
      errors.push(`Row ${rowIdx + 1} (ticket ${ticket}): invalid open time`);
      continue;
    }

    const closedAt = parseDate(row["closeTime"] ?? "");
    const sl = toNumber(row["stopLoss"]);
    const tp = toNumber(row["takeProfit"]);

    trades.push({
      ticket: (row["ticket"] ?? "").trim(),
      symbol: (row["symbol"] ?? "").trim(),
      direction: toDirection(type),
      volume: toNumber(row["volume"]),
      entryPrice: toNumber(row["entryPrice"]),
      exitPrice: toNumber(row["exitPrice"]),
      stopLoss: sl === 0 ? null : sl,
      takeProfit: tp === 0 ? null : tp,
      openedAt,
      closedAt,
      commission: toNumber(row["commission"]),
      swap: toNumber(row["swap"]),
      profit: toNumber(row["profit"]),
      comment: (row["comment"] ?? "").trim(),
    });
  }

  if (trades.length === 0 && errors.length === 0) {
    errors.push("No valid trades found in the CSV");
  }

  return { trades, errors, format: "csv" };
}

// ---------------------------------------------------------------------------
// Auto-detect and parse
// ---------------------------------------------------------------------------

export function parseMetaTraderFile(content: string): ParseResult {
  const format = detectFormat(content);

  switch (format) {
    case "mt4-html":
      return parseMT4Html(content);
    case "mt5-xml":
      return parseMT5Xml(content);
    case "csv":
      return parseMTCsv(content);
    case "unknown":
      return {
        trades: [],
        errors: [
          "Could not detect file format. Expected an MT4 HTML statement, MT5 XML export, or CSV/TSV with standard MetaTrader column headers.",
        ],
        format: "unknown",
      };
  }
}
