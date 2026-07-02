import { BarChart3, ClipboardList, FileText, Plus, Search, Settings2, Sparkles, TestTube2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ConnectCreatorModal } from "./components/ConnectCreatorModal";
import { CreatorDetail } from "./pages/CreatorDetail";
import { Creators } from "./pages/Creators";
import { Dashboard } from "./pages/Dashboard";
import { Playbooks } from "./pages/Playbooks";
import { Queue } from "./pages/Queue";
import { Settings } from "./pages/Settings";
import { Simulations } from "./pages/Simulations";
import { fetchDashboard, type DashboardData } from "./lib/api";

type View = "dashboard" | "creators" | "creator" | "queue" | "playbooks" | "simulations" | "settings";

const navItems: Array<{ view: View; label: string; icon: typeof BarChart3 }> = [
  { view: "dashboard", label: "Dashboard", icon: BarChart3 },
  { view: "creators", label: "Creators", icon: Users },
  { view: "queue", label: "Queue", icon: ClipboardList },
  { view: "playbooks", label: "Playbooks", icon: FileText },
  { view: "simulations", label: "Simulations", icon: TestTube2 },
  { view: "settings", label: "Settings", icon: Settings2 }
];

export function App() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
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

  function openConnectCreator() {
    setConnectCreatorOpen(true);
  }

  function openCreators() {
    setView("creators");
  }

  return (
    <div className="h-screen overflow-hidden text-slate-100">
      <div className="flex h-full min-w-0 overflow-hidden">
        <aside className="hidden h-full min-h-0 w-72 shrink-0 flex-col overflow-hidden border-r border-blue-500/20 bg-[#06111d] lg:flex">
          <div className="shrink-0 border-b border-blue-500/20 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 shadow-[0_0_34px_rgba(59,130,246,.20)] ring-1 ring-cyan-300/20">
                <Sparkles className="h-6 w-6 text-cyan-300" aria-hidden="true" />
              </div>
              <div>
                <div className="text-lg font-semibold text-white">Creator Cockpit</div>
                <div className="text-sm text-blue-200/70">Creator operations platform</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => setView(item.view)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${
                    view === item.view
                      ? "selected-glow text-white"
                      : "text-blue-100/68 hover:bg-[#1A3655]/55 hover:text-white"
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
              className="mt-3 flex w-full items-center gap-3 rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-3 text-left text-sm font-semibold text-cyan-100 hover:bg-cyan-400/15 hover:text-white"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Connect Creator
            </button>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shrink-0 border-b border-blue-500/20 bg-[#071423]/78 backdrop-blur-2xl">
            <div className="flex min-h-20 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
              <div>
                <div className="text-sm font-semibold text-cyan-300">Creator Cockpit</div>
                <h1 className="text-xl font-semibold text-white">Agency operations, organised around creators.</h1>
                <div className="mt-1 text-sm text-blue-200/70">
                  Connect creators, sync activity, activate playbooks, resolve decisions.
                </div>
              </div>
              <label className="command-card flex min-h-10 w-full max-w-xl items-center gap-3 rounded-lg px-4">
                <Search className="h-5 w-5 text-cyan-300" aria-hidden="true" />
                <input
                  className="w-full bg-transparent text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071423]"
                  placeholder="Search creators, queue items, playbooks, or simulations..."
                />
              </label>
            </div>

            <nav className="flex gap-2 overflow-x-auto border-t border-blue-500/20 px-3 py-3 lg:hidden">
              {navItems.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => setView(item.view)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${
                    view === item.view
                      ? "selected-glow text-white"
                      : "text-blue-100/68"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </header>

          <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-6">
            {!data ? (
              <div className="glass-panel rounded-2xl p-6 text-blue-100/72">
                <div className="mb-3 h-4 w-56 rounded-full shimmer" />
                Loading cockpit...
              </div>
            ) : (
              <>
                {view === "dashboard" ? (
                  <Dashboard
                    data={data}
                    onOpenCreators={() => openCreators()}
                    onOpenQueue={() => setView("queue")}
                    onOpenPlaybooks={() => setView("playbooks")}
                    onOpenSimulations={() => setView("simulations")}
                    onOpenSettings={() => setView("settings")}
                    onConnectCreator={openConnectCreator}
                  />
                ) : null}

                {view === "creators" ? (
                  <Creators
                    data={data}
                    onOpenCreator={openCreator}
                    onConnectCreator={openConnectCreator}
                  />
                ) : null}

                {view === "creator" && selectedCreatorId ? <CreatorDetail creatorId={selectedCreatorId} /> : null}

                {view === "queue" ? <Queue /> : null}

                {view === "playbooks" ? <Playbooks /> : null}

                {view === "simulations" ? <Simulations /> : null}

                {view === "settings" ? <Settings /> : null}
              </>
            )}
          </main>
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
