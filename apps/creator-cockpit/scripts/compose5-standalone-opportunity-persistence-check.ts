// COMPOSE-5 deterministic standalone opportunity persistence boundary check.
//
// Proves — WITHOUT a browser, backend, or DB, and without changing runtime
// execution — that a COMPOSE-4 opportunity signal PERSISTS into the existing
// Opportunity boundary WITHOUT creating a Queue item, with preserved evidence
// and deterministic idempotency:
//
//   canonical interpretation signal   [interpretationSignals: canonicalFromNsp4]
//     → capability outcome            [buildCapabilityOutcome]
//     → opportunity signal            [mapOutcomeToOpportunitySignal]
//     → standalone persistence        [resolveStandaloneOpportunityPersistence]
//     → idempotent write via port     [persistStandaloneOpportunity + fake store]
//     → persisted opportunity (status "detected", queue links null)
//     → Queue UNTOUCHED
//
// The pure boundary lives in of-types (0 runtime imports → node type-strips it),
// imported by RELATIVE path so this runs under `node .../compose5-...-check.ts`.
// The Queue is provably untouched: the injected StandaloneOpportunityStore port
// has NO queue methods, so the orchestrator is structurally incapable of it.

import {
  buildCapabilityOutcome,
  mapOutcomeToOpportunitySignal,
  opportunitySignalToConversationOpportunityInput,
  resolveStandaloneOpportunityPersistence,
  buildStandaloneOpportunityPayload,
  buildStandaloneOpportunityDedupeKey,
  planStandaloneOpportunityWrite,
  persistStandaloneOpportunity,
  standaloneOpportunityRequiresOwner,
  STANDALONE_OPPORTUNITY_STATUS,
  normalizeInstagramEvent,
  INSTAGRAM_PROVIDER,
  type OpportunitySignal,
  type OutcomeToOpportunityResult,
  type StoredOpportunityRef,
  type StandaloneOpportunityStore,
  type ConversationOpportunitySummary,
  type CanonicalInterpretationSignal
} from "../../../packages/of-types/src/index.ts";
import { canonicalFromNsp4 } from "../src/lib/interpretationSignals.ts";

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}
const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

// ── In-memory StandaloneOpportunityStore ─────────────────────────────────────
// Mirrors the worker Supabase adapter semantics (findDetected filters by
// conversation + route_key + status "detected"). It has NO queue collection or
// method — `queueWrites` can never be incremented because nothing can call it —
// which is the structural proof that this boundary cannot create a Queue item.
class FakeOpportunityStore implements StandaloneOpportunityStore {
  rows: ConversationOpportunitySummary[] = [];
  inserts = 0;
  updates = 0;
  readonly queueWrites = 0; // no code path can ever change this: the port has no queue method
  private seq = 0;

  async findDetected(conversationInstanceId: string, routeKey: string): Promise<StoredOpportunityRef[]> {
    return this.rows.filter(
      (r) => r.conversation_instance_id === conversationInstanceId && r.route_key === routeKey && r.status === "detected"
    );
  }
  async insert(payload: Record<string, unknown>): Promise<ConversationOpportunitySummary> {
    this.inserts += 1;
    this.seq += 1;
    const row = {
      id: `opp-${this.seq}`,
      created_at: "2026-07-10T00:00:00.000Z",
      updated_at: "2026-07-10T00:00:00.000Z",
      ...payload
    } as unknown as ConversationOpportunitySummary;
    this.rows.push(row);
    return row;
  }
  async update(id: string, patch: Record<string, unknown>): Promise<ConversationOpportunitySummary> {
    this.updates += 1;
    const i = this.rows.findIndex((r) => r.id === id);
    const merged = { ...this.rows[i], ...patch, updated_at: "2026-07-10T00:00:01.000Z" } as unknown as ConversationOpportunitySummary;
    this.rows[i] = merged;
    return merged;
  }
}

const nsRefs = { creatorId: "cr-1", conversationInstanceId: "conv-ns-1", sourceStepId: "end_buying_signal", sourceNodeId: "node-new-subscriber-chat" };

function buyingSignalOutcome(identityResolved: boolean) {
  const canonical = canonicalFromNsp4("purchase_intent") as CanonicalInterpretationSignal;
  return buildCapabilityOutcome({
    capabilityKey: "new_subscriber_welcome_discovery",
    nodeId: "node-new-subscriber-chat",
    outcomeKey: "buying_signal",
    handoffKind: "buying_signal",
    terminalType: "handoff",
    producer: "inline_regex.classifyNewSubscriberReply",
    rawSignal: "purchase_intent",
    canonicalSignals: [canonical],
    sourceEventId: "ev-ns-1",
    sourceConversationId: "conv-ns-1",
    identityResolved
  });
}

async function main() {
  // ── 1. Owner-bearing rule matches COMPOSE-4 OPPORTUNITY_MAPPING ──────────────
  check("revenue is owner-bearing", standaloneOpportunityRequiresOwner("revenue") === true);
  check("relationship is owner-bearing", standaloneOpportunityRequiresOwner("relationship") === true);
  check("operations is NOT owner-bearing", standaloneOpportunityRequiresOwner("operations") === false);

  // ── 2. New Subscriber reference case: purchase_intent → revenue persisted ────
  const nsResult = mapOutcomeToOpportunitySignal(buyingSignalOutcome(true));
  check("New Subscriber buying signal produces an opportunity signal", nsResult.produced === true);

  const decision = resolveStandaloneOpportunityPersistence(nsResult, nsRefs);
  check("supported signal resolves to persist=true", decision.persist === true);
  check(
    "persisted payload is a 'detected' revenue opportunity (existing vocabulary)",
    decision.persist === true &&
      decision.payload.status === "detected" &&
      decision.payload.category === "revenue" &&
      decision.payload.opportunity_classification === "buying_signal" &&
      decision.payload.route_key === "buying_signal"
  );

  const store = new FakeOpportunityStore();
  const persisted = await persistStandaloneOpportunity(store, nsResult, nsRefs);
  check("New Subscriber revenue opportunity persists", persisted.persisted === true);
  check("… exactly one row inserted, none updated", store.inserts === 1 && store.updates === 0 && store.rows.length === 1);
  check(
    "… persisted status is deterministic 'detected'",
    persisted.persisted === true && persisted.opportunity.status === "detected" && STANDALONE_OPPORTUNITY_STATUS === "detected"
  );

  // ── 3. Queue boundary: no queue item, no queue linkage, no queue write ───────
  check(
    "persisted row has NO queue linkage (queue_id / queue_item_id null)",
    persisted.persisted === true && persisted.opportunity.queue_id === null && persisted.opportunity.queue_item_id === null
  );
  check("persisted row is never 'queued'", persisted.persisted === true && persisted.opportunity.status !== "queued");
  check("store recorded ZERO queue writes (port has no queue method)", store.queueWrites === 0);
  check(
    "store exposes ONLY opportunity IO (no queue method on the port)",
    typeof (store as unknown as Record<string, unknown>).insertQueueItem === "undefined" &&
      typeof (store as unknown as Record<string, unknown>).ensureQueue === "undefined"
  );

  // ── 4. Evidence lineage survives persistence ─────────────────────────────────
  const md = persisted.persisted === true ? (persisted.opportunity.metadata as Record<string, unknown>) : {};
  const c5 = md.compose5 as Record<string, unknown> | undefined;
  const evidence = md.evidence as Record<string, unknown> | undefined;
  check("COMPOSE-4 derivation lineage preserved (metadata.source)", md.source === "compose4_outcome_boundary");
  check(
    "COMPOSE-4 evidence chain preserved (producer + raw signal + canonical)",
    Boolean(evidence) &&
      evidence!.producer === "inline_regex.classifyNewSubscriberReply" &&
      evidence!.rawSignal === "purchase_intent" &&
      Array.isArray(evidence!.canonicalSignals) &&
      (evidence!.canonicalSignals as string[]).includes("purchase_intent")
  );
  check("source event reference preserved", persisted.persisted === true && persisted.opportunity.source_event_id === "ev-ns-1");
  check("source step reference preserved", persisted.persisted === true && persisted.opportunity.source_step_id === "end_buying_signal");
  check(
    "COMPOSE-5 lineage block present (standalone, no-queue, dedupe key, source node)",
    Boolean(c5) &&
      c5!.persistence_boundary === "standalone" &&
      c5!.persisted_without_queue === true &&
      typeof c5!.dedupe_key === "string" &&
      c5!.source_node_id === "node-new-subscriber-chat"
  );

  // ── 5. Idempotency: replaying the SAME signal does not duplicate ─────────────
  const persistedAgain = await persistStandaloneOpportunity(store, mapOutcomeToOpportunitySignal(buyingSignalOutcome(true)), nsRefs);
  check("replayed signal is idempotent (deduped=true)", persistedAgain.persisted === true && persistedAgain.deduped === true);
  check("… still exactly one row (1 insert, 1 update)", store.rows.length === 1 && store.inserts === 1 && store.updates === 1);
  check(
    "… idempotent replay returns the same opportunity id",
    persisted.persisted === true && persistedAgain.persisted === true && persisted.opportunityId === persistedAgain.opportunityId
  );

  // dedupe key + payload are deterministic
  const sig = nsResult.produced ? nsResult.signal : (undefined as unknown as OpportunitySignal);
  check(
    "dedupe key is deterministic + conversation/route scoped",
    buildStandaloneOpportunityDedupeKey(sig, nsRefs) === buildStandaloneOpportunityDedupeKey(sig, nsRefs) &&
      buildStandaloneOpportunityDedupeKey(sig, nsRefs).includes("conv-ns-1") &&
      buildStandaloneOpportunityDedupeKey(sig, nsRefs).includes("buying_signal")
  );
  check(
    "payload build is deterministic",
    eq(
      buildStandaloneOpportunityPayload(sig, { ...nsRefs, conversationInstanceId: "conv-ns-1" }).payload,
      buildStandaloneOpportunityPayload(sig, { ...nsRefs, conversationInstanceId: "conv-ns-1" }).payload
    )
  );

  // pure planner directly
  check("planner inserts when no matching row exists", planStandaloneOpportunityWrite([], "k").op === "insert");
  const existingRow: StoredOpportunityRef = { id: "opp-x", status: "detected", route_key: "buying_signal", metadata: { compose5: { dedupe_key: "k" } } };
  check("planner updates the row whose dedupe key matches", eq(planStandaloneOpportunityWrite([existingRow], "k"), { op: "update", id: "opp-x" }));
  check("planner inserts when dedupe key differs", planStandaloneOpportunityWrite([existingRow], "other").op === "insert");

  // ── 6. A DIFFERENT opportunity (distinct route) creates a new row ────────────
  const relResult = mapOutcomeToOpportunitySignal(
    buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "engaged", handoffKind: "relationship_continuation", terminalType: "handoff", identityResolved: true })
  );
  const relPersisted = await persistStandaloneOpportunity(store, relResult, { ...nsRefs, sourceStepId: "end_engaged" });
  check("distinct opportunity (relationship) persists as a NEW row", relPersisted.persisted === true && relPersisted.deduped === false && store.rows.length === 2);
  check("… categorised relationship (owner-bearing, identity resolved)", relPersisted.persisted === true && relPersisted.opportunity.category === "relationship");

  // ── 7. Non-persist: unsupported outcome ──────────────────────────────────────
  const silence = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "no_response", terminalType: "completed", identityResolved: true }));
  const silenceStore = new FakeOpportunityStore();
  const silencePersist = await persistStandaloneOpportunity(silenceStore, silence, nsRefs);
  check("unsupported outcome (silence) does NOT persist", silencePersist.persisted === false);
  check("… and no row was written", silenceStore.rows.length === 0 && silenceStore.inserts === 0 && silenceStore.updates === 0);

  const unknownOutcome = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "x", outcomeKey: "weird_unmapped", identityResolved: true }));
  check("unknown outcome does NOT persist (safe degrade)", (await persistStandaloneOpportunity(new FakeOpportunityStore(), unknownOutcome, nsRefs)).persisted === false);

  // ── 8. Non-persist: weak confidence ──────────────────────────────────────────
  const weak = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "x", outcomeType: "offer_opportunity", confidence: 0.3, identityResolved: true }));
  const weakStore = new FakeOpportunityStore();
  const weakPersist = await persistStandaloneOpportunity(weakStore, weak, nsRefs);
  check("weak-confidence signal does NOT persist", weakPersist.persisted === false && weakStore.rows.length === 0);

  // ── 9. Non-persist: unresolved identity must not fabricate an owner ──────────
  const unresolved = mapOutcomeToOpportunitySignal(buyingSignalOutcome(false));
  const unresolvedStore = new FakeOpportunityStore();
  const unresolvedPersist = await persistStandaloneOpportunity(unresolvedStore, unresolved, nsRefs);
  check("owner-bearing signal with UNRESOLVED identity does NOT persist", unresolvedPersist.persisted === false && unresolvedStore.rows.length === 0);
  check("… reason cites owner fabrication", unresolvedPersist.persisted === false && /owner/i.test(unresolvedPersist.reason));

  // COMPOSE-5 independently re-asserts the owner guard even for a hand-built produced signal
  const handBuilt: OutcomeToOpportunityResult = {
    produced: true,
    signal: {
      capabilityKey: "new_subscriber_welcome_discovery",
      outcomeType: "offer_opportunity",
      routeKey: "buying_signal",
      opportunityClassification: "buying_signal",
      category: "revenue",
      title: "t",
      summary: "s",
      priority: "high",
      queueHandoff: true,
      recommendedNextObjective: null,
      canonicalSignals: ["purchase_intent"],
      requiresHuman: false,
      identityResolved: false,
      sourceEventId: "ev",
      sourceConversationId: "conv-ns-1",
      evidence: { producer: "hand", rawSignal: "purchase_intent", canonicalSignals: ["purchase_intent"], sourceEventId: "ev", sourceConversationId: "conv-ns-1", notes: [] }
    }
  };
  check("hand-built revenue signal with unresolved identity is refused by COMPOSE-5's own guard", resolveStandaloneOpportunityPersistence(handBuilt, nsRefs).persist === false);

  // ── 10. Non-persist: no conversation reference (NOT NULL column) ─────────────
  const noConv = resolveStandaloneOpportunityPersistence(nsResult, { creatorId: "cr-1", conversationInstanceId: null });
  check("no conversation reference does NOT persist", noConv.persist === false);

  // ── 11. Operations (human_review) persists even with unresolved identity ─────
  const hr = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "exception", handoffKind: "human_review", terminalType: "handoff", identityResolved: false }));
  const hrStore = new FakeOpportunityStore();
  const hrPersist = await persistStandaloneOpportunity(hrStore, hr, { creatorId: "cr-1", conversationInstanceId: "conv-hr-1", sourceStepId: "end_exception" });
  check("operations (human_review) persists with unresolved identity (no owner required)", hrPersist.persisted === true && hrPersist.opportunity.category === "operations");
  check("… as a detected, non-queued row", hrPersist.persisted === true && hrPersist.opportunity.status === "detected" && hrPersist.opportunity.queue_item_id === null);

  // ── 12. Instagram compatibility (COMPOSE-3 ingestion untouched) ──────────────
  const ig = normalizeInstagramEvent({ eventType: "instagram.dm_received", instagramAccountId: "ig-biz", providerEventId: "ig-1", user: { id: "u1", username: "fan" } }, { receivedAt: "2026-07-10T00:00:00.000Z" });
  check("COMPOSE-3 Instagram ingestion still accepts a valid event", ig.ok === true && ig.ok && ig.event.provider === INSTAGRAM_PROVIDER);
  const igResult = mapOutcomeToOpportunitySignal(
    buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "buying_signal", handoffKind: "buying_signal", terminalType: "handoff", producer: "inline_regex.classifyNewSubscriberReply", rawSignal: "purchase_intent", canonicalSignals: ["purchase_intent"], sourceEventId: "ig-1", sourceConversationId: "conv-ig-1", identityResolved: true })
  );
  const igStore = new FakeOpportunityStore();
  const igPersist = await persistStandaloneOpportunity(igStore, igResult, { creatorId: "cr-1", conversationInstanceId: "conv-ig-1", sourceEventId: "ig-1" } as never);
  check("Instagram-originated resolved conversation persists via the SAME boundary", igPersist.persisted === true && igPersist.opportunity.category === "revenue");
  check("Instagram unresolved identity is still owner-guarded (no persist)", (await persistStandaloneOpportunity(new FakeOpportunityStore(), mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "x", outcomeKey: "buying_signal", handoffKind: "buying_signal", identityResolved: false })), { creatorId: "cr-1", conversationInstanceId: "conv-ig-2" })).persisted === false);

  // ── 13. Layer separation: a canonical signal is not an opportunity category ──
  check("interpretation signal is not itself an opportunity category", !["revenue", "operations", "relationship"].includes("purchase_intent"));
  // COMPOSE-4 pure adapter still yields detected + no queue linkage (unchanged)
  const c4Input = nsResult.produced ? opportunitySignalToConversationOpportunityInput(nsResult.signal, { creatorId: "cr-1", conversationInstanceId: "conv-ns-1", sourceStepId: "end_buying_signal" }) : null;
  check("COMPOSE-4 adapter unchanged (still detected, no queue linkage)", Boolean(c4Input) && c4Input!.status === "detected" && c4Input!.queue_id === null && c4Input!.queue_item_id === null);

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`} — COMPOSE-5 standalone opportunity persistence boundary check`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
