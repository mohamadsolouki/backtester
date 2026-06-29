"use client";

import { useMemo, useRef, useState } from "react";
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
  ChevronRight,
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
  Search,
  Settings,
  Sun,
  Upload,
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
];

const statusTabs = ["All", "Taken", "Skipped", "Not Formed"] as const;

type StatusTab = (typeof statusTabs)[number];

function normalizeOpportunity(opportunity: Opportunity): Opportunity {
  const confirmations = countConfirmations(opportunity.contextTags);
  return {
    ...opportunity,
    confirmations,
    grade: computeGrade(confirmations, opportunity.entries),
  };
}

function mapImportedRows(rows: Record<string, string>[], existingCount: number): Opportunity[] {
  return rows.slice(0, 25).map((row, index) => {
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
      session: "Open",
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
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [session, setSession] = useState<(typeof sessionNames)[number]>("Pre-Market");
  const [theme, setTheme] = useState<"hybrid" | "light">("hybrid");
  const [opportunities, setOpportunities] = useState(initialOpportunities);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(initialOpportunities[0].id);
  const [statusTab, setStatusTab] = useState<StatusTab>("All");
  const [selectedPlaybookId, setSelectedPlaybookId] = useState(playbookSetups[0].id);
  const [sopGroups, setSopGroups] = useState(initialSopGroups);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedOpportunity =
    opportunities.find((opportunity) => opportunity.id === selectedOpportunityId) ??
    opportunities[0];
  const selectedPlaybook =
    playbookSetups.find((setup) => setup.id === selectedPlaybookId) ?? playbookSetups[0];

  const filteredOpportunities = opportunities.filter((opportunity) => {
    if (statusTab === "All") return true;
    return opportunity.status === statusTab;
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
      contextTagNames.map((name) => {
        const matches = opportunities.filter((opportunity) =>
          opportunity.contextTags.some((tag) => tag.name === name && tag.enabled),
        );
        const score =
          matches.reduce((sum, opportunity) => sum + (opportunity.resultR ?? 0), 0) /
          Math.max(matches.length, 1);
        return { name, count: matches.length, score };
      }),
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

  function updateOpportunity(next: Opportunity) {
    const normalized = normalizeOpportunity(next);
    setOpportunities((current) =>
      current.map((opportunity) => (opportunity.id === normalized.id ? normalized : opportunity)),
    );
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
            : selectedOpportunity.status,
      entries: selectedOpportunity.entries.map((entry) =>
        entry.type === type ? { ...entry, status, skipReason } : entry,
      ),
    });
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

  const totalSopCompleted = sopGroups.reduce((sum, group) => sum + group.completed, 0);
  const totalSopItems = sopGroups.reduce((sum, group) => sum + group.total, 0);

  return (
    <main
      className={cn(
        "min-h-screen overflow-hidden",
        theme === "hybrid" ? "bg-[#f5f7f4]" : "bg-[#fbfcfa]",
      )}
    >
      <Toaster position="top-right" richColors />
      <div className="grid min-h-screen grid-cols-[176px_minmax(0,1fr)] max-[980px]:grid-cols-1">
        <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
        <section className="min-w-0">
          <Header
            session={session}
            setSession={setSession}
            theme={theme}
            setTheme={setTheme}
            metrics={metrics}
          />
          <div className="thin-scrollbar h-[calc(100vh-76px)] overflow-auto px-2 pb-2">
            <div className="grid grid-cols-[minmax(0,1fr)_292px] gap-2 max-[1180px]:grid-cols-1">
              <div className="space-y-2">
                <DailyPlan totalSopCompleted={totalSopCompleted} totalSopItems={totalSopItems} />
                <div className="grid grid-cols-[minmax(0,1fr)_400px] gap-2 max-[1260px]:grid-cols-1">
                  <OpportunityQueue
                    opportunities={filteredOpportunities}
                    allCount={opportunities.length}
                    statusTab={statusTab}
                    setStatusTab={setStatusTab}
                    selectedOpportunityId={selectedOpportunityId}
                    setSelectedOpportunityId={setSelectedOpportunityId}
                  />
                  <PlaybookInspector
                    opportunity={selectedOpportunity}
                    playbook={selectedPlaybook}
                    playbookOptions={playbookSetups}
                    setSelectedPlaybookId={setSelectedPlaybookId}
                    updateContextTag={updateContextTag}
                    updateEntry={updateEntry}
                  />
                </div>
                <SkipReasons opportunities={opportunities} />
                <SopChecklist
                  groups={sopGroups}
                  toggleItem={toggleSopItem}
                  completed={totalSopCompleted}
                  total={totalSopItems}
                />
              </div>
              <AnalyticsRail
                metrics={metrics}
                contextRanking={contextRanking}
                sessionPerformance={sessionPerformance}
                importPreview={importPreview}
                onExportCsv={() => exportOpportunitiesCsv(opportunities)}
                onExportXlsx={() => exportOpportunitiesXlsx(opportunities)}
                onImportClick={() => fileInputRef.current?.click()}
              />
            </div>
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

function Sidebar({
  activeNav,
  setActiveNav,
}: {
  activeNav: string;
  setActiveNav: (label: string) => void;
}) {
  return (
    <aside className="flex min-h-screen flex-col border-r border-white/10 bg-[#061b20] text-white max-[980px]:hidden">
      <div className="border-b border-white/10 p-5">
        <div className="text-[20px] font-semibold tracking-[-0.01em]">
          Playbook <span className="text-[#18c8bd]">OS</span>
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
        <button className="mt-4 flex items-center gap-1 text-[12px] font-medium text-[#6ce5de] underline underline-offset-4">
          View Changelog <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <button className="m-3 flex h-10 items-center gap-3 rounded-md px-2 text-[14px] text-white/72 hover:bg-white/6">
        <Settings className="h-4 w-4" />
        Settings
      </button>
    </aside>
  );
}

function Header({
  session,
  setSession,
  theme,
  setTheme,
  metrics,
}: {
  session: (typeof sessionNames)[number];
  setSession: (session: (typeof sessionNames)[number]) => void;
  theme: "hybrid" | "light";
  setTheme: (theme: "hybrid" | "light") => void;
  metrics: { pnl: number; drawdown: number };
}) {
  return (
    <header className="flex h-[76px] items-center gap-6 border-b border-[#dbe2df] bg-[#071b20] px-4 text-white max-[760px]:h-auto max-[760px]:flex-wrap max-[760px]:py-3">
      <button className="hidden rounded-md border border-white/15 p-2 text-white/70 max-[980px]:block">
        <PanelLeftClose className="h-4 w-4" />
      </button>
      <div className="min-w-[146px]">
        <div className="text-[12px] text-white/62">Date</div>
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

function DailyPlan({
  totalSopCompleted,
  totalSopItems,
}: {
  totalSopCompleted: number;
  totalSopItems: number;
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
        <KeyValue label="Risk per Trade" value="0.75%" />
        <KeyValue label="Max Daily Loss" value="-$1,500" />
        <KeyValue label="Max Open Risk" value="1.50%" />
        <KeyValue label="Max Trades / Day" value="4" />
        <KeyValue label="Min R Multiple" value="1.5R" />
      </Panel>
    </section>
  );
}

function OpportunityQueue({
  opportunities,
  allCount,
  statusTab,
  setStatusTab,
  selectedOpportunityId,
  setSelectedOpportunityId,
}: {
  opportunities: Opportunity[];
  allCount: number;
  statusTab: StatusTab;
  setStatusTab: (tab: StatusTab) => void;
  selectedOpportunityId: string;
  setSelectedOpportunityId: (id: string) => void;
}) {
  return (
    <section className="rounded-md border border-[#dbe2df] bg-white p-3 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.02em]">Opportunity Queue</h2>
        <div className="flex items-center gap-4 text-[12px] text-[#66746f]">
          <span>{allCount} Total</span>
          <LegendDot color="bg-[#0f9f95]" label="Taken" />
          <LegendDot color="bg-[#d88912]" label="Skipped" />
          <LegendDot color="bg-[#a5adaa]" label="Not Formed" />
        </div>
      </div>
      <div className="mt-3 flex h-8 w-fit overflow-hidden rounded-md border border-[#cfd8d4]">
        {statusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusTab(tab)}
            className={cn(
              "min-w-16 px-4 text-[12px] font-medium",
              statusTab === tab ? "bg-[#0f9f95] text-white" : "bg-white text-[#263331] hover:bg-[#f0f4f1]",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[660px] border-collapse text-left text-[12px]">
          <thead className="border-y border-[#e4ebe8] text-[#5f6d68]">
            <tr>
              {["#", "Ticker", "Setup", "E1", "E2", "E3", "Status", "R:R", "Quality", "Time"].map(
                (heading) => (
                  <th key={heading} className="h-9 px-2 font-semibold">
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opportunity, index) => (
              <tr
                key={opportunity.id}
                onClick={() => setSelectedOpportunityId(opportunity.id)}
                className={cn(
                  "cursor-pointer border-b border-[#edf1ef] hover:bg-[#f5faf8]",
                  selectedOpportunityId === opportunity.id && "bg-[#effaf8]",
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
                <td className="px-2">
                  <StatusPill status={opportunity.status} />
                </td>
                <td className="px-2">{opportunity.riskReward ? `1:${opportunity.riskReward}` : "-"}</td>
                <td className="px-2 font-medium text-[#08746f]">{opportunity.grade}</td>
                <td className="px-2 text-[#66746f]">{opportunity.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#edf1ef] pt-3 text-[12px] text-[#66746f]">
        <span>E1 = Entry Trigger &nbsp;&nbsp; E2 = Add-on / Confirmation &nbsp;&nbsp; E3 = Full Position</span>
        <button className="flex items-center gap-1 font-medium text-[#08746f]">
          Manage Opportunities <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}

function PlaybookInspector({
  opportunity,
  playbook,
  playbookOptions,
  setSelectedPlaybookId,
  updateContextTag,
  updateEntry,
}: {
  opportunity: Opportunity;
  playbook: (typeof playbookSetups)[number];
  playbookOptions: typeof playbookSetups;
  setSelectedPlaybookId: (id: string) => void;
  updateContextTag: (name: ContextTagName) => void;
  updateEntry: (type: EntryType, status: EntryStatus, skipReason?: SkipReason) => void;
}) {
  return (
    <section className="rounded-md border border-[#dbe2df] bg-white p-3 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.02em]">Playbook / Setup Inspector</h2>
        <MoreVertical className="h-4 w-4 text-[#66746f]" />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <label className="relative">
          <select
            value={playbook.id}
            onChange={(event) => setSelectedPlaybookId(event.target.value)}
            className="h-9 w-full appearance-none rounded-md border border-[#cfd8d4] bg-white px-3 text-[13px] outline-none focus:border-[#0f9f95]"
          >
            {playbookOptions.map((setup) => (
              <option key={setup.id} value={setup.id}>
                {setup.name}
              </option>
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
      <div className="mt-3 grid grid-cols-2 gap-2">
        <LogicBox title="Entry Logic" items={playbook.entryLogic} />
        <LogicBox title="Exit Logic" items={playbook.exitLogic} />
      </div>
      <div className="mt-3 border-t border-[#edf1ef] pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.02em]">Context Confirmation</h3>
          <span className="text-[12px] font-semibold text-[#0f9f95]">
            {opportunity.confirmations} / 7
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {opportunity.contextTags.map((tag) => (
            <button
              key={tag.name}
              onClick={() => updateContextTag(tag.name)}
              className="flex items-center gap-2 rounded-md py-1 text-left text-[12px] hover:bg-[#f0f4f1]"
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                  tag.enabled
                    ? "border-[#0f9f95] bg-[#0f9f95] text-white"
                    : "border-[#9aa6a2] bg-white",
                )}
              >
                {tag.enabled ? <Check className="h-3 w-3" /> : null}
              </span>
              {tag.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[80px_1fr_auto] gap-2 rounded-md border border-[#dbe2df] bg-[#fbfcfa] p-2">
        <div>
          <div className="text-[11px] uppercase text-[#66746f]">Auto Grade</div>
          <div className={cn("mt-1 text-2xl font-semibold", gradeTone(opportunity.grade))}>
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
                  onChange={(event) =>
                    updateEntry(type, event.target.value as EntryStatus, entry?.skipReason)
                  }
                  className="mt-1 h-8 w-full rounded-md border border-[#cfd8d4] bg-white px-2 text-[12px]"
                >
                  {["Waiting", "Taken", "Skipped", "Not Formed"].map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                {entry?.status === "Skipped" ? (
                  <select
                    value={entry.skipReason ?? "Far from EMA"}
                    onChange={(event) =>
                      updateEntry(type, "Skipped", event.target.value as SkipReason)
                    }
                    className="mt-1 h-8 w-full rounded-md border border-[#cfd8d4] bg-white px-2 text-[12px]"
                  >
                    {skipReasons.map((reason) => (
                      <option key={reason}>{reason}</option>
                    ))}
                  </select>
                ) : null}
              </div>
            );
          })}
        </div>
        <button className="self-end rounded-md border border-[#89ccc6] px-4 py-2 text-[12px] font-semibold text-[#08746f] hover:bg-[#effaf8]">
          Save Review
        </button>
      </div>
    </section>
  );
}

function SkipReasons({ opportunities }: { opportunities: Opportunity[] }) {
  const counts = skipReasons.map((reason) => ({
    reason,
    count: opportunities.flatMap((opportunity) => opportunity.entries).filter((entry) => entry.skipReason === reason).length,
  }));

  return (
    <section className="rounded-md border border-[#dbe2df] bg-white p-3 shadow-soft">
      <h2 className="text-[14px] font-semibold uppercase tracking-[0.02em]">Skip Reasons <span className="font-normal text-[#66746f]">(Today)</span></h2>
      <div className="mt-3 grid grid-cols-6 gap-2 max-[900px]:grid-cols-3 max-[560px]:grid-cols-2">
        {counts.map((item) => (
          <div key={item.reason} className="flex h-9 items-center justify-between rounded-md border border-[#dbe2df] px-3 text-[12px]">
            <span>{item.reason}</span>
            <span className="font-semibold text-[#66746f]">{item.count}</span>
          </div>
        ))}
      </div>
    </section>
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
    <section className="rounded-md border border-[#dbe2df] bg-white p-3 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[14px] font-semibold uppercase tracking-[0.02em]">SOP - Daily Checklist</h2>
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-[#08746f]">
            {completed} / {total}
          </span>
          <div className="h-2 w-36 overflow-hidden rounded-full bg-[#e5ebe8]">
            <div
              className="h-full bg-[#4f9a39]"
              style={{ width: `${Math.round((completed / total) * 100)}%` }}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 divide-x divide-[#dbe2df] max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1 max-[640px]:divide-x-0 max-[640px]:divide-y">
        {groups.map((group, groupIndex) => (
          <div key={group.title} className="px-3 first:pl-0 last:pr-0 max-[640px]:py-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold uppercase">{groupIndex + 1}. {group.title}</span>
              <span className="font-semibold text-[#0f9f95]">
                {group.completed} / {group.total}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {group.items.map((item, itemIndex) => (
                <button
                  key={item.label}
                  onClick={() => toggleItem(groupIndex, itemIndex)}
                  className="flex w-full items-center gap-2 text-left text-[12px]"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      item.checked ? "border-[#0f9f95] bg-[#0f9f95] text-white" : "border-[#98a5a0]",
                    )}
                  >
                    {item.checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className={item.checked ? "text-[#263331]" : "text-[#66746f]"}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-5 border-t border-[#edf1ef] pt-3 text-[12px]">
        <button className="font-medium text-[#08746f] underline underline-offset-4">View Full SOP</button>
        <button className="font-medium text-[#08746f] underline underline-offset-4">Print</button>
      </div>
    </section>
  );
}

function AnalyticsRail({
  metrics,
  contextRanking,
  sessionPerformance,
  importPreview,
  onExportCsv,
  onExportXlsx,
  onImportClick,
}: {
  metrics: {
    winRate: number;
    profitFactor: number;
    expectancy: number;
    pnl: number;
    avgR: number;
    ruleBreaks: number;
  };
  contextRanking: { name: string; count: number; score: number }[];
  sessionPerformance: { name: string; total: number; winRate: number; trades: number }[];
  importPreview: ImportPreview | null;
  onExportCsv: () => void;
  onExportXlsx: () => void;
  onImportClick: () => void;
}) {
  return (
    <aside className="space-y-2">
      <section className="rounded-md border border-[#dbe2df] bg-white shadow-soft">
        <div className="border-b border-[#dbe2df] p-3">
          <h2 className="text-[14px] font-semibold uppercase tracking-[0.02em]">Analytics Snapshot</h2>
        </div>
        <div className="space-y-4 p-3">
          <div>
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.02em]">
              Performance <span className="font-normal text-[#66746f]">(This Week)</span>
            </h3>
            <div className="mt-3 grid grid-cols-2 divide-x divide-[#dbe2df]">
              <Metric label="Win Rate" value={formatPercent(metrics.winRate)} tone="good" />
              <Metric label="Expectancy" value={`+${metrics.expectancy.toFixed(2)}R`} tone="good" />
            </div>
            <div className="mt-3 grid grid-cols-3 divide-x divide-[#dbe2df] border-t border-[#edf1ef] pt-3">
              <Metric label="Trades" value="19" />
              <Metric label="Avg R" value={`${metrics.avgR.toFixed(2)}R`} />
              <Metric label="Profit Factor" value={metrics.profitFactor.toFixed(2)} />
            </div>
            <div className="mt-3 h-80px h-[84px]">
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
          </div>
          <div className="border-t border-[#edf1ef] pt-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.02em]">Context Ranking</h3>
            <div className="mt-3 space-y-2">
              {contextRanking.slice(0, 6).map((item) => (
                <div key={item.name} className="grid grid-cols-[96px_1fr_34px] items-center gap-2 text-[12px]">
                  <span className="truncate">{item.name}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-[#e8eeeb]">
                    <div
                      className={cn("h-full", item.score >= 0 ? "bg-[#0f9f95]" : "bg-[#d94848]")}
                      style={{ width: `${Math.min(100, 30 + item.count * 12)}%` }}
                    />
                  </div>
                  <span className="text-right font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[#edf1ef] pt-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.02em]">
              Session Performance <span className="font-normal text-[#66746f]">(This Week)</span>
            </h3>
            <div className="mt-3 space-y-2 text-[12px]">
              {sessionPerformance.map((item) => (
                <div key={item.name} className="grid grid-cols-[1fr_64px_58px_40px] gap-2">
                  <span>{item.name}</span>
                  <span className={item.total >= 0 ? "text-[#08746f]" : "text-[#d94848]"}>
                    {item.total >= 0 ? "+" : ""}
                    {item.total.toFixed(2)}R
                  </span>
                  <span>{formatPercent(item.winRate)}</span>
                  <span>{item.trades}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-[#edf1ef] pt-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.02em]">Recent R Results</h3>
            <div className="mt-3 flex flex-wrap gap-1">
              {trades.map((trade) => (
                <span
                  key={trade.id}
                  className={cn(
                    "rounded px-2 py-1 text-[11px] font-semibold text-white",
                    trade.rMultiple > 0 ? "bg-[#0f9f95]" : "bg-[#d94848]",
                  )}
                >
                  {trade.rMultiple > 0 ? "" : ""}
                  {trade.rMultiple}R
                </span>
              ))}
            </div>
            <div className="mt-3 h-[110px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trades}>
                  <CartesianGrid stroke="#edf1ef" vertical={false} />
                  <XAxis dataKey="ticker" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Bar dataKey="rMultiple" radius={[3, 3, 0, 0]}>
                    {trades.map((trade) => (
                      <Cell key={trade.id} fill={trade.rMultiple > 0 ? "#0f9f95" : "#d94848"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {importPreview ? (
            <div className="rounded-md border border-[#dbe2df] bg-[#fbfcfa] p-2 text-[12px]">
              <div className="font-semibold">Last Import Preview</div>
              <div className="mt-1 text-[#66746f]">
                {importPreview.rows.length} rows, {importPreview.errors.length} parser issues
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-2 border-t border-[#edf1ef] pt-3">
            <button className="flex h-9 items-center justify-center gap-1 rounded-md border border-[#b7d5d2] text-[12px] font-medium text-[#08746f] hover:bg-[#effaf8]">
              Reports <BarChart3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onExportCsv}
              className="flex h-9 items-center justify-center gap-1 rounded-md border border-[#b7d5d2] text-[12px] font-medium text-[#08746f] hover:bg-[#effaf8]"
            >
              CSV <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onExportXlsx}
              className="flex h-9 items-center justify-center gap-1 rounded-md border border-[#b7d5d2] text-[12px] font-medium text-[#08746f] hover:bg-[#effaf8]"
            >
              XLSX <Download className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onImportClick}
              className="col-span-3 flex h-9 items-center justify-center gap-2 rounded-md border border-[#b7d5d2] text-[12px] font-medium text-[#08746f] hover:bg-[#effaf8]"
            >
              <Upload className="h-3.5 w-3.5" />
              Import CSV/XLSX
            </button>
          </div>
        </div>
      </section>
    </aside>
  );
}

function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
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
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border",
          checked ? "border-[#0f9f95] bg-[#0f9f95] text-white" : "border-[#98a5a0]",
        )}
      >
        {checked ? <Check className="h-3 w-3" /> : null}
      </span>
      <span className="text-[#263331]">{label}</span>
    </div>
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

function StatusPill({ status }: { status: Opportunity["status"] }) {
  const styles = {
    Taken: "border-[#89ccc6] bg-[#effaf8] text-[#08746f]",
    Skipped: "border-[#edc474] bg-[#fff7e8] text-[#b86e04]",
    "Not Formed": "border-[#cfd8d4] bg-[#f4f6f5] text-[#66746f]",
    Watching: "border-[#b8c9f3] bg-[#eef3ff] text-[#435da8]",
  };
  return (
    <span className={cn("rounded px-2 py-1 text-[11px] font-medium", styles[status])}>
      {status}
    </span>
  );
}

function ConditionList({ title, tone, items }: { title: string; tone: "good" | "bad"; items: string[] }) {
  return (
    <div>
      <h3 className="text-[12px] font-semibold uppercase tracking-[0.02em]">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-[12px]">
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full text-white",
                tone === "good" ? "bg-[#4f9a39]" : "bg-[#d94848]",
              )}
            >
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
        {items.map((item) => (
          <div key={item}>{item}</div>
        ))}
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
        <button className="rounded border border-white/20 p-1 text-white/80">
          <Search className="h-3 w-3" />
        </button>
        <button className="rounded border border-white/20 p-1 text-white/80">
          <Import className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="px-2 first:pl-0">
      <div className="text-[12px] text-[#66746f]">{label}</div>
      <div
        className={cn(
          "mt-1 text-[20px] font-semibold",
          tone === "good" && "text-[#0f9f95]",
          tone === "bad" && "text-[#d94848]",
        )}
      >
        {value}
      </div>
    </div>
  );
}
