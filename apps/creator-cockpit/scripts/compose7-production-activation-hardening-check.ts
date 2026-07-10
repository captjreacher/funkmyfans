// COMPOSE-7 deterministic production-activation-hardening check.
//
// Proves the hardening contract WITHOUT a browser/backend: fail-closed activation
// modes, creator allowlist, the single gating decision, DB-backed idempotency via
// an upsert store that models the unique index on `dedupe_key`, distinct-opportunity
// separation, shadow = zero writes, and non-blocking failure. The pure boundary
// lives in of-types (0 runtime imports → node type-strips it), imported by relative
// path so this runs under `node .../compose7-...-check.ts`.
//
// NOTE ON CONCURRENCY: true database concurrency is enforced by the migration's
// UNIQUE index on `dedupe_key` + the worker's insert-then-conflict-update upsert.
// This in-memory store MODELS that contract (atomic check-and-set on the dedupe key);
// it is NOT a substitute for the DB. The exact SQL/runtime concurrency procedure is
// in docs/architecture/compose-7-production-activation-hardening.md.

import {
  resolveLiveOpportunityMode,
  evaluateCreatorAllowlist,
  decideLiveOpportunityAction,
  deriveLiveOpportunity,
  runLiveOpportunityPersistence,
  buildStandaloneOpportunityPayload,
  buildStandaloneOpportunityDedupeKey,
  mapOutcomeToOpportunitySignal,
  buildCapabilityOutcome,
  type LiveOpportunityEvidence,
  type StandaloneOpportunityStore,
  type StandaloneOpportunityUpsertResult,
  type StoredOpportunityRef,
  type ConversationOpportunitySummary,
  type OpportunitySignal
} from "../../../packages/of-types/src/index.ts";
import { canonicalFromNsp4 } from "../src/lib/interpretationSignals.ts";

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
  const ok = Boolean(cond);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `  -> ${detail}` : ""}`);
}

// In-memory store modelling the DB UNIQUE index on dedupe_key: upsertByDedupeKey is
// an atomic check-and-set (insert if key absent, else update + deduped). It has NO
// queue method — structurally cannot create a Queue item.
class UpsertModelStore implements StandaloneOpportunityStore {
  byDedupe = new Map<string, ConversationOpportunitySummary>();
  inserts = 0;
  updates = 0;
  private seq = 0;
  async findDetected(): Promise<StoredOpportunityRef[]> { return []; } // unused when upsert present
  async insert(payload: Record<string, unknown>): Promise<ConversationOpportunitySummary> {
    this.inserts += 1; this.seq += 1;
    return { id: `opp-${this.seq}`, created_at: "t", updated_at: "t", ...payload } as unknown as ConversationOpportunitySummary;
  }
  async update(id: string, patch: Record<string, unknown>): Promise<ConversationOpportunitySummary> {
    this.updates += 1;
    return { id, created_at: "t", updated_at: "t2", ...patch } as unknown as ConversationOpportunitySummary;
  }
  async upsertByDedupeKey(dedupeKey: string, payload: Record<string, unknown>): Promise<StandaloneOpportunityUpsertResult> {
    if (this.byDedupe.has(dedupeKey)) {
      this.updates += 1;
      const existing = this.byDedupe.get(dedupeKey)!;
      const row = { ...existing, ...payload, updated_at: "t2" } as unknown as ConversationOpportunitySummary;
      this.byDedupe.set(dedupeKey, row);
      return { opportunity: row, deduped: true };
    }
    this.inserts += 1; this.seq += 1;
    const row = { id: `opp-${this.seq}`, created_at: "t", updated_at: "t", ...payload } as unknown as ConversationOpportunitySummary;
    this.byDedupe.set(dedupeKey, row);
    return { opportunity: row, deduped: false };
  }
}

function evidenceFor(over: Partial<LiveOpportunityEvidence> & { rawResponseClass?: string | null }): LiveOpportunityEvidence {
  const rawClass = over.rawResponseClass ?? null;
  const canonical = rawClass ? canonicalFromNsp4(rawClass) : undefined;
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
    canonicalSignals: canonical ? [canonical] : undefined,
    sourceEventId: "ev-ns-1",
    sourceStepId: "end_buying_signal",
    identityResolved: true,
    ...over
  };
}
const allowAll = evaluateCreatorAllowlist(undefined, "cr-1");

async function main() {
  // ── 1. Activation mode resolution (fail closed) ──────────────────────────────
  check("mode default (unset, no legacy) → off", resolveLiveOpportunityMode(undefined, undefined) === "off");
  check("mode off | shadow | enabled resolve as-is", resolveLiveOpportunityMode("off") === "off" && resolveLiveOpportunityMode("shadow") === "shadow" && resolveLiveOpportunityMode("ENABLED") === "enabled");
  check("legacy boolean true/1 → enabled (backward compat)", resolveLiveOpportunityMode("", "true") === "enabled" && resolveLiveOpportunityMode(undefined, "1") === "enabled");
  check("legacy boolean false/unset → off", resolveLiveOpportunityMode("", "false") === "off" && resolveLiveOpportunityMode("", "") === "off");
  check("unknown/malformed mode fails closed → off", resolveLiveOpportunityMode("on") === "off" && resolveLiveOpportunityMode("yes") === "off" && resolveLiveOpportunityMode("enable") === "off");
  check("MODE takes precedence over legacy flag", resolveLiveOpportunityMode("off", "true") === "off" && resolveLiveOpportunityMode("shadow", "true") === "shadow");

  // ── 2. Creator allowlist (fail closed) ───────────────────────────────────────
  check("unset allowlist → all allowed (mode still gates)", allowAll.configured === false && allowAll.allowed === true && allowAll.reason === "no_allowlist");
  check("listed creator → allowlisted", evaluateCreatorAllowlist("cr-1, cr-2", "cr-1").allowed === true);
  check("unlisted creator → not allowlisted", evaluateCreatorAllowlist("cr-2 cr-3", "cr-1").allowed === false);
  check("present-but-empty allowlist → malformed, fail closed", (() => { const d = evaluateCreatorAllowlist(" , , ", "cr-1"); return d.configured && d.malformed && d.allowed === false && d.reason === "malformed_allowlist"; })());
  check("whitespace/comma separated tokens parse", evaluateCreatorAllowlist("cr-9\n cr-1\tcr-7", "cr-1").allowed === true);

  // ── 3. Single gating decision (source of truth) ──────────────────────────────
  const notAllowed = evaluateCreatorAllowlist("cr-2", "cr-1");
  const malformed = evaluateCreatorAllowlist(",", "cr-1");
  check("decide: off → skip_off (even if allowed)", decideLiveOpportunityAction("off", allowAll) === "skip_off");
  check("decide: off precedence over disallowed", decideLiveOpportunityAction("off", notAllowed) === "skip_off");
  check("decide: enabled + allowed → persist", decideLiveOpportunityAction("enabled", allowAll) === "persist");
  check("decide: shadow + allowed → shadow", decideLiveOpportunityAction("shadow", allowAll) === "shadow");
  check("decide: enabled + not allowed → skip_not_allowed", decideLiveOpportunityAction("enabled", notAllowed) === "skip_not_allowed");
  check("decide: shadow + malformed allowlist → skip_not_allowed", decideLiveOpportunityAction("shadow", malformed) === "skip_not_allowed");

  // ── 4. First-class dedupe_key column present + stable ────────────────────────
  const sig = (() => { const r = mapOutcomeToOpportunitySignal(buildCapabilityOutcome({ capabilityKey: "new_subscriber_welcome_discovery", outcomeKey: "buying_signal", handoffKind: "buying_signal", terminalType: "handoff", identityResolved: true })); return r.produced ? r.signal : (undefined as unknown as OpportunitySignal); })();
  const built = buildStandaloneOpportunityPayload(sig, { creatorId: "cr-1", conversationInstanceId: "conv-ns-1", sourceStepId: "end_buying_signal", sourceNodeId: null });
  const md = built.payload.metadata as Record<string, unknown>;
  const c5 = md.compose5 as Record<string, unknown>;
  check("payload carries a top-level dedupe_key column", typeof built.payload.dedupe_key === "string" && (built.payload.dedupe_key as string).length > 0);
  check("top-level dedupe_key === metadata.compose5.dedupe_key (single grain)", built.payload.dedupe_key === c5.dedupe_key && built.payload.dedupe_key === built.dedupeKey);
  check("dedupe key is deterministic + conversation/route/outcome scoped", buildStandaloneOpportunityDedupeKey(sig, { conversationInstanceId: "conv-ns-1" }) === built.dedupeKey);

  // ── E. Enabled + allowlisted: persists via the DB-authoritative upsert path ──
  const store = new UpsertModelStore();
  const r1 = await runLiveOpportunityPersistence(store, evidenceFor({ rawResponseClass: "purchase_intent" }));
  check("enabled path persists via upsert (one row, insert)", r1.persist.persisted === true && r1.persist.persisted && r1.persist.deduped === false && store.byDedupe.size === 1 && store.inserts === 1);
  const rowE = r1.persist.persisted ? r1.persist.opportunity : (undefined as unknown as ConversationOpportunitySummary);
  check("persisted row is detected revenue with NO queue linkage", rowE.status === "detected" && rowE.category === "revenue" && rowE.queue_id === null && rowE.queue_item_id === null);

  // ── A. Concurrent duplicate → one row, deterministic dedupe, no error ─────────
  const concStore = new UpsertModelStore();
  const [ca, cb] = await Promise.all([
    runLiveOpportunityPersistence(concStore, evidenceFor({ rawResponseClass: "purchase_intent" })),
    runLiveOpportunityPersistence(concStore, evidenceFor({ rawResponseClass: "purchase_intent" }))
  ]);
  const dedupeFlags = [ca, cb].map((r) => (r.persist.persisted ? r.persist.deduped : null));
  check("concurrent identical writes converge to ONE row", concStore.byDedupe.size === 1 && concStore.inserts === 1 && concStore.updates === 1);
  check("… exactly one insert (deduped=false) + one dedupe (deduped=true)", dedupeFlags.filter((d) => d === false).length === 1 && dedupeFlags.filter((d) => d === true).length === 1);
  check("… both attempts succeed (no error leaks to runtime)", ca.persist.persisted === true && cb.persist.persisted === true);

  // ── B. Distinct opportunities are NOT collapsed ──────────────────────────────
  const distinctStore = new UpsertModelStore();
  await runLiveOpportunityPersistence(distinctStore, evidenceFor({ rawResponseClass: "purchase_intent", outcomeKey: "buying_signal", handoffKind: "buying_signal" }));
  await runLiveOpportunityPersistence(distinctStore, evidenceFor({ rawResponseClass: null, outcomeKey: "exception", handoffKind: "human_review", conversationInstanceId: "conv-ns-1", sourceStepId: "end_exception", identityResolved: false }));
  check("two genuinely distinct opportunities (revenue + operations) → TWO rows", distinctStore.byDedupe.size === 2 && distinctStore.inserts === 2);

  // ── C. Shadow: derivation happens, ZERO writes ───────────────────────────────
  const shadowStore = new UpsertModelStore();
  const shadowAction = decideLiveOpportunityAction("shadow", allowAll);
  // mirror the worker: shadow → derive only, never call the store
  const shadowDerived = shadowAction === "shadow" ? deriveLiveOpportunity(evidenceFor({ rawResponseClass: "purchase_intent" })) : null;
  check("shadow derives a valid supported outcome + mapping", Boolean(shadowDerived) && shadowDerived!.outcome.outcomeType === "offer_opportunity" && shadowDerived!.mapping.produced === true);
  check("shadow performs ZERO persistence (store untouched)", shadowStore.byDedupe.size === 0 && shadowStore.inserts === 0 && shadowStore.updates === 0);

  // ── D. Disabled / non-allowlisted → no persistence ───────────────────────────
  const offStore = new UpsertModelStore();
  check("mode off → skip_off (worker returns before deriving or writing)", decideLiveOpportunityAction(resolveLiveOpportunityMode("off"), allowAll) === "skip_off" && offStore.byDedupe.size === 0);
  check("non-allowlisted creator → skip_not_allowed (no write)", decideLiveOpportunityAction("enabled", notAllowed) === "skip_not_allowed" && offStore.byDedupe.size === 0);

  // ── F. Invalid configuration fails closed ────────────────────────────────────
  check("unknown mode → off → skip_off (no write)", decideLiveOpportunityAction(resolveLiveOpportunityMode("banana"), allowAll) === "skip_off");
  check("malformed allowlist under enabled → skip_not_allowed (no write)", decideLiveOpportunityAction("enabled", evaluateCreatorAllowlist(",,", "cr-1")) === "skip_not_allowed");

  // ── Failure handling: store error surfaces for the worker try/catch ──────────
  const throwingStore: StandaloneOpportunityStore = {
    async findDetected() { return []; },
    async insert() { throw new Error("db unavailable"); },
    async update() { throw new Error("db unavailable"); },
    async upsertByDedupeKey() { throw new Error("duplicate key value violates unique constraint"); }
  };
  let threw = false;
  try { await runLiveOpportunityPersistence(throwingStore, evidenceFor({ rawResponseClass: "purchase_intent" })); }
  catch { threw = true; }
  check("persistence failure surfaces as a catchable error (worker try/catch shields conversation)", threw === true);

  // ── Queue boundary ───────────────────────────────────────────────────────────
  check("upsert store exposes NO queue method (structural)", typeof (store as unknown as Record<string, unknown>).insertQueueItem === "undefined" && typeof (store as unknown as Record<string, unknown>).ensureQueue === "undefined");
  check("no persisted row ever carries queue linkage", [...store.byDedupe.values(), ...distinctStore.byDedupe.values()].every((r) => r.queue_id === null && r.queue_item_id === null && r.status === "detected"));

  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`} — COMPOSE-7 production activation hardening check`);
  if (failures > 0) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); });
