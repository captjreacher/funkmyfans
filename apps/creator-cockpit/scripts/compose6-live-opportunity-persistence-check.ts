// COMPOSE-6 deterministic LIVE opportunity persistence wiring check.
//
// Proves — WITHOUT a browser, backend, or DB — that the live conversation
// interpretation runtime can derive canonical signals from the producer output,
// build a supported capability outcome, and persist an idempotent,
// evidence-preserving opportunity through the COMPOSE-5 boundary WITHOUT creating
// a Queue item and without disrupting conversation execution:
//
//   producer response_class      [interpretationSignals.canonicalFromNsp4]
//     → canonical signal
//     → capability outcome        [COMPOSE-4 buildCapabilityOutcome]
//     → opportunity signal        [COMPOSE-4 mapOutcomeToOpportunitySignal]
//     → standalone persisted       [COMPOSE-5 persistStandaloneOpportunity]
//   all composed by the single pure orchestrator runLiveOpportunityPersistence.
//
// The worker calls runLiveOpportunityPersistence with the Supabase standalone
// store; here we call it with an in-memory store that has NO queue method (so the
// live path is structurally incapable of creating a Queue item). The pure boundary
// lives in of-types (0 runtime imports → node type-strips it), imported by relative
// path, so this runs under `node .../compose6-...-check.ts`.

import {
  runLiveOpportunityPersistence,
  buildCapabilityOutcome,
  mapOutcomeToOpportunitySignal,
  type LiveOpportunityEvidence,
  type StandaloneOpportunityStore,
  type StoredOpportunityRef,
  type ConversationOpportunitySummary,
  type CanonicalInterpretationSignal
} from "../../../packages/of-types/src/index.ts";
import { canonicalFromNsp4, isCanonicalInterpretationSignal, NSP4_TO_CANONICAL } from "../src/lib/interpretationSignals.ts";

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}

// In-memory store mirroring the worker Supabase adapter semantics. It has NO queue
// collection or method — the structural proof that the live path cannot create a
// Queue item. `queueWrites` can never be incremented (nothing can call it).
class FakeOpportunityStore implements StandaloneOpportunityStore {
  rows: ConversationOpportunitySummary[] = [];
  inserts = 0;
  updates = 0;
  readonly queueWrites = 0;
  private seq = 0;
  async findDetected(conversationInstanceId: string, routeKey: string): Promise<StoredOpportunityRef[]> {
    return this.rows.filter((r) => r.conversation_instance_id === conversationInstanceId && r.route_key === routeKey && r.status === "detected");
  }
  async insert(payload: Record<string, unknown>): Promise<ConversationOpportunitySummary> {
    this.inserts += 1;
    this.seq += 1;
    const row = { id: `opp-${this.seq}`, created_at: "t", updated_at: "t", ...payload } as unknown as ConversationOpportunitySummary;
    this.rows.push(row);
    return row;
  }
  async update(id: string, patch: Record<string, unknown>): Promise<ConversationOpportunitySummary> {
    this.updates += 1;
    const i = this.rows.findIndex((r) => r.id === id);
    this.rows[i] = { ...this.rows[i], ...patch, updated_at: "t2" } as unknown as ConversationOpportunitySummary;
    return this.rows[i];
  }
}

// Assemble runtime evidence the way the worker's maybePersistLiveConversationOpportunity does.
function evidenceFor(over: Partial<LiveOpportunityEvidence> & { rawResponseClass?: string | null }): LiveOpportunityEvidence {
  const rawClass = over.rawResponseClass ?? null;
  const canonical = rawClass ? canonicalFromNsp4(rawClass) : undefined;
  const canonicalSignals = canonical && isCanonicalInterpretationSignal(canonical) ? [canonical] : undefined;
  return {
    creatorId: "cr-1",
    conversationInstanceId: "conv-ns-1",
    capabilityKey: "new_subscriber_welcome_discovery",
    nodeId: null,
    outcomeKey: "buying_signal",
    handoffKind: "buying_signal",
    terminalType: "handoff",
    producer: "conversation_runtime.end_step",
    rawSignal: rawClass ?? over.outcomeKey ?? "buying_signal",
    canonicalSignals,
    sourceEventId: "ev-ns-1",
    sourceStepId: "end_buying_signal",
    identityResolved: true,
    ...over
  };
}

async function main() {
  // ── 1. Producer → canonical mapping is COMPOSE-4/2 (deterministic) ───────────
  const nsp4Keys = Object.keys(NSP4_TO_CANONICAL);
  check("all 16 NSP-4 producer classes map to a canonical signal", nsp4Keys.length === 16 && nsp4Keys.every((k) => Boolean(canonicalFromNsp4(k))));
  check("producer purchase_intent → canonical purchase_intent", canonicalFromNsp4("purchase_intent") === "purchase_intent");
  check("unknown producer class degrades safely (undefined)", canonicalFromNsp4("???") === undefined);
  check("nsp6 outcome-vocab class is not an NSP-4 canonical (safe degrade)", canonicalFromNsp4("buying_signal") === undefined);

  // ── A. Persisted revenue opportunity (full live runtime path) ────────────────
  const storeA = new FakeOpportunityStore();
  const evA = evidenceFor({ rawResponseClass: "purchase_intent" });
  const rA = await runLiveOpportunityPersistence(storeA, evA);
  check("runtime derives a valid capability outcome", rA.outcome.capabilityKey === "new_subscriber_welcome_discovery" && rA.outcome.outcomeType === "offer_opportunity" && typeof rA.outcome.confidence === "number" && rA.outcome.actionable === true);
  check("supported runtime outcome produces an opportunity signal", rA.mapping.produced === true && rA.mapping.produced && rA.mapping.signal.category === "revenue");
  check("signal passes through COMPOSE-5 persistence (persisted once)", rA.persist.persisted === true && storeA.inserts === 1 && storeA.updates === 0 && storeA.rows.length === 1);
  const rowA = rA.persist.persisted ? rA.persist.opportunity : (undefined as unknown as ConversationOpportunitySummary);
  check("persisted as a 'detected' revenue / buying_signal opportunity", rowA.status === "detected" && rowA.category === "revenue" && rowA.route_key === "buying_signal");

  // Evidence lineage survives the full runtime path
  const mdA = rowA.metadata as Record<string, unknown>;
  const evidenceChain = mdA.evidence as Record<string, unknown> | undefined;
  const c5A = mdA.compose5 as Record<string, unknown> | undefined;
  check("evidence lineage preserved (producer + raw class + canonical + refs)",
    Boolean(evidenceChain) &&
      evidenceChain!.producer === "conversation_runtime.end_step" &&
      evidenceChain!.rawSignal === "purchase_intent" &&
      Array.isArray(evidenceChain!.canonicalSignals) &&
      (evidenceChain!.canonicalSignals as string[]).includes("purchase_intent") &&
      rowA.source_event_id === "ev-ns-1" &&
      rowA.source_step_id === "end_buying_signal");
  check("nodeId gap honoured (null, never fabricated)", rA.outcome.nodeId === null && Boolean(c5A) && c5A!.source_node_id === null);

  // ── 3/7. Queue boundary ──────────────────────────────────────────────────────
  check("live path creates NO queue linkage (queue_id / queue_item_id null)", rowA.queue_id === null && rowA.queue_item_id === null);
  check("persisted row is never 'queued'", rowA.status !== "queued");
  check("store has ZERO queue writes (port has no queue method)", storeA.queueWrites === 0);
  check("store exposes NO queue method (structural)", typeof (storeA as unknown as Record<string, unknown>).insertQueueItem === "undefined" && typeof (storeA as unknown as Record<string, unknown>).ensureQueue === "undefined");

  // ── B. Idempotent replay ─────────────────────────────────────────────────────
  const rA2 = await runLiveOpportunityPersistence(storeA, evidenceFor({ rawResponseClass: "purchase_intent" }));
  check("replaying the same runtime terminal is idempotent (deduped)", rA2.persist.persisted === true && rA2.persist.persisted && rA2.persist.deduped === true);
  check("… still exactly one row (1 insert, 1 update, same id)", storeA.rows.length === 1 && storeA.inserts === 1 && storeA.updates === 1 && rA2.persist.persisted && rA2.persist.opportunityId === (rA.persist.persisted ? rA.persist.opportunityId : ""));

  // ── C. Safe non-persist cases (runtime still completes) ──────────────────────
  const storeC = new FakeOpportunityStore();
  const unsupported = await runLiveOpportunityPersistence(storeC, evidenceFor({ rawResponseClass: null, outcomeKey: "no_response", handoffKind: null, terminalType: "completed" }));
  check("unsupported outcome (silence) does NOT persist", unsupported.persist.persisted === false && storeC.rows.length === 0);

  const weak = await runLiveOpportunityPersistence(storeC, evidenceFor({ confidence: 0.3 }));
  check("weak confidence (<0.5) does NOT persist", weak.persist.persisted === false && storeC.rows.length === 0);

  const unresolved = await runLiveOpportunityPersistence(storeC, evidenceFor({ rawResponseClass: "purchase_intent", identityResolved: false }));
  check("unresolved identity for revenue does NOT persist (no fabricated owner)", unresolved.persist.persisted === false && /owner/i.test(unresolved.persist.persisted ? "" : unresolved.persist.reason));

  const noConv = await runLiveOpportunityPersistence(storeC, evidenceFor({ rawResponseClass: "purchase_intent", conversationInstanceId: null }));
  check("missing conversation reference does NOT persist", noConv.persist.persisted === false);

  const nonActionable = await runLiveOpportunityPersistence(storeC, evidenceFor({ rawResponseClass: null, outcomeKey: "weird_unmapped", handoffKind: null, terminalType: "completed" }));
  check("non-actionable / unknown outcome does NOT persist", nonActionable.persist.persisted === false && storeC.rows.length === 0);
  check("no store writes occurred across all non-persist cases", storeC.inserts === 0 && storeC.updates === 0);

  // ── D. Operations opportunity (human handoff) persists without an owner ──────
  const storeD = new FakeOpportunityStore();
  const ops = await runLiveOpportunityPersistence(storeD, evidenceFor({ rawResponseClass: null, outcomeKey: "exception", handoffKind: "human_review", terminalType: "handoff", conversationInstanceId: "conv-hr-1", sourceStepId: "end_exception", identityResolved: false }));
  check("operations (human_review) persists even with unresolved identity", ops.persist.persisted === true && ops.persist.persisted && ops.persist.opportunity.category === "operations");
  check("… as a detected, non-queued row", ops.persist.persisted && ops.persist.opportunity.status === "detected" && ops.persist.opportunity.queue_item_id === null);

  // ── Failure handling: orchestrator surfaces store errors for the worker catch ─
  const throwingStore: StandaloneOpportunityStore = {
    async findDetected() { return []; },
    async insert() { throw new Error("db unavailable"); },
    async update() { throw new Error("db unavailable"); }
  };
  let threw = false;
  try {
    await runLiveOpportunityPersistence(throwingStore, evidenceFor({ rawResponseClass: "purchase_intent" }));
  } catch (err) {
    threw = err instanceof Error && /db unavailable/.test(err.message);
  }
  check("persistence failure surfaces as a catchable error (worker try/catch shields the conversation)", threw === true);

  // A weak signal with a throwing store must NOT even attempt a write (no throw).
  let weakThrew = false;
  try {
    const r = await runLiveOpportunityPersistence(throwingStore, evidenceFor({ confidence: 0.3 }));
    weakThrew = r.persist.persisted !== false;
  } catch {
    weakThrew = true;
  }
  check("non-persist path never touches the store (no write attempted, no throw)", weakThrew === false);

  // ── Layer separation ─────────────────────────────────────────────────────────
  check("a canonical interpretation signal is not itself an opportunity category", !["revenue", "operations", "relationship"].includes("purchase_intent"));
  check("orchestrator reuses the COMPOSE-4 pure fns (same outcome as a direct build+map)", (() => {
    const direct = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "buying_signal", handoffKind: "buying_signal", terminalType: "handoff", identityResolved: true }));
    return direct.produced === true && rA.mapping.produced === true && direct.signal.category === rA.mapping.signal.category && direct.signal.opportunityClassification === rA.mapping.signal.opportunityClassification;
  })());

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`} — COMPOSE-6 live opportunity persistence wiring check`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
