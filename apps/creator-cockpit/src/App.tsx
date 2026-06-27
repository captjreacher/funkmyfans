import { BarChart3, ClipboardList, Cog, Cpu, FileText, Radio, Search, Send, Sparkles, UserRound, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { CreatorDetail } from "./pages/CreatorDetail";
import { Creators } from "./pages/Creators";
import { Dashboard } from "./pages/Dashboard";
import { Events } from "./pages/Events";
import { OutboundMessages } from "./pages/OutboundMessages";
import { Subscribers } from "./pages/Subscribers";
import { Tasks } from "./pages/Tasks";
import { fetchDashboard, type DashboardData } from "./lib/api";

type View = "dashboard" | "creators" | "creator" | "subscribers" | "tasks" | "events" | "outbound";

const navItems: Array<{ view: View; label: string; icon: typeof BarChart3 }> = [
  { view: "dashboard", label: "Dashboard", icon: BarChart3 },
  { view: "creators", label: "Creators", icon: Users },
  { view: "subscribers", label: "Subscribers", icon: UserRound },
  { view: "tasks", label: "Tasks", icon: ClipboardList },
  { view: "events", label: "Events", icon: Radio },
  { view: "outbound", label: "Outbound", icon: Send }
];

const secondaryNav = [
  { label: "Scripts", icon: FileText },
  { label: "Automation", icon: Cpu },
  { label: "Settings", icon: Cog }
];

export function App() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    void fetchDashboard().then(setData);
  }, []);

  function openCreator(id: string) {
    setSelectedCreatorId(id);
    setView("creator");
  }

  const briefing = buildBrief(data);

  return (
    <div className="min-h-screen text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-blue-500/20 bg-[#071423]/88 backdrop-blur-2xl lg:block">
        <div className="border-b border-blue-500/20 px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 shadow-[0_0_34px_rgba(59,130,246,.26)] ring-1 ring-cyan-300/20">
              <Sparkles className="h-6 w-6 text-cyan-300" aria-hidden="true" />
            </div>
            <div>
              <div className="text-lg font-semibold text-white">OF-Pilot // Command Centre</div>
              <div className="text-sm text-blue-200/70">Run creators like an AI-powered agency.</div>
            </div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                  view === item.view ? "selected-glow text-white" : "text-blue-100/68 hover:bg-[#1A3655]/55 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
          <div className="my-3 h-px bg-blue-500/20" />
          {secondaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-blue-100/58 hover:bg-[#1A3655]/55 hover:text-white"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="absolute inset-x-3 bottom-3 space-y-3">
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Zap className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              Today's Brief
            </div>
            <div className="mt-3 grid gap-2">
              <BriefLine label="Open Tasks" value={briefing.openTasks} tone="text-cyan-300" />
              <BriefLine label="Revenue Opportunity" value={briefing.revenueOpportunity} tone="text-emerald-300" />
              <BriefLine label="VIP Fans" value={briefing.vipFans} tone="text-pink-300" />
              <BriefLine label="Churn Alerts" value={briefing.churnAlerts} tone="text-amber-300" />
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-blue-500/20 bg-[#071423]/78 backdrop-blur-2xl">
          <div className="flex min-h-20 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <div className="text-sm font-semibold text-cyan-300">Agency Command Centre</div>
              <h1 className="text-2xl font-semibold text-white">What should your agency do first today?</h1>
            </div>
            <label className="command-card flex min-h-12 w-full max-w-2xl items-center gap-3 rounded-2xl px-4">
              <Search className="h-5 w-5 text-cyan-300" aria-hidden="true" />
              <input className="w-full bg-transparent text-sm outline-none" placeholder="Search creators, subscribers, conversations, tasks..." />
              <span className="hidden rounded-lg border border-blue-400/20 px-2 py-1 text-xs font-semibold text-blue-100/60 sm:inline">Ctrl K</span>
            </label>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${view === item.view ? "selected-glow text-white" : "text-blue-100/68"}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="p-4 md:p-6">
          {!data ? (
            <main className="glass-panel rounded-2xl p-6 text-blue-100/72">
              <div className="mb-3 h-4 w-56 rounded-full shimmer" />
              Loading command intelligence...
            </main>
          ) : (
            <>
              {view === "dashboard" ? <Dashboard data={data} onOpenCreator={openCreator} /> : null}
              {view === "creators" ? <Creators data={data} onOpenCreator={openCreator} /> : null}
              {view === "creator" && selectedCreatorId ? <CreatorDetail creatorId={selectedCreatorId} /> : null}
              {view === "subscribers" ? <Subscribers initialCreators={data.creators} initialSubscribers={data.relationships} initialTasks={data.tasks} onOpenTasks={() => setView("tasks")} /> : null}
              {view === "tasks" ? <Tasks creators={data.creators} relationships={data.relationships} initialTasks={data.tasks} /> : null}
              {view === "events" ? <Events creators={data.creators} initialEvents={data.events} /> : null}
              {view === "outbound" ? <OutboundMessages /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BriefLine({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0D1B2A]/70 px-3 py-2">
      <span className="text-xs font-medium text-blue-100/62">{label}</span>
      <span className={`text-sm font-semibold ${tone}`}>{value}</span>
    </div>
  );
}

function buildBrief(data: DashboardData | null) {
  if (!data) {
    return { openTasks: "n/a", revenueOpportunity: "n/a", vipFans: "n/a", churnAlerts: "n/a" };
  }

  const activeTasks = data.tasks.filter((task) => task.status === "open" || task.status === "in_progress" || task.status === "waiting");
  const revenueTasks = activeTasks.filter((task) => task.task_type.includes("transaction") || task.suggested_action?.includes("offer") || task.suggested_action?.includes("upsell"));
  const revenueOpportunity = data.relationships.reduce((sum, item) => sum + Math.max(0, item.average_order_value || 0), 0);
  return {
    openTasks: activeTasks.length,
    revenueOpportunity: `$${Math.round(revenueOpportunity + revenueTasks.length * 120).toLocaleString()}`,
    vipFans: data.relationships.filter((item) => item.vip_score >= 75 || item.relationship_state === "vip").length,
    churnAlerts: data.relationships.filter((item) => item.churn_risk >= 70 || item.relationship_state === "at_risk").length
  };
}
