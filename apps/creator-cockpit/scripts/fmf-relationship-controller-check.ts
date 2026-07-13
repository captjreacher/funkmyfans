// FMF-1: Creator Relationship Controller — deterministic check.
//
// Proves the FMF boundary WITHOUT a browser, backend, or Supabase, and without
// changing runtime execution:
//
//   FYV creator_invited / creator_accepted / creator_activated event
//     -> normalize/validate                           [of-types]
//     -> resolve EXISTING FMF↔FYV relationship        [store port]
//     -> ordinal advance from LIVE row (catch-up ok)  [nextStateAfterFmfFyvEvent]
//     -> persist idempotent write + dedupe            [store]
//
// The pure lifecycle + event core lives in of-types and is imported by RELATIVE
// path (of-types has 0 runtime imports -> Node type-strips it), so this runs
// under `node .../fmf-relationship-controller-check.ts` and tsx. The in-memory
// store mirrors createSupabaseFmfFyvRelationshipStore semantics (of_events
// dedupe on providerEventId, live-row recompute) so idempotency + no-regression
// are provable here. Uses MoonSiren ONLY as a fixture — no creator-specific
// behaviour.

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import {
  canTransitionFmfFyvRelationship,
  consumeFmfFyvRelationshipEvent,
  nextStateAfterFmfFyvEvent,
  normalizeFmfFyvRelationshipEvent,
  relationshipStateForEvent,
  FMF_CREATOR_FYV_RELATIONSHIP_STATES,
  FMF_FYV_RELATIONSHIP_EVENT_TYPES,
  FYV_EVENT_PROVIDER,
  type FmfCreatorFyvRelationship,
  type FmfCreatorFyvRelationshipState,
  type FmfFyvRelationshipStore,
  type FmfFyvEventApplyResult,
  type NormalizedFmfFyvRelationshipEvent
} from "../../../packages/of-types/src/index.ts";

let passed = 0;
let failed = 0;
const failures: string[] = [];
function check(name: string, ok: boolean) {
  if (ok) passed += 1;
  else { failed += 1; failures.push(name); }
}

/* --- In-memory store (mirrors createSupabaseFmfFyvRelationshipStore) --------- */

interface MemoryStore {
  store: FmfFyvRelationshipStore;
  row: FmfCreatorFyvRelationship;
  processedEventIds: Set<string>;
  applyCallCount: () => number;
  ofEvents: Array<{ provider_event_id: string; event_type: string }>;
}

function createMemoryStore(seed: FmfCreatorFyvRelationship): MemoryStore {
  let row = { ...seed, metadata: { ...seed.metadata } };
  const processed = new Set<string>();
  let applyCalls = 0;
  const ofEvents: Array<{ provider_event_id: string; event_type: string }> = [];

  const store: FmfFyvRelationshipStore = {
    loadByFmfCreatorId(id) {
      return id === row.fmf_creator_id ? { ...row } : null;
    },
    loadByFyvCreatorId(id) {
      return id === row.fyv_creator_id ? { ...row } : null;
    },
    applyEvent({ event }): FmfFyvEventApplyResult {
      applyCalls += 1;
      // (1) Idempotency guard.
      if (processed.has(event.providerEventId)) {
        return { relationship: { ...row }, transitioned: false, deduped: true };
      }
      // (2) Recompute from LIVE row.
      const finalState = nextStateAfterFmfFyvEvent(row.relationship_state, event.eventType);
      const transitioned = finalState !== row.relationship_state;
      // (3) Merge patch (idempotent per-state timestamps).
      const targetTs = event.occurredAt ?? event.receivedAt;
      const next: FmfCreatorFyvRelationship = {
        ...row,
        relationship_state: transitioned ? finalState : row.relationship_state,
        state_changed_at: transitioned ? event.receivedAt : row.state_changed_at,
        invited_at:
          event.eventType === "creator_invited" && !row.invited_at ? targetTs : row.invited_at,
        accepted_at:
          event.eventType === "creator_accepted" && !row.accepted_at ? targetTs : row.accepted_at,
        activated_at:
          event.eventType === "creator_activated" && !row.activated_at ? targetTs : row.activated_at,
        metadata: {
          ...row.metadata,
          last_event: {
            event_type: event.eventType,
            provider_event_id: event.providerEventId,
            received_at: event.receivedAt,
            occurred_at: event.occurredAt
          }
        }
      };
      row = next;
      // (4) Commit marker.
      ofEvents.push({ provider_event_id: event.providerEventId, event_type: event.eventType });
      processed.add(event.providerEventId);
      return { relationship: { ...row }, transitioned, deduped: false };
    }
  };

  return { store, get row() { return row; }, processedEventIds: processed, applyCallCount: () => applyCalls, ofEvents } as unknown as MemoryStore;
  // (return proxy to expose live row; ts-strip cares about shape only)
}

const MOONSIREN_FMF_ID = "20fdee3c-6998-4e8a-8611-04ab88949301";
const MOONSIREN_FYV_ID = "16bab1fb-e6f0-4e19-9b3b-000000000001";

function seedPending(): FmfCreatorFyvRelationship {
  return {
    id: "rel_1",
    fmf_creator_id: MOONSIREN_FMF_ID,
    fyv_creator_id: MOONSIREN_FYV_ID,
    relationship_state: "pending",
    invited_at: null,
    accepted_at: null,
    activated_at: null,
    state_changed_at: "2026-07-13T00:00:00.000Z",
    metadata: {},
    created_at: "2026-07-13T00:00:00.000Z",
    updated_at: "2026-07-13T00:00:00.000Z"
  };
}

function readFixture(name: string): Record<string, unknown> {
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  const raw = fs.readFileSync(path.join(here, "..", "fixtures", name), "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

async function main() {
  // ---- Strict transitions (single-step legal) ---------------------------------
  check("legal pending->invited", canTransitionFmfFyvRelationship("pending", "invited"));
  check("legal invited->accepted", canTransitionFmfFyvRelationship("invited", "accepted"));
  check("legal accepted->active", canTransitionFmfFyvRelationship("accepted", "active"));
  check("illegal pending->accepted (strict)", !canTransitionFmfFyvRelationship("pending", "accepted"));
  check("illegal pending->active (strict)", !canTransitionFmfFyvRelationship("pending", "active"));
  check("illegal invited->pending (regress)", !canTransitionFmfFyvRelationship("invited", "pending"));
  check("illegal accepted->invited (regress)", !canTransitionFmfFyvRelationship("accepted", "invited"));
  check("illegal active->accepted (regress)", !canTransitionFmfFyvRelationship("active", "accepted"));
  check("illegal same-state pending->pending", !canTransitionFmfFyvRelationship("pending", "pending"));

  // ---- Ordinal advance (catch-up allowed, regress blocked) --------------------
  check("ordinal pending+invited=invited", nextStateAfterFmfFyvEvent("pending", "creator_invited") === "invited");
  check("ordinal pending+accepted=accepted (catch-up)", nextStateAfterFmfFyvEvent("pending", "creator_accepted") === "accepted");
  check("ordinal pending+activated=active (catch-up)", nextStateAfterFmfFyvEvent("pending", "creator_activated") === "active");
  check("ordinal accepted+invited=accepted (no regress)", nextStateAfterFmfFyvEvent("accepted", "creator_invited") === "accepted");
  check("ordinal active+anything=active", nextStateAfterFmfFyvEvent("active", "creator_invited") === "active" && nextStateAfterFmfFyvEvent("active", "creator_accepted") === "active");
  check("relationshipStateForEvent invited=invited", relationshipStateForEvent("creator_invited") === "invited");
  check("relationshipStateForEvent activated=active", relationshipStateForEvent("creator_activated") === "active");
  check("states enum exact", FMF_CREATOR_FYV_RELATIONSHIP_STATES.join(",") === "pending,invited,accepted,active");
  check("events enum exact", FMF_FYV_RELATIONSHIP_EVENT_TYPES.join(",") === "creator_invited,creator_accepted,creator_activated");

  // ---- Normalize (validation guards) ------------------------------------------
  const good = normalizeFmfFyvRelationshipEvent({ event_type: "creator_invited", fyv_creator_id: MOONSIREN_FYV_ID });
  check("valid event normalizes ok", good.ok === true);
  if (good.ok) {
    check("default provider_event_id = eventType:fyvId", good.event.providerEventId === `creator_invited:${MOONSIREN_FYV_ID}`);
    check("fmf_creator_id null when absent", good.event.fmfCreatorId === null);
  }
  const badType = normalizeFmfFyvRelationshipEvent({ event_type: "creator_disabled", fyv_creator_id: MOONSIREN_FYV_ID });
  check("bad event_type rejected 400", badType.ok === false && badType.statusCode === 400 && badType.field === "event_type");
  const missingFyv = normalizeFmfFyvRelationshipEvent({ event_type: "creator_invited" });
  check("missing fyv_creator_id rejected 400", missingFyv.ok === false && missingFyv.statusCode === 400 && missingFyv.field === "fyv_creator_id");
  const notObject = normalizeFmfFyvRelationshipEvent(null);
  check("null payload rejected 400", notObject.ok === false && notObject.statusCode === 400);
  const arrayPayload = normalizeFmfFyvRelationshipEvent([]);
  check("array payload rejected 400", arrayPayload.ok === false && arrayPayload.statusCode === 400);
  const stringPayload = normalizeFmfFyvRelationshipEvent("nope");
  check("string payload rejected 400", stringPayload.ok === false && stringPayload.statusCode === 400);

  // ---- Orchestrator: happy path (in-order events, MoonSiren fixtures) ---------
  {
    const mem = createMemoryStore(seedPending());
    const invited = readFixture("fyv-creator-invited-event.json");
    const accepted = readFixture("fyv-creator-accepted-event.json");
    const activated = readFixture("fyv-creator-activated-event.json");

    const r1 = await consumeFmfFyvRelationshipEvent(mem.store, invited, { receivedAt: "2026-07-13T00:00:01.000Z" });
    check("invited ok + transitioned", r1.ok === true && r1.ok && r1.transitioned === true && r1.relationship.relationship_state === "invited");
    check("invited_at set to occurred_at", r1.ok === true && r1.ok && r1.relationship.invited_at === (invited as { occurred_at?: string }).occurred_at);

    const r2 = await consumeFmfFyvRelationshipEvent(mem.store, accepted, { receivedAt: "2026-07-13T01:00:01.000Z" });
    check("accepted ok + transitioned", r2.ok === true && r2.ok && r2.transitioned === true && r2.relationship.relationship_state === "accepted");
    check("accepted_at set", r2.ok === true && r2.ok && r2.relationship.accepted_at === (accepted as { occurred_at?: string }).occurred_at);

    const r3 = await consumeFmfFyvRelationshipEvent(mem.store, activated, { receivedAt: "2026-07-13T02:00:01.000Z" });
    check("activated ok + transitioned", r3.ok === true && r3.ok && r3.transitioned === true && r3.relationship.relationship_state === "active");
    check("activated_at set", r3.ok === true && r3.ok && r3.relationship.activated_at === (activated as { occurred_at?: string }).occurred_at);
    check("exactly 3 events persisted (commit markers)", mem.ofEvents.length === 3);
    check("of_events order = invited,accepted,activated", mem.ofEvents.map((e) => e.event_type).join(",") === "creator_invited,creator_accepted,creator_activated");
  }

  // ---- Idempotency: replay each event once — no double transition -------------
  {
    const mem = createMemoryStore(seedPending());
    const invited = readFixture("fyv-creator-invited-event.json");
    const first = await consumeFmfFyvRelationshipEvent(mem.store, invited);
    const replay = await consumeFmfFyvRelationshipEvent(mem.store, invited);
    check("first invited transitioned", first.ok === true && first.ok && first.transitioned === true);
    check("replay invited deduped", replay.ok === true && replay.ok && replay.deduped === true && replay.transitioned === false);
    check("replay: exactly one commit marker", mem.ofEvents.length === 1);
    check("replay: state stayed invited", mem.row.relationship_state === "invited");
  }

  // ---- Catch-up: pending + creator_activated -> active in one step ------------
  {
    const mem = createMemoryStore(seedPending());
    const activated = readFixture("fyv-creator-activated-event.json");
    const result = await consumeFmfFyvRelationshipEvent(mem.store, activated);
    check("out-of-order activated: ok + transitioned to active", result.ok === true && result.ok && result.transitioned === true && result.relationship.relationship_state === "active");
    check("out-of-order activated: activated_at set", result.ok === true && result.ok && Boolean(result.relationship.activated_at));
    check("out-of-order: invited_at + accepted_at remain null (only activated event applied)", result.ok === true && result.ok && result.relationship.invited_at === null && result.relationship.accepted_at === null);
  }

  // ---- Out-of-order arrival: activated before invited (both should apply) -----
  {
    const mem = createMemoryStore(seedPending());
    const activated = readFixture("fyv-creator-activated-event.json");
    const invited = readFixture("fyv-creator-invited-event.json");
    await consumeFmfFyvRelationshipEvent(mem.store, activated);
    const late = await consumeFmfFyvRelationshipEvent(mem.store, invited);
    check("late invited: ok + no regress (still active)", late.ok === true && late.ok && late.relationship.relationship_state === "active");
    check("late invited: transitioned=false (no state change)", late.ok === true && late.ok && late.transitioned === false);
    check("late invited: invited_at NOW backfilled", late.ok === true && late.ok && Boolean(late.relationship.invited_at));
    check("late invited: 2 commit markers persisted", mem.ofEvents.length === 2);
  }

  // ---- Unknown relationship: 404, never create --------------------------------
  {
    const mem = createMemoryStore(seedPending());
    const orphan = { event_type: "creator_invited", fyv_creator_id: "ghost-fyv-id" };
    const result = await consumeFmfFyvRelationshipEvent(mem.store, orphan);
    check("unknown fyv_creator_id rejected 404", result.ok === false && result.statusCode === 404 && result.field === "fyv_creator_id");
    check("unknown: no commit marker", mem.ofEvents.length === 0);
    check("unknown: relationship untouched", mem.row.relationship_state === "pending" && mem.row.invited_at === null);
  }

  // ---- Resolution: prefers fmf_creator_id over fyv_creator_id -----------------
  {
    const mem = createMemoryStore(seedPending());
    // Craft an event where fmf id matches but fyv id doesn't — resolution by fmf wins.
    const event = { event_type: "creator_invited", fmf_creator_id: MOONSIREN_FMF_ID, fyv_creator_id: "different-fyv-id" };
    const result = await consumeFmfFyvRelationshipEvent(mem.store, event);
    check("resolves by fmf_creator_id even when fyv_creator_id mismatches", result.ok === true && result.ok && result.transitioned === true);
  }

  // ---- Report ----------------------------------------------------------------
  const total = passed + failed;
  if (failed > 0) {
    console.error(`\nFMF-1 relationship controller check FAILED: ${passed}/${total} passed`);
    for (const name of failures) console.error(`  - ${name}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[fmf-relationship-controller-check] ${passed}/${total} PASS`);
}

await main();
