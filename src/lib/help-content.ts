export type HelpSection = {
  heading: string;
  body: string;
  items?: string[];
};

export type ModuleHelp = {
  id: string;
  label: string;
  icon: string;
  tagline: string;
  sections: HelpSection[];
};

export type QuickStartStep = {
  step: number;
  title: string;
  body: string;
  href: string;
};

export const quickStartSteps: QuickStartStep[] = [
  {
    step: 1,
    title: "Set your risk parameters",
    body: "Open Settings → General and set your risk per trade, max daily loss, and minimum R. These become reference benchmarks across the whole app.",
    href: "/settings",
  },
  {
    step: 2,
    title: "Import your history (optional)",
    body: "Have existing trades in MetaTrader? Go to Import and upload your MT5 Trade History Report, MT4 statement, or CSV. Duplicates are detected automatically.",
    href: "/import",
  },
  {
    step: 3,
    title: "Plan an opportunity",
    body: "Before you trade, log the idea in Watchlist — ticker, setup, bias, and which context signals are confirming.",
    href: "/opportunities",
  },
  {
    step: 4,
    title: "Journal every trade",
    body: "Record entries in the Journal, either manually or via import. Tag context signals and rule breaks on each trade to build a real dataset.",
    href: "/journal",
  },
  {
    step: 5,
    title: "Review your edge",
    body: "Use Analytics for performance patterns and Edge Lab to see which context signals and setups actually carry positive expectancy.",
    href: "/analytics",
  },
];

export const helpModules: ModuleHelp[] = [
  {
    id: "overview",
    label: "Overview",
    icon: "LayoutDashboard",
    tagline: "Your daily trading command center.",
    sections: [
      {
        heading: "What you see",
        body: "The Overview shows KPIs (win rate, profit factor, expectancy, total P&L) for the active date range, an equity curve, your active Watchlist items, and recent Journal entries. Everything responds to the date and session filter in the header — these are the same underlying numbers shown on the Analytics page for the same filter.",
      },
      {
        heading: "Quick Actions & Active Playbooks",
        body: "The right rail gives one-click shortcuts to the most common actions, plus a live list of your active Playbook setups so you can jump straight into a documented edge.",
      },
      {
        heading: "Onboarding banner",
        body: "New accounts see a dismissible banner outlining the Plan → Execute → Analyze loop. Dismiss it permanently with \"Don't show again,\" or revisit the same guidance any time from the Help Center.",
      },
      {
        heading: "Date & session filter",
        body: "The date range picker and session pills in the top bar filter data across the entire platform, not just this page.",
        items: [
          "Presets: Today, This Week, This Month, QTD, YTD, All Time, or a custom range",
          "Session pills: Pre-Market, Open, Midday, Close, Post-Market — click to toggle multiple on at once",
          "Filters persist in the URL, so a filtered view can be bookmarked or shared",
        ],
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
        heading: "Creating an opportunity",
        body: "Click New Opportunity and fill in Ticker, Setup, Session, and Bias (Bullish / Bearish / Neutral). Ticker and Setup use searchable, creatable dropdowns — pick an existing value or type a new one to add it to your vocabulary.",
      },
      {
        heading: "Opportunity detail tabs",
        body: "Selecting a row opens a three-tab detail panel:",
        items: [
          "Overview — bias, session, status, notes, and one-click status buttons (Taken / Skipped / Not Formed)",
          "Context — toggle which confirmation signals are currently active; the count drives your grade",
          "Entries — track E1/E2/E3 entry plan status independently (Waiting / Taken / Skipped / Not Formed)",
        ],
      },
      {
        heading: "Status flow",
        body: "Planned → Watching → Taken (once linked to a trade) or Skipped / Not Formed. Update status from the Overview tab as the idea develops.",
      },
      {
        heading: "Context tags & grading",
        body: "Tags represent independent market conditions confirming or contradicting the setup. Most carry weight +1; contrarian tags like Trading Range carry weight −1. The confirmation count is the sum of enabled tag weights, and grade is set manually once you've weighed the full picture.",
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
        body: "Each Playbook entry documents one repeatable setup: valid/invalid conditions, entry logic, exit logic, and freeform notes. Only add a setup once you have enough data to trust it.",
      },
      {
        heading: "Linking to trades",
        body: "Pick a setup name from your Playbook when creating a Watchlist opportunity — the same name then groups trades in Edge Lab so you can see which playbooks are actually delivering.",
      },
      {
        heading: "Active vs. inactive",
        body: "Deactivate a setup you're no longer trading without deleting its history. Inactive setups stay out of the creatable dropdowns but remain visible on past opportunities and trades.",
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
        body: "The Routine module stores your Standard Operating Procedure as a checklist split into Prepare / Execute / Review groups — pre-market prep, intraday rules, and post-market review. Treat it as a living document you refine weekly.",
      },
      {
        heading: "Versioning",
        body: "Each edit to a saved SOP is published as a new version with a required changelog, so you can trace exactly what changed and when — and correlate process changes with performance changes in Analytics.",
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
        body: "Add trades manually one at a time via Add Trade, or bulk-import a session from MetaTrader via Import. Manual entry suits forward-testing a specific setup in real time; import suits catching up your Journal from a broker export.",
      },
      {
        heading: "Sorting, searching, filtering",
        body: "The trade table is a full working data grid, not just a static list.",
        items: [
          "Click any sortable column header (Date, Ticker, Entry, Exit, Size, R, P&L, Fees) to sort — click again to reverse",
          "Search box filters by ticker or notes text as you type",
          "Ticker dropdown narrows the table to one instrument",
          "Segmented filter switches between All / Wins / Losses / Rule Breaks / Open",
          "Columns button shows a checklist to show or hide any column — your choice is remembered on this device",
        ],
      },
      {
        heading: "Trade detail — click any row",
        body: "Clicking a row opens a focused modal instead of a side panel, so you're not scrolling a cramped column next to a long table. Four tabs:",
        items: [
          "Overview — read-only summary: entry/exit, size, fees, session, timestamps, notes, active context, rule breaks, and delete",
          "Trade Data — edit every field: ticker, direction, session, status, entry/exit price, size, R multiple, P&L, fees, opened/closed timestamps",
          "Context — edit notes, toggle context signal tags specific to this trade, and add or remove rule breaks",
          "Review — score the trade 1–10, record the lesson learned, and note one action item for next time",
        ],
      },
      {
        heading: "Context tags on trades",
        body: "Every trade can carry its own context signal tags — the same vocabulary used on Watchlist opportunities — independent of whether it's linked to an opportunity. This means imported trades that were never planned as an opportunity can still be tagged and analyzed in Edge Lab. Tags are seeded automatically the first time you open a trade's Context tab.",
      },
      {
        heading: "Rule breaks",
        body: "Tag any discipline violation on a trade (moved stop, oversized position, FOMO entry, etc.) from the Context tab. This surfaces in Analytics so you can measure whether rule-break trades actually underperform clean ones.",
      },
      {
        heading: "R-Multiple",
        body: "R is risk-adjusted return — how many multiples of your initial risk you made or lost. A +2R trade means you made twice your risk regardless of dollar size. Target an average R above the minimum you set in Settings.",
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
        body: "Read win rate and profit factor together — a high win rate with profit factor below 1.0 means winners are too small relative to losers. Use the Session Analysis and Hour Analysis panels to find your best trading windows.",
      },
      {
        heading: "Panels on this page",
        items: [
          "Equity Curve — cumulative P&L over the filtered period",
          "Hour Analysis — total R by hour of day, color-coded by profitability",
          "Session Analysis — trade count, win rate, and total R per market session",
          "Ticker Analysis — total R and P&L per instrument, sorted by P&L",
        ],
        body: "",
      },
      {
        heading: "Date filtering",
        body: "The header date range and session filter apply here exactly as they do on Overview — narrow to a single week to isolate what changed after a bad stretch, or widen to All Time for the full picture. These numbers always match Overview for the same filter.",
      },
    ],
  },
  {
    id: "edgelab",
    label: "Edge Lab",
    icon: "FlaskConical",
    tagline: "Measure whether your context signals actually have edge.",
    sections: [
      {
        heading: "What it shows",
        body: "Edge Lab builds a Context Performance Matrix: for every context tag you've ever enabled on a trade, it computes win rate, expectancy (avg R), and sample size. A tag with positive expectancy across enough samples is a validated edge; a tag that's consistently negative is a signal to drop or invert.",
      },
      {
        heading: "Where the tags come from",
        body: "Edge Lab reads each trade's own context tags first. For older trades tagged only through a linked Watchlist opportunity, it falls back to that opportunity's tags — so both tagging paths (Journal → Context tab, or Watchlist → Context tab) feed the same matrix.",
      },
      {
        heading: "Minimum sample size",
        body: "Rows with fewer than 20 samples are flagged with a ⚠ — don't draw conclusions from small sample sizes. Keep tagging trades consistently to grow confidence in the numbers.",
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
        body: "Switch between Daily, Weekly, and Monthly using the segmented control inside the module. The header date range acts as a pre-filter on top of that — set it to YTD to make sure a full year of weekly data is available to summarize.",
      },
      {
        heading: "Export",
        body: "Export Report downloads a CSV snapshot of the current period's net P&L, expectancy, trade count, rule break count, and most-traded ticker — handy for pasting into an external tracker or sharing with a mentor.",
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
        items: [
          "MT5 Trade History Report (.xlsx) — MetaTrader 5 → Reports → Trade History → Save as Excel",
          "MT4 HTML statements",
          "MT5 XML exports",
          "Generic CSV files",
        ],
        body: "",
      },
      {
        heading: "Duplicate detection",
        body: "The moment a file is parsed, every row is checked against your existing Journal trades by ticker, direction, entry price, and open time. Matches are highlighted amber and auto-deselected in the preview table, so re-uploading the same statement won't create duplicate rows. Use New Only to reset the selection to just the fresh trades, or manually re-check a row to force a re-import.",
      },
      {
        heading: "Preview and import",
        body: "Review the full parsed list before committing — deselect anything you don't want (e.g. a scratch trade), then click Import N Trades. The Import History table at the bottom logs every batch with how many rows were imported vs. skipped as duplicates.",
      },
      {
        heading: "After import",
        body: "Imported trades land directly in your Journal as closed trades. Open any of them to add context tags, rule breaks, or a review — imports don't come pre-tagged since that judgment is yours to make.",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: "Settings",
    tagline: "Risk parameters, vocabulary, and account controls.",
    sections: [
      {
        heading: "Risk configuration",
        body: "Set your per-trade risk (% of account), max daily loss ($), max open risk (%), max concurrent trades, and minimum acceptable R. These values appear as reference benchmarks throughout the app — nothing is enforced automatically, they're there to keep you honest.",
      },
      {
        heading: "Vocabulary",
        body: "Manage the Context Tags and Rule Break reasons that populate dropdowns in Watchlist and Journal. Add new entries inline from any combobox, or manage the full list here. Deactivating an entry hides it from future dropdowns but leaves it intact on historical records.",
      },
      {
        heading: "Danger Zone",
        body: "Clear All Trades permanently deletes every trade, rule break, review, and import batch on your account — useful for wiping demo data before going live. This requires a second confirmation click and cannot be undone. Opportunities, Playbook setups, and your settings are untouched.",
      },
      {
        heading: "Theme",
        body: "Toggle light/dark mode with the sun/moon button in the top bar. Your preference is saved to your account, so it follows you across devices.",
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
