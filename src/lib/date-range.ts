import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { sessionNames, type SessionName } from "@/lib/domain";

/** Maps the UI's display session names to the Prisma `SessionName` enum values. */
export const SESSION_DB_VALUES: Record<SessionName, string> = {
  "Pre-Market": "PRE_MARKET",
  Open: "OPEN",
  Midday: "MIDDAY",
  Close: "CLOSE",
  "Post-Market": "POST_MARKET",
};

const DB_VALUE_TO_SESSION_NAME: Record<string, SessionName> = Object.fromEntries(
  Object.entries(SESSION_DB_VALUES).map(([label, value]) => [value, label])
) as Record<string, SessionName>;

/** Reverses SESSION_DB_VALUES so a raw Prisma enum value can be displayed and translated. */
export function sessionNameFromDbValue(value: string): SessionName {
  return DB_VALUE_TO_SESSION_NAME[value] ?? (value as SessionName);
}

export function sessionsToDbValues(sessions: SessionName[]): string[] {
  return sessions.map((s) => SESSION_DB_VALUES[s]);
}

export type DateRangePreset = "today" | "this_week" | "this_month" | "qtd" | "ytd" | "all_time" | "custom";

export const DATE_RANGE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "qtd", label: "Quarter to Date" },
  { value: "ytd", label: "Year to Date" },
  { value: "all_time", label: "All Time" },
];

export type ResolvedDateRange = { from?: Date; to?: Date };

/** All-time (no `from`/`to`) is the default for any preset other than these. */
export function resolvePreset(preset: DateRangePreset, now: Date = new Date()): ResolvedDateRange {
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "this_week":
      return { from: startOfWeek(now), to: endOfWeek(now) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "qtd":
      return { from: startOfQuarter(now), to: endOfDay(now) };
    case "ytd":
      return { from: startOfYear(now), to: endOfDay(now) };
    case "all_time":
    case "custom":
    default:
      return {};
  }
}

export function formatDateRangeLabel(
  preset: DateRangePreset,
  range: ResolvedDateRange,
  formatFn: (date: Date, pattern: string) => string,
  t: (source: string) => string = (s) => s
): string {
  if (preset !== "custom") {
    const label = DATE_RANGE_PRESETS.find((p) => p.value === preset)?.label ?? "All Time";
    return t(label);
  }
  if (!range.from && !range.to) return t("All Time");
  if (range.from && range.to) {
    return `${formatFn(range.from, "MMM d, yyyy")} – ${formatFn(range.to, "MMM d, yyyy")}`;
  }
  if (range.from) return `${t("From")} ${formatFn(range.from, "MMM d, yyyy")}`;
  return `${t("Until")} ${formatFn(range.to as Date, "MMM d, yyyy")}`;
}

export type DateRangeSearchParams = Record<string, string | string[] | undefined>;

const PRESET_VALUES: DateRangePreset[] = [...DATE_RANGE_PRESETS.map((p) => p.value), "custom"];

/** Parses the header's `?range=`/`?from=`/`?to=`/`?sessions=` query params into a usable filter. */
export function parseDateRangeSearchParams(searchParams: DateRangeSearchParams): {
  preset: DateRangePreset;
  range: ResolvedDateRange;
  sessions: SessionName[];
} {
  const rawPreset = typeof searchParams.range === "string" ? searchParams.range : "all_time";
  const preset = PRESET_VALUES.includes(rawPreset as DateRangePreset)
    ? (rawPreset as DateRangePreset)
    : "all_time";

  let range: ResolvedDateRange;
  if (preset === "custom") {
    const fromRaw = typeof searchParams.from === "string" ? new Date(searchParams.from) : undefined;
    const toRaw = typeof searchParams.to === "string" ? new Date(searchParams.to) : undefined;
    range = {
      from: fromRaw && !Number.isNaN(fromRaw.getTime()) ? fromRaw : undefined,
      to: toRaw && !Number.isNaN(toRaw.getTime()) ? toRaw : undefined,
    };
  } else {
    range = resolvePreset(preset);
  }

  const sessionsRaw = typeof searchParams.sessions === "string" ? searchParams.sessions : "";
  const sessions = sessionsRaw
    .split(",")
    .filter((s): s is SessionName => sessionNames.includes(s as SessionName));

  return { preset, range, sessions };
}
