export type HelpSection = {
  heading: string;
  body: string;
};

export type ModuleHelp = {
  id: string;
  label: string;
  icon: string;
  tagline: string;
  sections: HelpSection[];
};

export const helpModules: ModuleHelp[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "LayoutDashboard",
    tagline: "Your daily trading command center.",
    sections: [
      {
        heading: "What you see",
        body: "The Overview shows your KPIs (win rate, profit factor, expectancy, total P&L) for the active date range, an equity curve, active watchlist items, and recent journal entries. Everything updates when you change the date or session filter in the header.",
      },
      {
        heading: "Quick Actions",
        body: "Use the Quick Actions card on the right to jump to any part of the platform. The Onboarding card (shown once) walks you through the full Plan → Execute → Analyze loop.",
      },
      {
        heading: "Date & session filter",
        body: "The date range picker and session pills in the top bar filter all data across the platform. Select a preset (Today, This Week, QTD, YTD) or pick a custom range. Session pills (Pre-Market, Open, Midday, Close, Post-Market) narrow results to trades opened during that session.",
      },
    ],
  },
  {
    id: "watchlist",
    label: "Watchlist",
    icon: "Activity",
    tagline: "Plan and track every trade idea before you pull the trigger.",
    sections: [
      {
        heading: "Workflow",
        body: "Create an opportunity when you identify a potential trade. Fill in Ticker, Setup, Bias, and Primary Context. As the trade develops, tag which context confirmations are active and advance the status from Watching → Taken or Skipped.",
      },
      {
        heading: "Status flow",
        body: "Planned → Watching → Taken (linked to a Journal entry) or Skipped / Not Formed. Reviewed is the final state after you complete a trade review.",
      },
      {
        heading: "Context tags",
        body: "Tags represent market conditions that confirm or contradict the setup. Positive-weight tags (default weight +1) add to the opportunity score; tags marked Bearish or Trading Range carry weight −1. The confirmation count drives your grade.",
      },
      {
        heading: "Grade",
        body: "A+/A/B/C/D/F grades are set manually after you evaluate the full picture. Use grade filters on the Watchlist page to focus on high-conviction setups.",
      },
    ],
  },
  {
    id: "playbook",
    label: "Playbook",
    icon: "BookOpen",
    tagline: "Your documented edge — setups you have proven work.",
    sections: [
      {
        heading: "What goes here",
        body: "Each Playbook entry documents one repeatable setup: valid/invalid conditions, entry logic, exit logic, and notes. Only add a setup after you have enough data to believe in it.",
      },
      {
        heading: "Linking to trades",
        body: "When you create a Watchlist opportunity, pick a setup name from your Playbook. The Edge Lab (Backtest tab) groups trade performance by setup so you can see which playbooks are actually delivering.",
      },
    ],
  },
  {
    id: "journal",
    label: "Journal",
    icon: "BookMarked",
    tagline: "The authoritative record of every trade you have taken.",
    sections: [
      {
        heading: "Adding trades",
        body: "You can add trades manually one by one, or bulk-import from MetaTrader using the Import tab. Manual entries are ideal for forward-testing a specific setup; imports are best for reviewing a completed session.",
      },
      {
        heading: "Rule breaks",
        body: "Tag each trade with any rule breaks (moved stop, oversized position, FOMO entry, etc.). This data surfaces in the Analytics tab so you can see whether rule breaks correlate with losses.",
      },
      {
        heading: "R-Multiple",
        body: "R is your risk-adjusted return — how many times your initial risk you made or lost. A +2R trade means you made twice your risk. Target an average R above your minimum R setting in Settings.",
      },
    ],
  },
  {
    id: "routine",
    label: "Routine",
    icon: "ClipboardList",
    tagline: "Pre-market and post-market SOP checklists.",
    sections: [
      {
        heading: "Purpose",
        body: "The Routine module stores your Standard Operating Procedure documents — step-by-step pre-market prep, intraday rules, and post-market review checklists. Treat it as a living document you refine each week.",
      },
      {
        heading: "Versioning",
        body: "Each SOP document tracks versions. Create a new version when you make meaningful changes so you can compare results before and after process changes.",
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: "BarChart2",
    tagline: "Deep-dive into your performance patterns.",
    sections: [
      {
        heading: "What to look for",
        body: "Focus on win rate and profit factor together — a high win rate with a profit factor below 1.0 means winners are too small. Look for session-by-session breakdowns to find your best trading windows.",
      },
      {
        heading: "Rule break analysis",
        body: "The rule break chart shows how trades with violations perform vs. clean trades. If rule-break trades outperform, your rules may need updating. If they underperform (most common), the data gives you discipline.",
      },
      {
        heading: "Date filtering",
        body: "Use the header date range to analyze specific periods — compare this month vs. last month, or isolate a bad week to understand what changed.",
      },
    ],
  },
  {
    id: "edgelab",
    label: "Edge Lab",
    icon: "FlaskConical",
    tagline: "Measure whether your setups actually have edge.",
    sections: [
      {
        heading: "What it shows",
        body: "The Edge Lab groups your historical trades by setup name, session, direction, and other dimensions, then computes expectancy, win rate, and profit factor per group. A group with positive expectancy over 20+ trades is a validated edge.",
      },
      {
        heading: "Minimum sample size",
        body: "Don't draw conclusions from fewer than 20 trades per setup. The numbers aren't statistically meaningful below that threshold — the table flags groups under 20 trades with a warning.",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: "FileText",
    tagline: "Daily, weekly, and monthly performance summaries.",
    sections: [
      {
        heading: "Report periods",
        body: "Switch between Daily, Weekly, and Monthly views using the toggle inside the Reports module. The header date range acts as a pre-filter, so set it to YTD to see all weekly reports for the year.",
      },
      {
        heading: "Creating reports",
        body: "Reports are generated from your trade data for any period. Add notes to each report to capture qualitative context — what the market did, what you did well, what to change.",
      },
    ],
  },
  {
    id: "import",
    label: "Import",
    icon: "Upload",
    tagline: "Bulk-load trade history from MetaTrader or CSV.",
    sections: [
      {
        heading: "Supported formats",
        body: "MT5 Trade History Report (Excel .xlsx) — export from MetaTrader 5 via Reports → Trade History, then Save As Excel. Also supports MT4 HTML statements, MT5 XML exports, and generic CSV files.",
      },
      {
        heading: "Preview and select",
        body: "After uploading, you see a full preview of every parsed trade. Deselect any trades you don't want to import (e.g. scratch trades or positions you already have). Then click Import.",
      },
      {
        heading: "After import",
        body: "Imported trades land in your Journal. Open each trade in the Journal to add context: which opportunity it was linked to, rule breaks, notes, and R-multiple adjustments if the auto-calculation is wrong.",
      },
      {
        heading: "Duplicate handling",
        body: "Re-importing the same file won't create duplicates — but the current version doesn't detect them automatically. If you're unsure, check the Import History at the bottom of the page before re-uploading.",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "Settings",
    tagline: "Risk parameters and your custom vocabulary.",
    sections: [
      {
        heading: "Risk parameters",
        body: "Set your per-trade risk (% of account), max daily loss ($), max open risk (%), max concurrent trades, and minimum acceptable R. These values appear as reference benchmarks in the Journal and Analytics — the app doesn't block trades, just shows you where you stand.",
      },
      {
        heading: "Vocabulary",
        body: "The Vocabulary tab lets you manage the lists of Context Tags and Rule Breaks that appear in Watchlist and Journal dropdowns. Add, rename, or deactivate entries. Deactivated entries are hidden from dropdowns but remain on historical records.",
      },
      {
        heading: "Theme",
        body: "Toggle light/dark mode using the sun/moon button in the top bar. Your preference is saved to your account so it syncs across devices.",
      },
    ],
  },
];

export const helpTips: Record<string, string> = {
  winRate: "Percentage of trades that closed with P&L > 0. Aim for consistency above 50%, but pair it with profit factor — a 45% win rate with 2R winners still has positive expectancy.",
  profitFactor: "Gross profit ÷ gross loss. Above 1.5 is solid; above 2.0 is excellent. Below 1.0 means you're losing money overall.",
  expectancy: "Average R earned per trade across your entire sample. Positive expectancy means your edge is real. Calculated as (Win% × Avg Win R) − (Loss% × Avg Loss R).",
  rMultiple: "How many times your initial risk you made or lost. A +2R trade means you made 2× your risk. Positive R trades are wins regardless of dollar size.",
  confirmationCount: "Number of context tags currently enabled for this opportunity. Higher confirmation counts correlate with higher-probability setups.",
  grade: "Your manual assessment of the overall quality of this opportunity, from A+ (exceptional) to F (should not have taken). Used to filter for setup review.",
  primaryContext: "The dominant market regime or macro context driving this setup. Pick the single most important factor (e.g. 'Above VWAP', 'Trend Day', 'Consolidation').",
  setupName: "The name of the repeatable pattern from your Playbook. Consistent naming lets the Edge Lab group trades by setup for performance analysis.",
  sessionName: "The market session when the trade was opened. Pre-Market (<9:30), Open (9:30–11:00), Midday (11:00–14:00), Close (14:00–16:00), Post-Market (>16:00). EST.",
  riskPerTrade: "Your standard risk per trade as a percentage of account. Used as a reference benchmark — not enforced. Typical range: 0.5–1.5%.",
  minR: "Minimum acceptable R-multiple for taking a trade. If a setup's risk/reward doesn't reach this target, the trade doesn't meet your criteria.",
};
