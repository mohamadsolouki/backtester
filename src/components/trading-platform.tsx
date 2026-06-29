"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Database,
  Download,
  FileSpreadsheet,
  Gauge,
  Import,
  LayoutDashboard,
  Moon,
  MoreVertical,
  NotebookTabs,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { format } from "date-fns";
import {
  contextTagNames,
  entryTypes,
  sessionNames,
  skipReasons,
  type ContextTagName,
  type EntryStatus,
  type EntryType,
  type Opportunity,
  type PlaybookSetup,
  type SessionName,
  type SkipReason,
} from "@/lib/domain";
import { computeGrade, countConfirmations, gradeTone } from "@/lib/context-engine";
import {
  equityCurve,
  initialOpportunities,
  playbookSetups,
  sopGroups as initialSopGroups,
  trades,
} from "@/lib/sample-data";
import {
  exportOpportunitiesCsv,
  exportOpportunitiesXlsx,
  parseImportFile,
  type ImportPreview,
} from "@/lib/import-export";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Opportunities", icon: Activity },
  { label: "Trade Journal", icon: NotebookTabs },
  { label: "Backtest DB", icon: Database },
  { label: "SOP", icon: ClipboardCheck },
  { label: "Playbook", icon: BookOpen },
  { label: "Context Engine", icon: Gauge },
  { label: "Analytics", icon: BarChart3 },
  { label: "Reports", icon: FileSpreadsheet },
  { label: "Settings", icon: Settings },
] as const;

type ModuleName = (typeof navItems)[number]["label"];
type StatusTab = "All" | "Taken" | "Skipped" | "Not Formed" | "Watching";
type RiskSettings = {
  riskPerTrade: number;
  maxDailyLoss: number;
  maxOpenRisk: number;
  maxTrades: number;
  minR: number;
};

const statusTabs: StatusTab[] = ["All", "Taken", "Skipped", "Not Formed", "Watching"];

function normalizeOpportunity(opportunity: Opportunity): Opportunity {
  const confirmations = countConfirmations(opportunity.contextTags);
  return {
    ...opportunity,
    confirmations,
    grade: computeGrade(confirmations, opportunity.entries),
  };
}

function blankTags() {
  return contextTagNames.map((name) => ({
    name,
    enabled: false,
    weight: name === "Trading Range" ? -1 : 1,
  }));
}

function mapImportedRows(rows: Record<string, string>[], existingCount: number): Opportunity[] {
  return rows.slice(0, 100).map((row, index) => {
    const enabledTags = contextTagNames.filter((name) =>
      String(row[name] ?? row[name.toLowerCase()] ?? "")
        .toLowerCase()
        .match(/true|yes|1|y/),
    );

    return normalizeOpportunity({
      id: `import-${Date.now()}-${index}`,
      ticker: row.Ticker ?? row.ticker ?? `IMP${existingCount + index + 1}`,
      pair: row.Pair ?? row.pair ?? row.Ticker ?? "NQ",
      setup: row.Setup ?? row.setup ?? "Imported Setup",
      bias: row.Bias ?? row.bias ?? "Needs Review",
      primaryContext:
        row["Primary Context"] ??
        row.primaryContext ??
        row.Context ??
        "Imported from spreadsheet",
      session: (row.Session as SessionName) || "Open",
      status: "Watching",
      contextTags: contextTagNames.map((name) => ({
        name,
        enabled: enabledTags.includes(name),
        weight: name === "Trading Range" ? -1 : 1,
      })),
      confirmations: 0,
      grade: "C",
      entries: entryTypes.map((type) => ({ type, status: "Waiting" })),
      riskReward: Number(row["R:R"] ?? row.riskReward ?? 0),
      quality: row.Quality ?? row.quality ?? "-",
      time: row.Time ?? row.time ?? "Imported",
      notes: row.Notes ?? row.notes ?? "",
    });
  });
}

export function TradingPlatform() {
  const [activeNav, setActiveNav] = useState<ModuleName>("Dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [session, setSession] = useState<SessionName>("Pre-Market");
  const [theme, setTheme] = useState<"hybrid" | "light">("hybrid");
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(initialOpportunities[0].id);
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [query, setQuery] = useState("");
  const [playbooks, setPlaybooks] = useState<PlaybookSetup[]>(playbookSetups);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState(playbookSetups[0].id);
  const [sopGroups, setSopGroups] = useState(initialSopGroups);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [reportPeriod, setReportPeriod] = useState<"Daily" | "Weekly" | "Monthly">("Weekly");
  const [riskSettings, setRiskSettings] = useState<RiskSettings>({
    riskPerTrade: 0.75,
    maxDailyLoss: 1500,
    maxOpenRisk: 1.5,
    maxTrades: 4,
    minR: 1.5,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.localStorage.setItem("tip-opportunities", JSON.stringify(opportunities));
  }, [opportunities]);

  const selectedOpportunity =
    opportunities.find((opportunity) => opportunity.id === selectedOpportunityId) ??
    opportunities[0];
  const selectedPlaybook =
    playbooks.find((setup) => setup.id === selectedPlaybookId) ?? playbooks[0];

  const filteredOpportunities = opportunities.filter((opportunity) => {
    const matchesStatus = statusTab === "All" || opportunity.status === statusTab;
    const text = `${opportunity.ticker} ${opportunity.setup} ${opportunity.bias} ${opportunity.primaryContext}`.toLowerCase();
    return matchesStatus && text.includes(query.toLowerCase());
  });

  const metrics = useMemo(() => {
    const wins = trades.filter((trade) => trade.rMultiple > 0);
    const losses = trades.filter((trade) => trade.rMultiple < 0);
    const grossProfit = wins.reduce((sum, trade) => sum + trade.rMultiple, 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.rMultiple, 0));
    const expectancy =
      trades.reduce((sum, trade) => sum + trade.rMultiple, 0) / Math.max(trades.length, 1);
    const pnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const avgR = trades.reduce((sum, trade) => sum + trade.rMultiple, 0) / trades.length;
    return {
      winRate: wins.length / trades.length,
      profitFactor: grossProfit / grossLoss,
      expectancy,
      pnl,
      avgR,
      ruleBreaks: trades.filter((trade) => trade.ruleBreak).length,
      drawdown: -410,
    };
  }, []);

  const contextRanking = useMemo(
    () =>
      contextTagNames
        .map((name) => {
          const matches = opportunities.filter((opportunity) =>
            opportunity.contextTags.some((tag) => tag.name === name && tag.enabled),
          );
          const score =
            matches.reduce((sum, opportunity) => sum + (opportunity.resultR ?? 0), 0) /
            Math.max(matches.length, 1);
          return { name, count: matches.length, score };
        })
        .sort((a, b) => b.score - a.score),
    [opportunities],
  );

  const sessionPerformance = useMemo(
    () =>
      sessionNames.slice(1, 4).map((name) => {
        const matches = trades.filter((trade) => trade.session === name);
        const total = matches.reduce((sum, trade) => sum + trade.rMultiple, 0);
        const wins = matches.filter((trade) => trade.rMultiple > 0).length;
        return {
          name,
          total,
          winRate: matches.length ? wins / matches.length : 0,
          trades: matches.length,
        };
      }),
    [],
  );

  const totalSopCompleted = sopGroups.reduce((sum, group) => sum + group.completed, 0);
  const totalSopItems = sopGroups.reduce((sum, group) => sum + group.total, 0);

  function goToModule(label: ModuleName) {
    setActiveNav(label);
    setMobileNavOpen(false);
  }

  function updateOpportunity(next: Opportunity) {
    const normalized = normalizeOpportunity(next);
    setOpportunities((current) =>
      current.map((opportunity) => (opportunity.id === normalized.id ? normalized : opportunity)),
    );
  }

  function addOpportunity(input: {
    ticker: string;
    setup: string;
    bias: string;
    primaryContext: string;
    session: SessionName;
  }) {
    const opportunity = normalizeOpportunity({
      id: `opp-${Date.now()}`,
      ticker: input.ticker.toUpperCase(),
      pair: input.ticker.toUpperCase(),
      setup: input.setup,
      bias: input.bias,
      primaryContext: input.primaryContext,
      session: input.session,
      status: "Watching",
      contextTags: blankTags(),
      confirmations: 0,
      grade: "F",
      entries: entryTypes.map((type) => ({ type, status: "Waiting" })),
      riskReward: 0,
      quality: "-",
      time: format(new Date(), "HH:mm"),
      notes: "New opportunity created from workspace.",
    });
    setOpportunities((current) => [opportunity, ...current]);
    setSelectedOpportunityId(opportunity.id);
    toast.success("Opportunity created");
  }

  function updateContextTag(name: ContextTagName) {
    updateOpportunity({
      ...selectedOpportunity,
      contextTags: selectedOpportunity.contextTags.map((tag) =>
        tag.name === name ? { ...tag, enabled: !tag.enabled } : tag,
      ),
    });
  }

  function updateEntry(type: EntryType, status: EntryStatus, skipReason?: SkipReason) {
    updateOpportunity({
      ...selectedOpportunity,
      status:
        status === "Taken"
          ? "Taken"
          : status === "Skipped"
            ? "Skipped"
            : status === "Not Formed"
              ? "Not Formed"
              : selectedOpportunity.status,
      entries: selectedOpportunity.entries.map((entry) =>
        entry.type === type ? { ...entry, status, skipReason } : entry,
      ),
    });
  }

  function setOpportunityStatus(status: Opportunity["status"]) {
    updateOpportunity({ ...selectedOpportunity, status });
    toast.success(`Marked ${selectedOpportunity.ticker} as ${status}`);
  }

  function toggleSopItem(groupIndex: number, itemIndex: number) {
    setSopGroups((current) =>
      current.map((group, gIndex) => {
        if (gIndex !== groupIndex) return group;
        const items = group.items.map((item, iIndex) =>
          iIndex === itemIndex ? { ...item, checked: !item.checked } : item,
        );
        return {
          ...group,
          items,
          completed: items.filter((item) => item.checked).length,
        };
      }),
    );
  }

  function addPlaybookSetup() {
    const setup: PlaybookSetup = {
      id: `pb-${Date.now()}`,
      name: `Setup ${playbooks.length + 1}`,
      context: "Define the context this setup requires.",
      active: true,
      validConditions: ["Primary context is aligned", "Confirmation count is 4+"],
      invalidConditions: ["News risk is high", "Entry is far from EMA"],
      entryLogic: "E1: trigger; E2: confirmation; E3: full position".split("; "),
      exitLogic: ["Scale at 1R", "Trail the remainder", "Exit if follow-through fails"],
    };
    setPlaybooks((current) => [setup, ...current]);
    setSelectedPlaybookId(setup.id);
    toast.success("Playbook setup added");
  }

  async function handleImport(file: File) {
    const preview = await parseImportFile(file);
    setImportPreview(preview);
    if (preview.rows.length) {
      const imported = mapImportedRows(preview.rows, opportunities.length);
      setOpportunities((current) => [...imported, ...current]);
      setSelectedOpportunityId(imported[0].id);
      toast.success(`Imported ${imported.length} opportunity rows`);
    } else {
      toast.error(preview.errors[0] ?? "No rows found in file");
    }
  }

  const common = {
    opportunities,
    selectedOpportunity,
    selectedPlaybook,
    playbooks,
    filteredOpportunities,
    statusTab,
    setStatusTab,
    query,
    setQuery,
    selectedOpportunityId,
    setSelectedOpportunityId,
    setSelectedPlaybookId,
    updateContextTag,
    updateEntry,
    addOpportunity,
    setOpportunityStatus,
    addPlaybookSetup,
    metrics,
    contextRanking,
    sessionPerformance,
    sopGroups,
    toggleSopItem,
    totalSopCompleted,
    totalSopItems,
    importPreview,
    reportPeriod,
    setReportPeriod,
    riskSettings,
    setRiskSettings,
    onExportCsv: () => exportOpportunitiesCsv(opportunities),
    onExportXlsx: () => exportOpportunitiesXlsx(opportunities),
    onImportClick: () => fileInputRef.current?.click(),
    goToModule,
  };

  return (
    <main
      className={cn(
        "min-h-screen overflow-hidden",
        theme === "hybrid" ? "bg-[#f5f7f4]" : "bg-[#fbfcfa]",
      )}
    >
      <Toaster position="top-right" richColors />
      <div className="grid min-h-screen grid-cols-[176px_minmax(0,1fr)] max-[980px]:grid-cols-1">
        <Sidebar
          activeNav={activeNav}
          setActiveNav={goToModule}
          mobileOpen={mobileNavOpen}
          setMobileOpen={setMobileNavOpen}
        />
        <section className="min-w-0">
          <Header
            activeNav={activeNav}
            session={session}
            setSession={setSession}
            theme={theme}
            setTheme={setTheme}
            metrics={metrics}
            openMobileNav={() => setMobileNavOpen(true)}
          />
          <div className="thin-scrollbar h-[calc(100vh-76px)] overflow-auto px-2 pb-2">
            {activeNav === "Dashboard" ? <DashboardView {...common} /> : null}
            {activeNav === "Opportunities" ? <OpportunitiesView {...common} /> : null}
            {activeNav === "Trade Journal" ? <TradeJournalView {...common} /> : null}
            {activeNav === "Backtest DB" ? <BacktestView {...common} /> : null}
            {activeNav === "SOP" ? <SopView {...common} /> : null}
            {activeNav === "Playbook" ? <PlaybookView {...common} /> : null}
            {activeNav === "Context Engine" ? <ContextEngineView {...common} /> : null}
            {activeNav === "Analytics" ? <AnalyticsView {...common} /> : null}
            {activeNav === "Reports" ? <ReportsView {...common} /> : null}
            {activeNav === "Settings" ? <SettingsView {...common} /> : null}
          </div>
        </section>
      </div>
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleImport(file);
          event.currentTarget.value = "";
        }}
      />
    </main>
  );
}

type CommonProps = {
  opportunities: Opportunity[];
  selectedOpportunity: Opportunity;
  selectedPlaybook: PlaybookSetup;
  playbooks: PlaybookSetup[];
  filteredOpportunities: Opportunity[];
  statusTab: StatusTab;
  setStatusTab: (tab: StatusTab) => void;
  query: string;
  setQuery: (query: string) => void;
  selectedOpportunityId: string;
  setSelectedOpportunityId: (id: string) => void;
  setSelectedPlaybookId: (id: string) => void;
  updateContextTag: (name: ContextTagName) => void;
  updateEntry: (type: EntryType, status: EntryStatus, skipReason?: SkipReason) => void;
  addOpportunity: (input: {
    ticker: string;
    setup: string;
    bias: string;
    primaryContext: string;
    session: SessionName;
  }) => void;
  setOpportunityStatus: (status: Opportunity["status"]) => void;
  addPlaybookSetup: () => void;
  metrics: {
    winRate: number;
    profitFactor: number;
    expectancy: number;
    pnl: number;
    avgR: number;
    ruleBreaks: number;
    drawdown: number;
  };
  contextRanking: { name: string; count: number; score: number }[];
  sessionPerformance: { name: string; total: number; winRate: number; trades: number }[];
  sopGroups: typeof initialSopGroups;
  toggleSopItem: (groupIndex: number, itemIndex: number) => void;
  totalSopCompleted: number;
  totalSopItems: number;
  importPreview: ImportPreview | null;
  reportPeriod: "Daily" | "Weekly" | "Monthly";
  setReportPeriod: (period: "Daily" | "Weekly" | "Monthly") => void;
  riskSettings: RiskSettings;
  setRiskSettings: (settings: RiskSettings) => void;
  onExportCsv: () => void;
  onExportXlsx: () => void;
  onImportClick: () => void;
  goToModule: (module: ModuleName) => void;
};

function DashboardView(props: CommonProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_292px] gap-2 max-[1180px]:grid-cols-1">
      <div className="space-y-2">
        <DailyPlan
          totalSopCompleted={props.totalSopCompleted}
          totalSopItems={props.totalSopItems}
          riskSettings={props.riskSettings}
        />
        <div className="grid grid-cols-[minmax(0,1fr)_400px] gap-2 max-[1260px]:grid-cols-1">
          <OpportunityQueue {...props} compact />
          <PlaybookInspector {...props} />
        </div>
        <SkipReasons opportunities={props.opportunities} />
        <SopChecklist
          groups={props.sopGroups}
          toggleItem={props.toggleSopItem}
          completed={props.totalSopCompleted}
          total={props.totalSopItems}
        />
      </div>
      <AnalyticsRail {...props} />
    </div>
  );
}

function OpportunitiesView(props: CommonProps) {
  return (
    <ModuleShell
      title="Opportunities"
      description="Plan, grade, take, skip, and review opportunities before they become trades."
      actions={
        <>
          <ActionButton icon={Upload} onClick={props.onImportClick}>Import CSV/XLSX</ActionButton>
          <ActionButton icon={Download} onClick={props.onExportXlsx}>Export XLSX</ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_330px] gap-2 max-[1120px]:grid-cols-1">
        <div className="space-y-2">
          <FilterBar {...props} />
          <OpportunityQueue {...props} />
        </div>
        <div className="space-y-2">
          <NewOpportunityForm onCreate={props.addOpportunity} />
          <OpportunityDetail {...props} />
        </div>
      </div>
    </ModuleShell>
  );
}

function TradeJournalView(props: CommonProps) {
  const [selectedTradeId, setSelectedTradeId] = useState(trades[0].id);
  const selectedTrade = trades.find((trade) => trade.id === selectedTradeId) ?? trades[0];

  return (
    <ModuleShell
      title="Trade Journal"
      description="Review closed trades, rule breaks, grade quality, and journal evidence."
      actions={<ActionButton icon={Download} onClick={props.onExportCsv}>Export Journal</ActionButton>}
    >
      <div className="grid grid-cols-[1fr_340px] gap-2 max-[1080px]:grid-cols-1">
        <Surface>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Closed Trades</SectionTitle>
            <Segmented
              value="All"
              options={["All", "Wins", "Losses", "Rule Breaks"]}
              onChange={(value) => toast.info(`Filter applied: ${value}`)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12px]">
              <thead className="border-y border-[#e4ebe8] text-[#5f6d68]">
                <tr>
                  {["Date", "Ticker", "Setup", "Session", "Grade", "R", "PnL", "Rule Break"].map((heading) => (
                    <th key={heading} className="h-9 px-2 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr
                    key={trade.id}
                    onClick={() => setSelectedTradeId(trade.id)}
                    className={cn(
                      "cursor-pointer border-b border-[#edf1ef] hover:bg-[#f5faf8]",
                      selectedTradeId === trade.id && "bg-[#effaf8]",
                    )}
                  >
                    <td className="h-10 px-2">{trade.date}</td>
                    <td className="px-2 font-semibold">{trade.ticker}</td>
                    <td className="px-2">{trade.setup}</td>
                    <td className="px-2">{trade.session}</td>
                    <td className="px-2 text-[#08746f]">{trade.grade}</td>
                    <td className={cn("px-2 font-semibold", trade.rMultiple >= 0 ? "text-[#08746f]" : "text-[#d94848]")}>{trade.rMultiple}R</td>
                    <td className="px-2">{formatCurrency(trade.pnl)}</td>
                    <td className="px-2">{trade.ruleBreak ? <StatusPill status="Skipped" label="Yes" /> : <StatusPill status="Taken" label="No" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>
        <Surface>
          <SectionTitle>Review Panel</SectionTitle>
          <div className="mt-3 space-y-3 text-[13px]">
            <KeyValue label="Trade" value={`${selectedTrade.ticker} ${selectedTrade.setup}`} />
            <KeyValue label="Result" value={`${selectedTrade.rMultiple}R / ${formatCurrency(selectedTrade.pnl)}`} />
            <KeyValue label="Session" value={selectedTrade.session} />
            <KeyValue label="Grade" value={selectedTrade.grade} />
            <textarea
              className="min-h-28 w-full rounded-md border border-[#cfd8d4] bg-white p-3 text-[13px] outline-none focus:border-[#0f9f95]"
              defaultValue="Execution followed the planned context. Next review: compare entry timing with the E2 confirmation."
            />
            <button
              onClick={() => toast.success("Trade review saved")}
              className="h-9 w-full rounded-md bg-[#0f9f95] text-[12px] font-semibold text-white hover:bg-[#08746f]"
            >
              Save Review
            </button>
          </div>
        </Surface>
      </div>
    </ModuleShell>
  );
}

function BacktestView(props: CommonProps) {
  const matrix = contextTagNames.slice(0, 5).map((tag, index) => ({
    tag,
    winRate: 48 + index * 5,
    expectancy: 0.42 + index * 0.18,
    samples: 18 + index * 7,
  }));

  return (
    <ModuleShell
      title="Backtest DB"
      description="Import historical tests, validate rows, and compare setups across contexts."
      actions={
        <>
          <ActionButton icon={Upload} onClick={props.onImportClick}>Import Dataset</ActionButton>
          <ActionButton icon={Download} onClick={props.onExportCsv}>Export Errors</ActionButton>
        </>
      }
    >
      <div className="grid grid-cols-[1fr_320px] gap-2 max-[1080px]:grid-cols-1">
        <Surface>
          <SectionTitle>Dataset Preview</SectionTitle>
          {props.importPreview ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-[12px]">
                <thead className="border-y border-[#e4ebe8] text-[#5f6d68]">
                  <tr>
                    {Object.keys(props.importPreview.rows[0] ?? {}).slice(0, 8).map((key) => (
                      <th key={key} className="h-9 px-2 font-semibold">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {props.importPreview.rows.slice(0, 8).map((row, index) => (
                    <tr key={index} className="border-b border-[#edf1ef]">
                      {Object.keys(props.importPreview?.rows[0] ?? {}).slice(0, 8).map((key) => (
                        <td key={key} className="h-9 px-2">{String(row[key] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="No imported dataset yet"
              description="Upload a CSV or Excel file to preview rows and append opportunities."
              action={<ActionButton icon={Upload} onClick={props.onImportClick}>Import CSV/XLSX</ActionButton>}
            />
          )}
        </Surface>
        <Surface>
          <SectionTitle>Context Matrix</SectionTitle>
          <div className="mt-3 space-y-2">
            {matrix.map((row) => (
              <div key={row.tag} className="rounded-md border border-[#dbe2df] p-3 text-[12px]">
                <div className="flex items-center justify-between font-semibold">
                  <span>{row.tag}</span>
                  <span className="text-[#08746f]">+{row.expectancy.toFixed(2)}R</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[#66746f]">
                  <span>Win Rate {row.winRate}%</span>
                  <span>Samples {row.samples}</span>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </ModuleShell>
  );
}

function SopView(props: CommonProps) {
  return (
    <ModuleShell
      title="SOP"
      description="Versioned risk, mental, environment, execution, and review rules."
      actions={<ActionButton icon={Download} onClick={() => window.print()}>Print SOP</ActionButton>}
    >
      <div className="grid grid-cols-[1fr_320px] gap-2 max-[1080px]:grid-cols-1">
        <SopChecklist
          groups={props.sopGroups}
          toggleItem={props.toggleSopItem}
          completed={props.totalSopCompleted}
          total={props.totalSopItems}
        />
        <Surface>
          <SectionTitle>Version Control</SectionTitle>
          <div className="mt-3 space-y-3 text-[13px]">
            <KeyValue label="Active Version" value="v2.4.1" />
            <KeyValue label="Owner" value="TR" />
            <KeyValue label="Updated" value="May 18, 2025" />
            <div className="rounded-md bg-[#f5f7f4] p-3">
              <div className="font-semibold">Latest Changelog</div>
              <p className="mt-1 text-[#66746f]">
                Added no-overtrading guardrail and tightened weekly review completion criteria.
              </p>
            </div>
            <button
              onClick={() => toast.success("SOP version published")}
              className="h-9 w-full rounded-md bg-[#0f9f95] text-[12px] font-semibold text-white"
            >
              Publish New Version
            </button>
          </div>
        </Surface>
      </div>
    </ModuleShell>
  );
}

function PlaybookView(props: CommonProps) {
  return (
    <ModuleShell
      title="Playbook"
      description="Setup library with context, valid/invalid conditions, entry logic, exit logic, screenshots, and notes."
      actions={<ActionButton icon={Plus} onClick={props.addPlaybookSetup}>Add Setup</ActionButton>}
    >
      <div className="grid grid-cols-[300px_1fr] gap-2 max-[980px]:grid-cols-1">
        <Surface>
          <SectionTitle>Setup Library</SectionTitle>
          <div className="mt-3 space-y-2">
            {props.playbooks.map((setup) => (
              <button
                key={setup.id}
                onClick={() => props.setSelectedPlaybookId(setup.id)}
                className={cn(
                  "w-full rounded-md border p-3 text-left text-[13px] hover:bg-[#f5faf8]",
                  setup.id === props.selectedPlaybook.id
                    ? "border-[#89ccc6] bg-[#effaf8]"
                    : "border-[#dbe2df]",
                )}
              >
                <div className="font-semibold">{setup.name}</div>
                <div className="mt-1 line-clamp-2 text-[12px] text-[#66746f]">{setup.context}</div>
              </button>
            ))}
          </div>
        </Surface>
        <PlaybookInspector {...props} />
      </div>
    </ModuleShell>
  );
}

function ContextEngineView(props: CommonProps) {
  return (
    <ModuleShell
      title="Context Engine"
      description="Independent boolean tags auto-count confirmations and compute grade."
      actions={<ActionButton icon={Check} onClick={() => toast.success("Context model saved")}>Save Engine</ActionButton>}
    >
      <div className="grid grid-cols-[1fr_360px] gap-2 max-[1040px]:grid-cols-1">
        <Surface>
          <div className="flex items-center justify-between">
            <SectionTitle>{props.selectedOpportunity.ticker} Context Tags</SectionTitle>
            <GradeBadge grade={props.selectedOpportunity.grade} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 max-[820px]:grid-cols-2 max-[560px]:grid-cols-1">
            {props.selectedOpportunity.contextTags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => props.updateContextTag(tag.name)}
                className={cn(
                  "rounded-md border p-4 text-left transition",
                  tag.enabled ? "border-[#89ccc6] bg-[#effaf8]" : "border-[#dbe2df] bg-white hover:bg-[#f5f7f4]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{tag.name}</span>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded border", tag.enabled ? "border-[#0f9f95] bg-[#0f9f95] text-white" : "border-[#98a5a0]")}>
                    {tag.enabled ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                </div>
                <p className="mt-2 text-[12px] text-[#66746f]">
                  Weight {tag.weight > 0 ? `+${tag.weight}` : tag.weight}. Toggle to recalculate confirmations and grade.
                </p>
              </button>
            ))}
          </div>
        </Surface>
        <OpportunityDetail {...props} />
      </div>
    </ModuleShell>
  );
}

function AnalyticsView(props: CommonProps) {
  const hourly = [9, 10, 11, 12, 13, 14, 15].map((hour) => {
    const matches = trades.filter((trade) => trade.hour === hour);
    return {
      hour: `${hour}:00`,
      r: matches.reduce((sum, trade) => sum + trade.rMultiple, 0),
    };
  });

  return (
    <ModuleShell
      title="Analytics"
      description="Win rate, profit factor, expectancy, drawdown, streaks, context, combinations, entry, session, pair, hour, rule break, and grade."
      actions={<ActionButton icon={Download} onClick={props.onExportXlsx}>Export Analytics</ActionButton>}
    >
      <div className="grid grid-cols-4 gap-2 max-[960px]:grid-cols-2 max-[560px]:grid-cols-1">
        <Kpi label="Win Rate" value={formatPercent(props.metrics.winRate)} />
        <Kpi label="Profit Factor" value={props.metrics.profitFactor.toFixed(2)} />
        <Kpi label="Expectancy" value={`+${props.metrics.expectancy.toFixed(2)}R`} />
        <Kpi label="Avg R" value={`${props.metrics.avgR.toFixed(2)}R`} />
      </div>
      <div className="mt-2 grid grid-cols-[1fr_340px] gap-2 max-[1080px]:grid-cols-1">
        <Surface>
          <SectionTitle>Equity Curve</SectionTitle>
          <div className="mt-3 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="analytics-equity" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f9f95" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0f9f95" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#edf1ef" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis domain={["dataMin - 300", "dataMax + 300"]} />
                <Tooltip />
                <Area dataKey="equity" fill="url(#analytics-equity)" stroke="#0f9f95" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>
        <Surface>
          <SectionTitle>Hour Analysis</SectionTitle>
          <div className="mt-3 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <CartesianGrid stroke="#edf1ef" vertical={false} />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="r" radius={[4, 4, 0, 0]}>
                  {hourly.map((row) => (
                    <Cell key={row.hour} fill={row.r >= 0 ? "#0f9f95" : "#d94848"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 max-[900px]:grid-cols-1">
        <RankingTable title="Context Analysis" rows={props.contextRanking.map((row) => [row.name, row.count, `${row.score.toFixed(2)}R`])} />
        <RankingTable title="Session Analysis" rows={props.sessionPerformance.map((row) => [row.name, row.trades, `${row.total.toFixed(2)}R`])} />
      </div>
    </ModuleShell>
  );
}

function ReportsView(props: CommonProps) {
  const reportRows = [
    ["Net PnL", formatCurrency(props.metrics.pnl)],
    ["Expectancy", `+${props.metrics.expectancy.toFixed(2)}R`],
    ["Rule Breaks", String(props.metrics.ruleBreaks)],
    ["Best Context", props.contextRanking[0]?.name ?? "N/A"],
    ["SOP Completion", `${props.totalSopCompleted}/${props.totalSopItems}`],
  ];

  return (
    <ModuleShell
      title="Reports"
      description="Daily, weekly, and monthly performance summaries."
      actions={<ActionButton icon={Download} onClick={props.onExportXlsx}>Export Report</ActionButton>}
    >
      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>{props.reportPeriod} Report</SectionTitle>
          <Segmented
            value={props.reportPeriod}
            options={["Daily", "Weekly", "Monthly"]}
            onChange={(value) => props.setReportPeriod(value as "Daily" | "Weekly" | "Monthly")}
          />
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
          {reportRows.map(([label, value]) => (
            <Kpi key={label} label={label} value={value} />
          ))}
        </div>
        <div className="mt-4 rounded-md border border-[#dbe2df] bg-[#fbfcfa] p-4 text-[13px] leading-6 text-[#34413d]">
          <strong>Review Summary:</strong> Best execution came from A-grade momentum continuation setups with at least four confirmations. Rule breaks are concentrated around skipped E2 decisions and should be reviewed before the next open.
        </div>
      </Surface>
    </ModuleShell>
  );
}

function SettingsView(props: CommonProps) {
  const settings = props.riskSettings;

  function update<K extends keyof RiskSettings>(key: K, value: number) {
    props.setRiskSettings({ ...settings, [key]: value });
  }

  return (
    <ModuleShell
      title="Settings"
      description="Profile, risk controls, import mapping, preferences, and deployment readiness."
      actions={<ActionButton icon={Check} onClick={() => toast.success("Settings saved")}>Save Settings</ActionButton>}
    >
      <div className="grid grid-cols-2 gap-2 max-[900px]:grid-cols-1">
        <Surface>
          <SectionTitle>Risk Configuration</SectionTitle>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <NumberField label="Risk per Trade %" value={settings.riskPerTrade} onChange={(value) => update("riskPerTrade", value)} />
            <NumberField label="Max Daily Loss $" value={settings.maxDailyLoss} onChange={(value) => update("maxDailyLoss", value)} />
            <NumberField label="Max Open Risk %" value={settings.maxOpenRisk} onChange={(value) => update("maxOpenRisk", value)} />
            <NumberField label="Max Trades / Day" value={settings.maxTrades} onChange={(value) => update("maxTrades", value)} />
            <NumberField label="Min R Multiple" value={settings.minR} onChange={(value) => update("minR", value)} />
          </div>
        </Surface>
        <Surface>
          <SectionTitle>Import Mapping</SectionTitle>
          <div className="mt-4 space-y-2 text-[13px]">
            {["Ticker", "Setup", "Bias", "Primary Context", "Session", "R:R", "Notes"].map((field) => (
              <div key={field} className="grid grid-cols-[140px_1fr] items-center gap-2">
                <span className="text-[#66746f]">{field}</span>
                <input className="h-9 rounded-md border border-[#cfd8d4] px-3" defaultValue={field} />
              </div>
            ))}
            <button
              onClick={props.onImportClick}
              className="mt-2 h-9 w-full rounded-md border border-[#b7d5d2] text-[12px] font-semibold text-[#08746f]"
            >
              Test Mapping With File
            </button>
          </div>
        </Surface>
      </div>
    </ModuleShell>
  );
}

function Sidebar({
  activeNav,
  setActiveNav,
  mobileOpen,
  setMobileOpen,
}: {
  activeNav: ModuleName;
  setActiveNav: (label: ModuleName) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}) {
  return (
    <>
      {mobileOpen ? (
        <button
          className="fixed inset-0 z-30 bg-black/40 min-[981px]:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}
      <aside
        className={cn(
          "z-40 flex min-h-screen flex-col border-r border-white/10 bg-[#061b20] text-white max-[980px]:fixed max-[980px]:inset-y-0 max-[980px]:left-0 max-[980px]:w-[230px] max-[980px]:transition-transform",
          !mobileOpen && "max-[980px]:-translate-x-full",
        )}
      >
        <div className="border-b border-white/10 p-5">
          <div className="flex items-center justify-between">
            <div className="text-[20px] font-semibold tracking-[-0.01em]">
              Playbook <span className="text-[#18c8bd]">OS</span>
            </div>
            <button className="min-[981px]:hidden" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1 text-[13px] text-white/74">Trading Intelligence</div>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = item.label === activeNav;
            return (
              <button
                key={item.label}
                onClick={() => setActiveNav(item.label)}
                className={cn(
                  "flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-[14px] font-medium text-white/78 transition",
                  active && "bg-white/8 text-[#29d5ca] shadow-[inset_-3px_0_0_#18c8bd]",
                  !active && "hover:bg-white/6 hover:text-white",
                  index === 4 || index === 7 ? "mt-8" : "",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="m-3 rounded-md border border-white/14 bg-white/[0.03] p-4">
          <div className="text-[12px] text-white/68">SOP Version</div>
          <div className="mt-2 text-[20px] font-semibold text-[#2cd8cf]">v2.4.1</div>
          <div className="mt-1 text-[11px] text-white/54">Updated: May 18, 2025</div>
        </div>
      </aside>
    </>
  );
}

function Header({
  activeNav,
  session,
  setSession,
  theme,
  setTheme,
  metrics,
  openMobileNav,
}: {
  activeNav: ModuleName;
  session: SessionName;
  setSession: (session: SessionName) => void;
  theme: "hybrid" | "light";
  setTheme: (theme: "hybrid" | "light") => void;
  metrics: { drawdown: number };
  openMobileNav: () => void;
}) {
  return (
    <header className="flex h-[76px] items-center gap-6 border-b border-[#dbe2df] bg-[#071b20] px-4 text-white max-[760px]:h-auto max-[760px]:flex-wrap max-[760px]:py-3">
      <button
        className="hidden rounded-md border border-white/15 p-2 text-white/70 max-[980px]:block"
        onClick={openMobileNav}
        aria-label="Open navigation"
      >
        <PanelLeftClose className="h-4 w-4" />
      </button>
      <div className="min-w-[146px]">
        <div className="text-[12px] text-white/62">{activeNav}</div>
        <button className="mt-1 flex h-8 items-center gap-2 rounded-md border border-white/14 bg-white/8 px-3 text-[13px]">
          {format(new Date(2026, 5, 29), "MMM d, yyyy")}
          <CalendarDays className="h-3.5 w-3.5 text-white/64" />
        </button>
      </div>
      <div className="h-8 w-px bg-white/14 max-[760px]:hidden" />
      <div className="min-w-[460px] flex-1 max-[760px]:min-w-full">
        <div className="text-[12px] text-white/62">Session</div>
        <div className="mt-1 grid h-8 grid-cols-5 overflow-hidden rounded-md border border-white/14 bg-white/5">
          {sessionNames.map((item) => (
            <button
              key={item}
              onClick={() => setSession(item)}
              className={cn(
                "text-[12px] text-white/72 transition",
                session === item && "bg-[#0caea5] text-white shadow-inner",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="h-8 w-px bg-white/14 max-[760px]:hidden" />
      <div className="grid min-w-[290px] grid-cols-2 gap-5 text-[12px] max-[760px]:min-w-full">
        <div>
          <div className="text-white/58">Daily Stop</div>
          <div className="mt-1 text-[17px] font-semibold text-[#ff5c5c]">
            {formatCurrency(metrics.drawdown)} / -$1,500
          </div>
        </div>
        <div>
          <div className="text-white/58">Risk Remaining</div>
          <div className="mt-1 text-[17px] font-semibold text-[#39d6ca]">
            {formatCurrency(1225)} (81%)
          </div>
        </div>
      </div>
      <button
        onClick={() => setTheme(theme === "hybrid" ? "light" : "hybrid")}
        className="rounded-full border border-white/14 p-2 text-white/74 hover:bg-white/8"
        aria-label="Toggle theme"
      >
        {theme === "hybrid" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      <Bell className="h-5 w-5 text-white/72" />
      <CircleHelp className="h-5 w-5 text-white/72" />
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/60 text-[14px] font-semibold">
        TR
      </div>
    </header>
  );
}

function ModuleShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#dbe2df] bg-white p-4 shadow-soft">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="mt-1 max-w-3xl text-[13px] text-[#66746f]">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

function DailyPlan({
  totalSopCompleted,
  totalSopItems,
  riskSettings,
}: {
  totalSopCompleted: number;
  totalSopItems: number;
  riskSettings: RiskSettings;
}) {
  return (
    <section className="grid grid-cols-[1.1fr_1fr_1fr_0.65fr] divide-x divide-[#dbe2df] rounded-md border border-[#dbe2df] bg-white shadow-soft max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1 max-[640px]:divide-x-0 max-[640px]:divide-y">
      <Panel title="Daily Plan">
        <KeyValue label="Bias" value="Slight Bullish" />
        <KeyValue label="Focus" value="Trend Continuation" />
        <KeyValue label="Primary Market" value="NQ" />
        <KeyValue label="Key Levels" value="18625 / 18850" />
        <KeyValue label="Invalidation" value="< 18550" />
      </Panel>
      <Panel title="Mental Checklist" meta="4 / 5">
        {[
          ["I am rested and focused", true],
          ["Accept risk, not the outcome", true],
          ["No revenge trading", true],
          ["Stick to my playbook", true],
          ["Protect my downside first", false],
        ].map(([label, checked]) => (
          <CheckRow key={String(label)} label={String(label)} checked={Boolean(checked)} />
        ))}
      </Panel>
      <Panel title="Environment Checklist" meta="3 / 4">
        {[
          ["Economic calendar checked", true],
          ["News / events reviewed", true],
          ["Market internals reviewed", true],
          ["Correlation check complete", false],
        ].map(([label, checked]) => (
          <CheckRow key={String(label)} label={String(label)} checked={Boolean(checked)} />
        ))}
      </Panel>
      <Panel title="Risk Rules" meta={`${totalSopCompleted} / ${totalSopItems}`}>
        <KeyValue label="Risk per Trade" value={`${riskSettings.riskPerTrade}%`} />
        <KeyValue label="Max Daily Loss" value={formatCurrency(riskSettings.maxDailyLoss)} />
        <KeyValue label="Max Open Risk" value={`${riskSettings.maxOpenRisk}%`} />
        <KeyValue label="Max Trades / Day" value={String(riskSettings.maxTrades)} />
        <KeyValue label="Min R Multiple" value={`${riskSettings.minR}R`} />
      </Panel>
    </section>
  );
}

function OpportunityQueue(props: CommonProps & { compact?: boolean }) {
  const opportunities = props.filteredOpportunities;
  return (
    <Surface>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Opportunity Queue</SectionTitle>
        <div className="flex items-center gap-4 text-[12px] text-[#66746f]">
          <span>{props.opportunities.length} Total</span>
          <LegendDot color="bg-[#0f9f95]" label="Taken" />
          <LegendDot color="bg-[#d88912]" label="Skipped" />
          <LegendDot color="bg-[#a5adaa]" label="Not Formed" />
        </div>
      </div>
      {!props.compact ? <FilterBar {...props} /> : <StatusTabs statusTab={props.statusTab} setStatusTab={props.setStatusTab} />}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-[12px]">
          <thead className="border-y border-[#e4ebe8] text-[#5f6d68]">
            <tr>
              {["#", "Ticker", "Setup", "E1", "E2", "E3", "Status", "Conf.", "Grade", "R:R", "Time"].map((heading) => (
                <th key={heading} className="h-9 px-2 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opportunity, index) => (
              <tr
                key={opportunity.id}
                onClick={() => props.setSelectedOpportunityId(opportunity.id)}
                className={cn(
                  "cursor-pointer border-b border-[#edf1ef] hover:bg-[#f5faf8]",
                  props.selectedOpportunityId === opportunity.id && "bg-[#effaf8]",
                )}
              >
                <td className="h-10 px-2">{index + 1}</td>
                <td className="px-2 font-semibold">{opportunity.ticker}</td>
                <td className="px-2">{opportunity.setup}</td>
                {entryTypes.map((type) => (
                  <td key={type} className="px-2">
                    <EntryRail status={opportunity.entries.find((entry) => entry.type === type)?.status ?? "Waiting"} />
                  </td>
                ))}
                <td className="px-2"><StatusPill status={opportunity.status} /></td>
                <td className="px-2">{opportunity.confirmations}</td>
                <td className="px-2"><GradeBadge grade={opportunity.grade} /></td>
                <td className="px-2">{opportunity.riskReward ? `1:${opportunity.riskReward}` : "-"}</td>
                <td className="px-2 text-[#66746f]">{opportunity.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

function FilterBar(props: CommonProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <StatusTabs statusTab={props.statusTab} setStatusTab={props.setStatusTab} />
      <label className="relative min-w-[240px] flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#66746f]" />
        <input
          value={props.query}
          onChange={(event) => props.setQuery(event.target.value)}
          placeholder="Search ticker, setup, context..."
          className="h-9 w-full rounded-md border border-[#cfd8d4] bg-white pl-9 pr-3 text-[13px] outline-none focus:border-[#0f9f95]"
        />
      </label>
    </div>
  );
}

function PlaybookInspector(props: Pick<CommonProps, "selectedOpportunity" | "selectedPlaybook" | "playbooks" | "setSelectedPlaybookId" | "updateContextTag" | "updateEntry">) {
  const opportunity = props.selectedOpportunity;
  const playbook = props.selectedPlaybook;
  return (
    <Surface>
      <div className="flex items-center justify-between gap-2">
        <SectionTitle>Playbook / Setup Inspector</SectionTitle>
        <MoreVertical className="h-4 w-4 text-[#66746f]" />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <label className="relative">
          <select
            value={playbook.id}
            onChange={(event) => props.setSelectedPlaybookId(event.target.value)}
            className="h-9 w-full appearance-none rounded-md border border-[#cfd8d4] bg-white px-3 text-[13px] outline-none focus:border-[#0f9f95]"
          >
            {props.playbooks.map((setup) => (
              <option key={setup.id} value={setup.id}>{setup.name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-[#66746f]" />
        </label>
        <span className="flex h-9 items-center rounded-md border border-[#89ccc6] bg-[#effaf8] px-3 text-[12px] font-medium text-[#08746f]">
          Active
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_196px] gap-3 max-[1260px]:grid-cols-1">
        <div className="space-y-3">
          <ConditionList title="Valid Conditions" tone="good" items={playbook.validConditions} />
          <ConditionList title="Invalid Conditions" tone="bad" items={playbook.invalidConditions} />
        </div>
        <ChartPreview />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 max-[520px]:grid-cols-1">
        <LogicBox title="Entry Logic" items={playbook.entryLogic} />
        <LogicBox title="Exit Logic" items={playbook.exitLogic} />
      </div>
      <div className="mt-3 border-t border-[#edf1ef] pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.02em]">Context Confirmation</h3>
          <span className="text-[12px] font-semibold text-[#0f9f95]">{opportunity.confirmations} / 7</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {opportunity.contextTags.map((tag) => (
            <button key={tag.name} onClick={() => props.updateContextTag(tag.name)} className="flex items-center gap-2 rounded-md py-1 text-left text-[12px] hover:bg-[#f0f4f1]">
              <Checkbox checked={tag.enabled} />
              {tag.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[80px_1fr_auto] gap-2 rounded-md border border-[#dbe2df] bg-[#fbfcfa] p-2 max-[620px]:grid-cols-1">
        <div>
          <div className="text-[11px] uppercase text-[#66746f]">Auto Grade</div>
          <div className={cn("mt-1 w-fit rounded border px-2 py-1 text-2xl font-semibold", gradeTone(opportunity.grade))}>
            {opportunity.grade}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {entryTypes.map((type) => {
            const entry = opportunity.entries.find((item) => item.type === type);
            return (
              <div key={type}>
                <div className="text-[11px] font-semibold text-[#66746f]">{type}</div>
                <select
                  value={entry?.status ?? "Waiting"}
                  onChange={(event) => props.updateEntry(type, event.target.value as EntryStatus, entry?.skipReason)}
                  className="mt-1 h-8 w-full rounded-md border border-[#cfd8d4] bg-white px-2 text-[12px]"
                >
                  {["Waiting", "Taken", "Skipped", "Not Formed"].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                {entry?.status === "Skipped" ? (
                  <select
                    value={entry.skipReason ?? "Far from EMA"}
                    onChange={(event) => props.updateEntry(type, "Skipped", event.target.value as SkipReason)}
                    className="mt-1 h-8 w-full rounded-md border border-[#cfd8d4] bg-white px-2 text-[12px]"
                  >
                    {skipReasons.map((reason) => <option key={reason}>{reason}</option>)}
                  </select>
                ) : null}
              </div>
            );
          })}
        </div>
        <button onClick={() => toast.success("Review saved")} className="self-end rounded-md border border-[#89ccc6] px-4 py-2 text-[12px] font-semibold text-[#08746f] hover:bg-[#effaf8]">
          Save Review
        </button>
      </div>
    </Surface>
  );
}

function OpportunityDetail(props: Pick<CommonProps, "selectedOpportunity" | "setOpportunityStatus">) {
  const opportunity = props.selectedOpportunity;
  return (
    <Surface>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle>{opportunity.ticker} Detail</SectionTitle>
          <p className="mt-1 text-[12px] text-[#66746f]">{opportunity.primaryContext}</p>
        </div>
        <GradeBadge grade={opportunity.grade} />
      </div>
      <div className="mt-4 space-y-2 text-[13px]">
        <KeyValue label="Setup" value={opportunity.setup} />
        <KeyValue label="Bias" value={opportunity.bias} />
        <KeyValue label="Session" value={opportunity.session} />
        <KeyValue label="Confirmations" value={String(opportunity.confirmations)} />
        <KeyValue label="R:R" value={opportunity.riskReward ? `1:${opportunity.riskReward}` : "-"} />
        <p className="rounded-md bg-[#f5f7f4] p-3 text-[#34413d]">{opportunity.notes}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={() => props.setOpportunityStatus("Taken")} className="h-9 rounded-md bg-[#0f9f95] text-[12px] font-semibold text-white">Taken</button>
        <button onClick={() => props.setOpportunityStatus("Skipped")} className="h-9 rounded-md bg-[#d88912] text-[12px] font-semibold text-white">Skipped</button>
        <button onClick={() => props.setOpportunityStatus("Not Formed")} className="h-9 rounded-md bg-[#87918d] text-[12px] font-semibold text-white">Not Formed</button>
      </div>
    </Surface>
  );
}

function NewOpportunityForm({ onCreate }: { onCreate: CommonProps["addOpportunity"] }) {
  const [ticker, setTicker] = useState("NQ");
  const [setup, setSetup] = useState("Momentum Break");
  const [bias, setBias] = useState("Slight Bullish");
  const [primaryContext, setPrimaryContext] = useState("Trend continuation above the 20 EMA");
  const [session, setSession] = useState<SessionName>("Open");

  return (
    <Surface>
      <SectionTitle>New Opportunity</SectionTitle>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
        <TextField label="Ticker" value={ticker} onChange={setTicker} />
        <label>
          <span className="text-[12px] text-[#66746f]">Session</span>
          <select value={session} onChange={(event) => setSession(event.target.value as SessionName)} className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3">
            {sessionNames.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="col-span-2"><TextField label="Setup" value={setup} onChange={setSetup} /></div>
        <div className="col-span-2"><TextField label="Bias" value={bias} onChange={setBias} /></div>
        <label className="col-span-2">
          <span className="text-[12px] text-[#66746f]">Primary Context</span>
          <textarea value={primaryContext} onChange={(event) => setPrimaryContext(event.target.value)} className="mt-1 min-h-20 w-full rounded-md border border-[#cfd8d4] bg-white p-3" />
        </label>
        <button
          onClick={() => onCreate({ ticker, setup, bias, primaryContext, session })}
          className="col-span-2 h-9 rounded-md bg-[#0f9f95] text-[12px] font-semibold text-white"
        >
          Create Opportunity
        </button>
      </div>
    </Surface>
  );
}

function AnalyticsRail(props: CommonProps) {
  return (
    <aside className="space-y-2">
      <Surface>
        <SectionTitle>Analytics Snapshot</SectionTitle>
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 divide-x divide-[#dbe2df]">
            <Metric label="Win Rate" value={formatPercent(props.metrics.winRate)} tone="good" />
            <Metric label="Expectancy" value={`+${props.metrics.expectancy.toFixed(2)}R`} tone="good" />
          </div>
          <div className="grid grid-cols-3 divide-x divide-[#dbe2df] border-t border-[#edf1ef] pt-3">
            <Metric label="Trades" value="19" />
            <Metric label="Avg R" value={`${props.metrics.avgR.toFixed(2)}R`} />
            <Metric label="Profit Factor" value={props.metrics.profitFactor.toFixed(2)} />
          </div>
          <div className="h-[84px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="equity" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0f9f95" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0f9f95" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area dataKey="equity" fill="url(#equity)" stroke="#0f9f95" strokeWidth={2} />
                <XAxis dataKey="day" hide />
                <YAxis hide domain={["dataMin - 300", "dataMax + 300"]} />
                <Tooltip />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <RankingBars rows={props.contextRanking.slice(0, 6)} />
          <div className="grid grid-cols-3 gap-2 border-t border-[#edf1ef] pt-3">
            <button onClick={() => props.goToModule("Reports")} className="flex h-9 items-center justify-center gap-1 rounded-md border border-[#b7d5d2] text-[12px] font-medium text-[#08746f] hover:bg-[#effaf8]">
              Reports <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={props.onExportCsv} className="flex h-9 items-center justify-center gap-1 rounded-md border border-[#b7d5d2] text-[12px] font-medium text-[#08746f] hover:bg-[#effaf8]">
              CSV <Download className="h-3.5 w-3.5" />
            </button>
            <button onClick={props.onExportXlsx} className="flex h-9 items-center justify-center gap-1 rounded-md border border-[#b7d5d2] text-[12px] font-medium text-[#08746f] hover:bg-[#effaf8]">
              XLSX <Download className="h-3.5 w-3.5" />
            </button>
            <button onClick={props.onImportClick} className="col-span-3 flex h-9 items-center justify-center gap-2 rounded-md border border-[#b7d5d2] text-[12px] font-medium text-[#08746f] hover:bg-[#effaf8]">
              <Upload className="h-3.5 w-3.5" /> Import CSV/XLSX
            </button>
          </div>
        </div>
      </Surface>
    </aside>
  );
}

function SkipReasons({ opportunities }: { opportunities: Opportunity[] }) {
  const counts = skipReasons.map((reason) => ({
    reason,
    count: opportunities
      .flatMap((opportunity) => opportunity.entries)
      .filter((entry) => entry.skipReason === reason).length,
  }));

  return (
    <Surface>
      <SectionTitle>Skip Reasons <span className="font-normal text-[#66746f]">(Today)</span></SectionTitle>
      <div className="mt-3 grid grid-cols-6 gap-2 max-[900px]:grid-cols-3 max-[560px]:grid-cols-2">
        {counts.map((item) => (
          <div key={item.reason} className="flex h-9 items-center justify-between rounded-md border border-[#dbe2df] px-3 text-[12px]">
            <span>{item.reason}</span>
            <span className="font-semibold text-[#66746f]">{item.count}</span>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function SopChecklist({
  groups,
  toggleItem,
  completed,
  total,
}: {
  groups: typeof initialSopGroups;
  toggleItem: (groupIndex: number, itemIndex: number) => void;
  completed: number;
  total: number;
}) {
  return (
    <Surface>
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>SOP - Daily Checklist</SectionTitle>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-[#08746f]">{completed} / {total}</span>
          <div className="h-2 w-36 overflow-hidden rounded-full bg-[#e5ebe8]">
            <div className="h-full bg-[#4f9a39]" style={{ width: `${Math.round((completed / total) * 100)}%` }} />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 divide-x divide-[#dbe2df] max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1 max-[640px]:divide-x-0 max-[640px]:divide-y">
        {groups.map((group, groupIndex) => (
          <div key={group.title} className="px-3 first:pl-0 last:pr-0 max-[640px]:py-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold uppercase">{groupIndex + 1}. {group.title}</span>
              <span className="font-semibold text-[#0f9f95]">{group.completed} / {group.total}</span>
            </div>
            <div className="mt-3 space-y-2">
              {group.items.map((item, itemIndex) => (
                <button key={item.label} onClick={() => toggleItem(groupIndex, itemIndex)} className="flex w-full items-center gap-2 text-left text-[12px]">
                  <Checkbox checked={item.checked} />
                  <span className={item.checked ? "text-[#263331]" : "text-[#66746f]"}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function RankingBars({ rows }: { rows: { name: string; count: number; score: number }[] }) {
  return (
    <div className="border-t border-[#edf1ef] pt-4">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.02em]">Context Ranking</h3>
      <div className="mt-3 space-y-2">
        {rows.map((item) => (
          <div key={item.name} className="grid grid-cols-[96px_1fr_34px] items-center gap-2 text-[12px]">
            <span className="truncate">{item.name}</span>
            <div className="h-2 overflow-hidden rounded-full bg-[#e8eeeb]">
              <div className={cn("h-full", item.score >= 0 ? "bg-[#0f9f95]" : "bg-[#d94848]")} style={{ width: `${Math.min(100, 30 + item.count * 12)}%` }} />
            </div>
            <span className="text-right font-medium">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingTable({ title, rows }: { title: string; rows: (string | number)[][] }) {
  return (
    <Surface>
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])} className="border-b border-[#edf1ef] last:border-0">
                {row.map((cell, index) => (
                  <td key={index} className={cn("h-9 px-2", index === 0 && "font-semibold")}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Surface>
  );
}

function Surface({ children }: { children: ReactNode }) {
  return <section className="rounded-md border border-[#dbe2df] bg-white p-3 shadow-soft">{children}</section>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[14px] font-semibold uppercase tracking-[0.02em]">{children}</h2>;
}

function ActionButton({ icon: Icon, onClick, children }: { icon: typeof Upload; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="flex h-9 items-center gap-2 rounded-md border border-[#b7d5d2] bg-white px-3 text-[12px] font-semibold text-[#08746f] hover:bg-[#effaf8]">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="flex h-8 overflow-hidden rounded-md border border-[#cfd8d4]">
      {options.map((option) => (
        <button key={option} onClick={() => onChange(option)} className={cn("px-3 text-[12px] font-medium", value === option ? "bg-[#0f9f95] text-white" : "bg-white text-[#263331] hover:bg-[#f0f4f1]")}>
          {option}
        </button>
      ))}
    </div>
  );
}

function StatusTabs({ statusTab, setStatusTab }: { statusTab: StatusTab; setStatusTab: (tab: StatusTab) => void }) {
  return <Segmented value={statusTab} options={statusTabs} onChange={(value) => setStatusTab(value as StatusTab)} />;
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Surface>
      <div className="text-[12px] text-[#66746f]">{label}</div>
      <div className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{value}</div>
    </Surface>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="px-2 first:pl-0">
      <div className="text-[12px] text-[#66746f]">{label}</div>
      <div className={cn("mt-1 text-[20px] font-semibold", tone === "good" && "text-[#0f9f95]", tone === "bad" && "text-[#d94848]")}>
        {value}
      </div>
    </div>
  );
}

function Panel({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.02em]">{title}</h2>
        {meta ? <span className="text-[12px] font-semibold text-[#0f9f95]">{meta}</span> : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[135px_1fr] text-[13px]">
      <span className="text-[#44524d]">{label}</span>
      <span className="font-medium text-[#263331]">{value}</span>
    </div>
  );
}

function CheckRow({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <Checkbox checked={checked} />
      <span className="text-[#263331]">{label}</span>
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", checked ? "border-[#0f9f95] bg-[#0f9f95] text-white" : "border-[#98a5a0] bg-white")}>
      {checked ? <Check className="h-3 w-3" /> : null}
    </span>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("h-2 w-2 rounded-full", color)} />
      {label}
    </span>
  );
}

function EntryRail({ status }: { status: EntryStatus }) {
  const color =
    status === "Taken"
      ? "bg-[#0f9f95]"
      : status === "Skipped"
        ? "bg-[#d88912]"
        : status === "Not Formed"
          ? "bg-[#a5adaa]"
          : "bg-[#111816]";
  return (
    <div className="relative h-4 w-14">
      <div className="absolute left-0 top-1/2 h-px w-full bg-[#222]" />
      <span className={cn("absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full", color)} />
    </div>
  );
}

function StatusPill({ status, label }: { status: Opportunity["status"]; label?: string }) {
  const styles = {
    Taken: "border-[#89ccc6] bg-[#effaf8] text-[#08746f]",
    Skipped: "border-[#edc474] bg-[#fff7e8] text-[#b86e04]",
    "Not Formed": "border-[#cfd8d4] bg-[#f4f6f5] text-[#66746f]",
    Watching: "border-[#b8c9f3] bg-[#eef3ff] text-[#435da8]",
  };
  return <span className={cn("rounded border px-2 py-1 text-[11px] font-medium", styles[status])}>{label ?? status}</span>;
}

function GradeBadge({ grade }: { grade: Opportunity["grade"] }) {
  return <span className={cn("rounded border px-2 py-1 text-[12px] font-semibold", gradeTone(grade))}>{grade}</span>;
}

function ConditionList({ title, tone, items }: { title: string; tone: "good" | "bad"; items: string[] }) {
  return (
    <div>
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.02em]">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-[12px]">
            <span className={cn("flex h-4 w-4 items-center justify-center rounded-full text-white", tone === "good" ? "bg-[#4f9a39]" : "bg-[#d94848]")}>
              <Check className="h-3 w-3" />
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LogicBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-[#dbe2df] bg-[#fbfcfa] p-3">
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.02em]">{title}</h3>
      <div className="mt-2 space-y-1 text-[12px] text-[#34413d]">
        {items.map((item) => <div key={item}>{item}</div>)}
      </div>
    </div>
  );
}

function ChartPreview() {
  const data = [
    { name: "1", price: 12 },
    { name: "2", price: 10 },
    { name: "3", price: 14 },
    { name: "4", price: 13 },
    { name: "5", price: 16 },
    { name: "6", price: 22 },
  ];
  return (
    <div className="relative min-h-[150px] overflow-hidden rounded-md border border-[#1b2f33] bg-[#061b20] p-2">
      <ResponsiveContainer width="100%" height={132}>
        <LineChart data={data}>
          <Line dataKey="price" stroke="#20d7cb" strokeWidth={2} dot={false} />
          <XAxis hide dataKey="name" />
          <YAxis hide />
        </LineChart>
      </ResponsiveContainer>
      <div className="absolute bottom-2 right-2 flex gap-1">
        <button className="rounded border border-white/20 p-1 text-white/80"><Search className="h-3 w-3" /></button>
        <button className="rounded border border-white/20 p-1 text-white/80"><Import className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-[#cfd8d4] p-8 text-center">
      <SlidersHorizontal className="h-8 w-8 text-[#0f9f95]" />
      <div className="mt-3 font-semibold">{title}</div>
      <p className="mt-1 max-w-md text-[13px] text-[#66746f]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="text-[12px] text-[#66746f]">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3 outline-none focus:border-[#0f9f95]" />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="text-[12px] text-[#66746f]">{label}</span>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 h-9 w-full rounded-md border border-[#cfd8d4] bg-white px-3 outline-none focus:border-[#0f9f95]" />
    </label>
  );
}
