import { BarChart3, ClipboardList, Radio, Search, Send, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { CreatorDetail } from "./pages/CreatorDetail";
import { Creators } from "./pages/Creators";
import { Dashboard } from "./pages/Dashboard";
import { Events } from "./pages/Events";
import { OutboundMessages } from "./pages/OutboundMessages";
import { Tasks } from "./pages/Tasks";
import { fetchDashboard, type DashboardData } from "./lib/api";

type View = "dashboard" | "creators" | "creator" | "tasks" | "events" | "outbound";

const navItems: Array<{ view: View; label: string; icon: typeof BarChart3 }> = [
  { view: "dashboard", label: "Dashboard", icon: BarChart3 },
  { view: "creators", label: "Creators", icon: Users },
  { view: "tasks", label: "Tasks", icon: ClipboardList },
  { view: "events", label: "Events", icon: Radio },
  { view: "outbound", label: "Outbound", icon: Send }
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

  return (
    <div className="min-h-screen bg-[#f6f7f2] text-stone-900">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-stone-200 bg-white lg:block">
        <div className="border-b border-stone-200 px-5 py-5">
          <div className="text-lg font-semibold text-stone-950">OF-Pilot</div>
          <div className="text-sm text-stone-500">Creator Operations</div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold ${
                  view === item.view ? "bg-teal-50 text-teal-800" : "text-stone-600 hover:bg-stone-50 hover:text-stone-950"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <div className="text-sm font-semibold text-teal-700">Agency command centre</div>
              <h1 className="text-xl font-semibold text-stone-950">Creator Operations Cockpit</h1>
            </div>
            <label className="flex w-full max-w-md items-center gap-2 rounded-md border border-stone-200 px-3 py-2">
              <Search className="h-4 w-4 text-stone-500" aria-hidden="true" />
              <input className="w-full bg-transparent text-sm outline-none" placeholder="Search creators, tasks, events" />
            </label>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${view === item.view ? "bg-teal-50 text-teal-800" : "text-stone-600"}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="p-4 md:p-6">
          {!data ? (
            <main className="rounded-md border border-stone-200 bg-white p-6 text-stone-600">Loading operations cockpit...</main>
          ) : (
            <>
              {view === "dashboard" ? <Dashboard data={data} onOpenCreator={openCreator} /> : null}
              {view === "creators" ? <Creators data={data} onOpenCreator={openCreator} /> : null}
              {view === "creator" && selectedCreatorId ? <CreatorDetail creatorId={selectedCreatorId} /> : null}
              {view === "tasks" ? <Tasks creators={data.creators} initialTasks={data.tasks} /> : null}
              {view === "events" ? <Events creators={data.creators} initialEvents={data.events} /> : null}
              {view === "outbound" ? <OutboundMessages /> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
