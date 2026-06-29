export const contextTagNames = [
  "MTR",
  "BTB",
  "EMA Divergence",
  "Spike",
  "Breakout",
  "Trading Range",
  "Micro Channel",
] as const;

export const entryTypes = ["E1", "E2", "E3"] as const;

export const skipReasons = [
  "Far from EMA",
  "Unsafe Stop",
  "Low Volume",
  "Range",
  "News",
  "Psychology",
] as const;

export const sessionNames = [
  "Pre-Market",
  "Open",
  "Midday",
  "Close",
  "Post-Market",
] as const;

export type ContextTagName = (typeof contextTagNames)[number];
export type EntryType = (typeof entryTypes)[number];
export type SkipReason = (typeof skipReasons)[number];
export type SessionName = (typeof sessionNames)[number];

export type Grade = "A+" | "A" | "A-" | "B+" | "B" | "C" | "D" | "F";
export type EntryStatus = "Taken" | "Skipped" | "Not Formed" | "Waiting";
export type OpportunityStatus = "Taken" | "Skipped" | "Not Formed" | "Watching";

export type ContextTag = {
  name: ContextTagName;
  enabled: boolean;
  weight: number;
};

export type EntryPlan = {
  type: EntryType;
  status: EntryStatus;
  skipReason?: SkipReason;
};

export type Opportunity = {
  id: string;
  ticker: string;
  pair: string;
  setup: string;
  bias: string;
  primaryContext: string;
  session: SessionName;
  status: OpportunityStatus;
  contextTags: ContextTag[];
  confirmations: number;
  grade: Grade;
  entries: EntryPlan[];
  riskReward: number;
  quality: string;
  time: string;
  notes: string;
  resultR?: number;
};

export type Trade = {
  id: string;
  ticker: string;
  setup: string;
  session: SessionName;
  grade: Grade;
  rMultiple: number;
  pnl: number;
  ruleBreak: boolean;
  hour: number;
  date: string;
};

export type PlaybookSetup = {
  id: string;
  name: string;
  context: string;
  active: boolean;
  validConditions: string[];
  invalidConditions: string[];
  entryLogic: string[];
  exitLogic: string[];
};

export type SopGroup = {
  title: string;
  completed: number;
  total: number;
  items: { label: string; checked: boolean }[];
};
