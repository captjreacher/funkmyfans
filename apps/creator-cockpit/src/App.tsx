import { Activity, BarChart3, ClipboardList, Cog, Cpu, FileText, Plus, Radio, Search, Send, Shield, Sparkles, UserRound, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { AuditTrail } from "./pages/AuditTrail";
import { ConnectCreatorModal } from "./components/ConnectCreatorModal";
import { CreatorDetail } from "./pages/CreatorDetail";
import { Creators } from "./pages/Creators";
import { Dashboard } from "./pages/Dashboard";
import { Events } from "./pages/Events";
import { Operations } from "./pages/Operations";
import { OutboundMessages } from "./pages/OutboundMessages";
import { RuntimeMetrics } from "./pages/RuntimeMetrics";
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
  { view: "outbound", label: "Outbound", icon: Send },



];

const secondaryNav = [
  { label: "Scripts", icon: FileText },
  { label: "Automation", icon: Cpu },
  { label: "Settings", icon: Cog }
];

export function App() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [subscriberFilters, setSubscriberFilters] = useState<Record<string, string> | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [connectCreatorOpen, setConnectCreatorOpen] = useState(false);

  useEffect(() => {
    void refreshDashboard();
  }, []);

  async function refreshDashboard() {
    const result = await fetchDashboard();
    setData(result);
  }

  function openCreator(id: string) {
    setSelectedCreatorId(id);
    setView("creator");
  }

  function openSubscribers(filters: Record<string, string>) {
    setSubscriberFilters(filters);
    setView("subscribers");
  }

  function openConnectCreator() {
    setConnectCreatorOpen(true);
  }


  return (
    <div className="min-h-screen text-slate-100">
      <aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-blue-500/20 bg-[#06111d] lg:flex">
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
          <button
            type="button"
            onClick={openConnectCreator}
            className="mt-3 flex w-full items-center gap-3 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-3 text-left text-sm font-semibold text-cyan-100 hover:bg-cyan-400/15 hover:text-white"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            + Connect Creator
          </button>
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
          <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
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
              {view === "dashboard" ? <Dashboard data={data} onOpenCreator={openCreator} onOpenSubscribers={openSubscribers} onConnectCreator={openConnectCreator} /> : null}
              {view === "creators" ? <Creators data={data} onOpenCreator={openCreator} onConnectCreator={openConnectCreator} /> : null}
              {view === "creator" && selectedCreatorId ? <CreatorDetail creatorId={selectedCreatorId} /> : null}
              {view === "subscribers" ? <Subscribers initialCreators={data.creators} initialSubscribers={data.relationships} initialTasks={data.tasks} onOpenTasks={() => setView("tasks")} initialFilters={subscriberFilters} /> : null}
              {view === "tasks" ? <Tasks creators={data.creators} relationships={data.relationships} initialTasks={data.tasks} /> : null}
              {view === "events" ? <Events creators={data.creators} initialEvents={data.events} /> : null}
              {view === "outbound" ? <OutboundMessages /> : null}



            </>
          )}
        </div>
      </div>

      <ConnectCreatorModal
        open={connectCreatorOpen}
        onClose={() => setConnectCreatorOpen(false)}
        onOpenCreator={openCreator}
        onRefresh={refreshDashboard}
      />
    </div>
  );
}
