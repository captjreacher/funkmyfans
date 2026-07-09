// NODE-1E browser-acceptance harness.
//
// The full cockpit needs the Worker API + Supabase. This harness installs a
// minimal in-memory fetch stub for the endpoints the Playbooks page touches,
// then mounts the REAL <Playbooks/> component so the NODE-1E contract layer can
// be validated in a browser:
//   open Emma journey -> three nodes render -> click New Subscriber Chat ->
//   the drawer shows the Capability contract (type, entry/exit, owner,
//   readiness "Ready" because the referenced flow exists) -> move a node ->
//   save -> double-click New Subscriber Chat -> the existing Node Flow builder
//   opens (NODE-1D) -> return -> position + context preserved.
//
// It stubs only the transport; all contract/derivation/drill logic under test is
// the real component code. It is a validation harness, not a product surface.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Playbooks } from "../pages/Playbooks";
import "../styles.css";

const SCRIPT_ID = "11111111-1111-4111-8111-111111111111";
const CREATOR_ID = "22222222-2222-4222-8222-222222222222";
const NOW = "2026-01-01T00:00:00.000Z";

// NOTE: EMMA_SCRIPT is a deliberately simplified 3-step transport stub so this
// harness can mount the real Playbooks page without a backend. It is NOT the real
// New Subscriber Funnel — that flow is the 44-step NSP-4 branched map seeded in
// worker.ts newSubscriberFunnelTemplate() (see
// docs/acceptance/nsf-1-new-subscriber-conversation-map-acceptance.md).
const EMMA_SCRIPT = {
  id: SCRIPT_ID,
  creator_id: CREATOR_ID,
  name: "New Subscriber Funnel",
  description: "Emma's welcome funnel",
  trigger_event_type: "onlyfans_subscription_created",
  status: "active",
  action_mode: "draft_for_approval",
  auto_send_enabled: false,
  requires_approval: true,
  cooldown_hours: 24,
  max_sends_per_fan: 1,
  folder_name: "Playbooks",
  category: "New Subscriber",
  tags: ["playbook"],
  version_number: 1,
  source_script_id: null,
  builder_config: {},
  created_at: NOW,
  updated_at: NOW,
  of_creators: { id: CREATOR_ID, username: "moonsiren", display_name: "MoonSiren" },
  steps: [
    { id: "s1", script_id: SCRIPT_ID, step_order: 0, step_type: "message", message_body: "Hey {{subscriber_name}}, welcome in!", delay_minutes: null, condition_key: null, condition_value: null, next_step_id: "s2", fallback_step_id: null, metadata: { kind: "send_message", label: "Welcome" }, created_at: NOW, updated_at: NOW },
    { id: "s2", script_id: SCRIPT_ID, step_order: 1, step_type: "question", message_body: "What brought you here today?", delay_minutes: null, condition_key: null, condition_value: null, next_step_id: "s3", fallback_step_id: null, metadata: { kind: "ask_question", label: "Ask intent" }, created_at: NOW, updated_at: NOW },
    { id: "s3", script_id: SCRIPT_ID, step_order: 2, step_type: "message", message_body: "Amazing — I've got something for you.", delay_minutes: null, condition_key: null, condition_value: null, next_step_id: null, fallback_step_id: null, metadata: { kind: "send_message", label: "Offer" }, created_at: NOW, updated_at: NOW }
  ]
};

const WORKSPACE = {
  creators: [{ id: CREATOR_ID, username: "moonsiren", display_name: "MoonSiren", active: true }],
  scripts: [EMMA_SCRIPT]
};

// Persistence stub (stands in for the playbook_journeys table).
const store: { journey: unknown } = { journey: null };

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const realFetch = window.fetch.bind(window);
window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  try {
    if (/\/api\/scripts\/workspace$/.test(url)) return jsonResponse(WORKSPACE);

    const journeyMatch = url.match(/\/api\/scripts\/([^/]+)\/journey$/);
    if (journeyMatch) {
      if (method === "PUT") {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        store.journey = { ...body, id: body.id ?? `journey-${journeyMatch[1]}`, createdAt: body.createdAt ?? NOW, updatedAt: new Date().toISOString() };
        return jsonResponse({ journey: store.journey });
      }
      return jsonResponse({ journey: store.journey });
    }

    if (/\/api\/scripts\/([^/]+)\/builder$/.test(url)) return jsonResponse({ script: EMMA_SCRIPT });

    const scriptMatch = url.match(/\/api\/scripts\/([^/]+)$/);
    if (scriptMatch) return jsonResponse({ script: EMMA_SCRIPT });

    return jsonResponse({});
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
}) as typeof window.fetch;

function Node1EHarness() {
  return (
    <div className="flex h-screen flex-col bg-[#0A0A0A] text-[#F3EEE8]">
      <div className="border-b border-[#2a1a26] px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
        NODE-1E acceptance harness · real Playbooks page · stubbed API · click a node → Capability contract
      </div>
      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        <Playbooks onOpenSimulations={() => {}} onOpenBuilder={() => {}} />
      </main>
    </div>
  );
}

// Expose the transport stub for cleanup between manual runs.
(window as unknown as { __restoreFetch?: () => void }).__restoreFetch = () => {
  window.fetch = realFetch;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Node1EHarness />
  </StrictMode>
);
