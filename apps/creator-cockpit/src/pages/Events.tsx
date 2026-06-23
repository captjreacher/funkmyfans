import { Plug, Power, PowerOff, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OfCreator, OfEvent } from "@of-pilot/of-types";
import { summarizeEventType } from "@of-pilot/of-types";
import { connectEventStream, disconnectEventStream, fetchEvents, fetchEventStreamStatus, type EventStreamStatus } from "../lib/api";

export function Events({ creators, initialEvents }: { creators: OfCreator[]; initialEvents: OfEvent[] }) {
  const [events, setEvents] = useState<OfEvent[]>(initialEvents);
  const [status, setStatus] = useState<EventStreamStatus | null>(null);
  const [creatorId, setCreatorId] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [processingStatus, setProcessingStatus] = useState("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void refreshEvents();
    void fetchEventStreamStatus().then(setStatus);
  }, []);

  const eventTypes = useMemo(() => Array.from(new Set(events.map((event) => event.event_type))).sort(), [events]);
  const processingStatuses = useMemo(() => Array.from(new Set(events.map((event) => event.processing_status))).sort(), [events]);
  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => creatorId === "all" || event.creator_id === creatorId)
      .filter((event) => eventType === "all" || event.event_type === eventType)
      .filter((event) => processingStatus === "all" || event.processing_status === processingStatus);
  }, [creatorId, eventType, events, processingStatus]);

  async function refreshEvents() {
    setLoading(true);
    const result = await fetchEvents();
    setEvents(result.events);
    setLoading(false);
  }

  async function handleConnect() {
    setStatus(await connectEventStream());
  }

  async function handleDisconnect() {
    setStatus(await disconnectEventStream());
  }

  return (
    <main className="space-y-4">
      <section className="rounded-md border border-stone-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-base font-semibold text-stone-950">Realtime Activity Feed</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-stone-500">
              <Plug className="h-4 w-4" aria-hidden="true" />
              <span>{status?.connectionStatus ?? "checking"} / {status?.transport ?? "unknown"}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleConnect} className="inline-flex items-center gap-2 rounded-md bg-stone-950 px-3 py-2 text-sm font-semibold text-white">
              <Power className="h-4 w-4" aria-hidden="true" />
              Connect event stream
            </button>
            <button type="button" onClick={handleDisconnect} className="inline-flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">
              <PowerOff className="h-4 w-4" aria-hidden="true" />
              Disconnect event stream
            </button>
            <button type="button" onClick={() => void refreshEvents()} className="inline-flex items-center gap-2 rounded-md border border-stone-200 px-3 py-2 text-sm font-semibold text-stone-700">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-600">{status?.message ?? "Checking event receiver status."}</div>
      </section>

      <section className="grid gap-3 rounded-md border border-stone-200 bg-white p-3 md:grid-cols-3">
        <select value={creatorId} onChange={(event) => setCreatorId(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All creators</option>
          {creators.map((creator) => (
            <option key={creator.id} value={creator.id}>{creator.display_name || creator.username}</option>
          ))}
        </select>
        <select value={eventType} onChange={(event) => setEventType(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All event types</option>
          {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={processingStatus} onChange={(event) => setProcessingStatus(event.target.value)} className="rounded-md border border-stone-200 px-3 py-2 text-sm">
          <option value="all">All statuses</option>
          {processingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </section>

      <section className="overflow-hidden rounded-md border border-stone-200 bg-white">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-stone-100 text-stone-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Time</th>
              <th className="px-4 py-3 font-semibold">Creator</th>
              <th className="px-4 py-3 font-semibold">Event Type</th>
              <th className="px-4 py-3 font-semibold">Summary</th>
              <th className="px-4 py-3 font-semibold">Processing Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filteredEvents.map((event) => (
              <tr key={event.id}>
                <td className="px-4 py-3 text-stone-700">{date(event.received_at ?? event.created_at)}</td>
                <td className="px-4 py-3 font-medium text-stone-900">{creatorName(event, creators)}</td>
                <td className="px-4 py-3 text-stone-700">{event.event_type}</td>
                <td className="px-4 py-3 text-stone-700">
                  <div>{summarizeEventType(event.event_type)}</div>
                  {event.processing_error ? <div className="mt-1 text-xs font-medium text-rose-700">{event.processing_error}</div> : null}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClass(event.processing_status)}`}>{event.processing_status}</span>
                </td>
              </tr>
            ))}
            {!filteredEvents.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-500">No events match the current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function creatorName(event: OfEvent, creators: OfCreator[]) {
  const nestedCreator = event.of_creators;
  if (nestedCreator) return nestedCreator.display_name || nestedCreator.username;
  const creator = creators.find((item) => item.id === event.creator_id);
  return creator?.display_name || creator?.username || "Unknown creator";
}

function statusClass(status: string) {
  if (status === "failed") return "bg-rose-100 text-rose-800";
  if (status === "received") return "bg-amber-100 text-amber-800";
  return "bg-emerald-100 text-emerald-800";
}

function date(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "unknown";
}
