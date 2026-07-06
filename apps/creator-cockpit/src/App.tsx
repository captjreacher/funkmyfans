import { BarChart3, ClipboardList, FileText, PanelLeftClose, PanelLeftOpen, Plus, Route, Search, Settings2, TestTube2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ConnectCreatorModal } from "./components/ConnectCreatorModal";
import { CreatorDetail } from "./pages/CreatorDetail";
import { Creators } from "./pages/Creators";
import { Dashboard } from "./pages/Dashboard";
import { Playbooks } from "./pages/Playbooks";
import { Journeys } from "./pages/Journeys";
import { Queue } from "./pages/Queue";
import { Settings } from "./pages/Settings";
import { Simulations } from "./pages/Simulations";
import { fetchDashboard, type DashboardData } from "./lib/api";
import { FunkMyFansBrand, FunkMyFansSymbol, FunkMyFansWordmark } from "./components/FunkMyFansBrand";

type View = "dashboard" | "creators" | "creator" | "queue" | "playbooks" | "journeys" | "simulations" | "settings";

const navItems: Array<{ view: View; label: string; icon: typeof BarChart3 }> = [
  { view: "dashboard", label: "Dashboard", icon: BarChart3 },
  { view: "creators", label: "Creators", icon: Users },
  { view: "queue", label: "Queue", icon: ClipboardList },
  { view: "playbooks", label: "Playbooks", icon: FileText },
  { view: "journeys", label: "Journeys", icon: Route },
  { view: "simulations", label: "Simulations", icon: TestTube2 },
  { view: "settings", label: "Settings", icon: Settings2 }
];

export function App() {
  const [view, setView] = useState<View>("dashboard");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [simulationScriptId, setSimulationScriptId] = useState<string | undefined>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [connectCreatorOpen, setConnectCreatorOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readStoredBoolean("fmf.appSidebarCollapsed", true));

  useEffect(() => {
    void refreshDashboard();
  }, []);

  useEffect(() => {
    window.localStorage.setItem("fmf.appSidebarCollapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

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

  function openSimulations(scriptId?: string) {
    setSimulationScriptId(scriptId);
    setView("simulations");
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F3EEE8]">
      <div className="flex min-h-screen min-w-0">
        <aside className={`hidden h-screen min-h-0 shrink-0 flex-col overflow-hidden border-r border-[#2a1a26] bg-[#0c0c10] lg:flex ${sidebarCollapsed ? "w-16" : "w-72"}`}>
          <div className={`shrink-0 border-b border-[#2a1a26] ${sidebarCollapsed ? "px-3 py-4" : "px-5 py-5"}`}>
            <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"}`}>
              {sidebarCollapsed ? (
                <FunkMyFansSymbol className="h-10 w-10" />
              ) : (
                <FunkMyFansBrand variant="lockup" className="max-w-full" />
              )}
              <div className={sidebarCollapsed ? "sr-only" : "text-sm text-[#F3EEE8]/68"}>
                Creator operations platform
              </div>
            </div>
          </div>

          <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto p-3">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className={`flex w-full items-center rounded-lg border border-[#2f1f29] bg-[#17171b] px-3 py-2.5 text-sm font-semibold text-[#F3EEE8] ${sidebarCollapsed ? "justify-center" : "gap-3"}`}
              aria-label={sidebarCollapsed ? "Expand app sidebar" : "Collapse app sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden="true" /> : <PanelLeftClose className="h-4 w-4" aria-hidden="true" />}
              <span className={sidebarCollapsed ? "sr-only" : undefined}>{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
            </button>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => setView(item.view)}
                  className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${sidebarCollapsed ? "justify-center" : "gap-3"} ${
                    view === item.view
                      ? "selected-glow text-[#F3EEE8]"
                      : "text-[#F3EEE8]/68 hover:bg-[#24141c]/80 hover:text-[#F3EEE8]"
                  }`}
                  title={item.label}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className={sidebarCollapsed ? "sr-only" : undefined}>{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={openConnectCreator}
              className={`mt-3 flex w-full items-center rounded-lg border border-[#7b3ff2]/24 bg-[#1a1020] px-3 py-3 text-left text-sm font-semibold text-[#F3EEE8] hover:bg-[#241226] hover:text-white ${sidebarCollapsed ? "justify-center" : "gap-3"}`}
              title="Connect Creator"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span className={sidebarCollapsed ? "sr-only" : undefined}>Connect Creator</span>
            </button>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shrink-0 border-b border-[#2a1a26] bg-[#0a0a0a]/82 backdrop-blur-2xl">
            <div className="flex min-h-20 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
              <div>
                <div className="inline-flex items-center gap-3">
                  <FunkMyFansSymbol className="h-16 w-16 shrink-0 md:h-[72px] md:w-[72px]" />
                  <FunkMyFansWordmark className="text-lg md:text-xl" />
                </div>
                <h1 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#F3EEE8] md:text-3xl">Agency operations, organised around creators.</h1>
                <div className="mt-1 text-base text-[#F3EEE8]/68">
                  Connect creators, sync activity, activate playbooks, resolve decisions.
                </div>
              </div>
              <label className="command-card flex min-h-10 w-full max-w-xl items-center gap-3 rounded-lg px-4">
                <Search className="h-5 w-5 text-[#E66A8D]" aria-hidden="true" />
                <input
                  className="w-full bg-transparent text-sm outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c21875]/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
                  placeholder="Search creators, queue items, playbooks, or simulations..."
                />
              </label>
            </div>

            <nav className="flex gap-2 overflow-x-auto border-t border-[#2a1a26] px-3 py-3 lg:hidden">
              {navItems.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => setView(item.view)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${
                    view === item.view
                      ? "selected-glow text-[#F3EEE8]"
                      : "text-[#F3EEE8]/68"
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
                    onOpenSimulations={() => openSimulations()}
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

                {view === "playbooks" ? <Playbooks onOpenSimulations={openSimulations} onOpenBuilder={() => setSidebarCollapsed(true)} /> : null}

                {view === "journeys" ? <Journeys /> : null}

                {view === "simulations" ? <Simulations initialScriptId={simulationScriptId} /> : null}

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

function readStoredBoolean(key: string, fallback: boolean) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}
