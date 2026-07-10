# COMPOSE-5 — Standalone Opportunity Persistence Boundary

Status: proposed (additive, draft PR stacked on COMPOSE-4).
Base: `compose-4-interpretation-opportunity-boundary` @ `797096db` (COMPOSE-4 is not yet merged to `main`; this sprint stacks on it the same way COMPOSE-2 stacked on COMPOSE-1 and COMPOSE-3 on COMPOSE-2). When COMPOSE-4 (PR #37) merges, this PR auto-retargets to `main` with no code change.

## Objective

Persist COMPOSE-4 opportunity signals into the **existing** Opportunity boundary **without** automatically creating Queue items.

```
canonical interpretation signal        (COMPOSE-2 producer → canonical tables)
  → capability outcome                 (COMPOSE-4 buildCapabilityOutcome)
  → opportunity signal                 (COMPOSE-4 mapOutcomeToOpportunitySignal)
  → persisted opportunity              (COMPOSE-5 — this sprint: status "detected")
  → Queue REMAINS UNTOUCHED
```

## 1. Existing Opportunity persistence — evidence found

Repository evidence (not assumptions):

- **Table** `public.of_conversation_opportunities` — migrations `20260703000000_remote_conversation_opportunities.sql` and the identical recovery `20260706042239_recover_conversation_opportunities_schema.sql`. Columns: `id`, `creator_id` (FK), `conversation_instance_id` (FK), `queue_id` (FK, null), `queue_item_id` (FK, null), `source_event_id`, `source_step_id`, `route_key`, `opportunity_classification`, `category`, `title`, `summary`, `status` (default `queued`), `priority` (default `medium`), `queue_handoff` (default `true`), `recommended_next_objective`, `resolved_at`, `metadata jsonb`, `created_at`, `updated_at`. Indexes on `conversation_instance_id`, `queue_item_id`, `status`, `route_key`.
- **No unique constraint** exists on the table (only single-column indexes). The existing `ensureConversationOpportunity` upsert targets `onConflict: "conversation_instance_id,route_key"`, but **there is no backing unique constraint** for that target.
- **Status lifecycle** (`ConversationOpportunityStatus`, of-types): `detected` | `queued` | `resolved` | `cancelled`. COMPOSE-4's pure adapter already uses `detected`; the runtime write path uses `queued`.
- **Create/update path**: `worker.ts ensureConversationOpportunity(supabase, conversation, queueId, step, input)` is the only writer. It requires a `queueId` and is called **only** by `ensureConversationHandoffQueueItem`, which first creates the queue (`ensureCreatorConversationQueue`) and then a `of_queue_items` row, linking `queue_item_id` back onto the opportunity.
- **Opportunity creation currently implies Queue creation.** There is no standalone "persist an opportunity without a queue" path today. Moreover the handoff gate (`worker.ts` end-step: `terminalType === "handoff" && metadata.queueHandoff`) is **off** for every NSP-4 terminal, so **zero** opportunity/queue rows are produced at runtime today (deliberate per NSP-2).

Consequence: because opportunity persistence is subordinate to queue-handoff creation and the only upsert has no backing unique constraint, COMPOSE-5 must (a) add a **new** standalone write path rather than reuse the coupled one, and (b) implement idempotency **without** relying on a DB unique constraint. Both are achieved additively, with **no migration**.

## 2. Standalone persistence contract

Added to `packages/of-types/src/index.ts` (pure, dependency-free). `StandaloneOpportunityPersistenceContract` preserves, for every persisted opportunity:

| Concern | Field | Persisted as |
| --- | --- | --- |
| Opportunity type/category | `category` (`revenue`\|`operations`\|`relationship`) | column `category` |
| Classification | `opportunityClassification` | column `opportunity_classification` |
| Route / dedupe grain | `routeKey` | column `route_key` |
| Source capability | `capabilityKey` | `metadata.capability_key` |
| Capability outcome type | `outcomeType` | `metadata.outcome_type` |
| Source node id (where available) | `sourceNodeId` | `metadata.compose5.source_node_id` |
| Source event / conversation | `sourceEventId`, `conversationInstanceId` | columns `source_event_id`, `conversation_instance_id` |
| Source step | `sourceStepId` | column `source_step_id` |
| Canonical interpretation signals | `canonicalSignals` | `metadata.canonical_signals` |
| Evidence chain | `evidence` | `metadata.evidence` (producer + raw signal + canonical + refs + notes) |
| Identity / owner state | `identityResolved` | `metadata.identity_resolved` |
| Idempotency key | `dedupeKey` | `metadata.compose5.dedupe_key` |
| Status | `status` = `detected` | column `status` |

The payload is built on top of the **existing COMPOSE-4 adapter** `opportunitySignalToConversationOpportunityInput` (no competing model). COMPOSE-5 overlays the standalone guarantees: `status: "detected"`, `queue_id: null`, `queue_item_id: null`, and an additive `metadata.compose5` lineage block. The COMPOSE-4 `metadata.source = "compose4_outcome_boundary"` and `metadata.evidence` are preserved intact, so derivation lineage survives persistence.

## 3. Persistence adapter (pure) + IO port

- `buildStandaloneOpportunityPayload(signal, refs)` — pure `OpportunitySignal → payload` adapter (+ deterministic dedupe key).
- `resolveStandaloneOpportunityPersistence(result, refs)` — takes the **result** of `mapOutcomeToOpportunitySignal` and returns a decision: `{ persist: false, reason }` or `{ persist: true, payload, dedupeKey, routeKey, conversationInstanceId, contract }`. Non-persist reasons flow straight through from the COMPOSE-4 mapping guards; COMPOSE-5 additionally refuses when there is no conversation reference and independently re-asserts the owner-fabrication guard.
- `StandaloneOpportunityStore` — IO **port** exposing **only** `findDetected` / `insert` / `update` on the opportunity store. It has **no Queue method**, so the orchestrator is *structurally* incapable of creating a Queue item.
- `persistStandaloneOpportunity(store, result, refs)` — pure orchestrator: resolve → (if persist) `findDetected` → `planStandaloneOpportunityWrite` → `insert`/`update`. Deterministic given a deterministic store.

The **only** real IO lives in the worker: `createSupabaseStandaloneOpportunityStore(supabase)` implements the port over Supabase, reading/writing `of_conversation_opportunities` exclusively.

Requirements satisfied: deterministic; idempotent (below); evidence-preserving; **no Queue item creation**; explicit non-persist result for weak/unsupported signals; unresolved identity never fabricates an owner; duplicate signals never create duplicate opportunities.

## 4. Idempotency / dedupe rule

Deterministic dedupe key (pure string composition — no hashing, randomness, or clock):

```
compose5:<conversationInstanceId>:<capabilityKey>:<outcomeType>:<category>:<routeKey>
```

Stored at `metadata.compose5.dedupe_key`. The write is **select-then-write** at grain `(conversation_instance_id, route_key, status = "detected")`:

1. `findDetected(conversationInstanceId, routeKey)` returns detected rows for that grain (indexed columns).
2. `planStandaloneOpportunityWrite(existing, dedupeKey)` updates the row whose `metadata.compose5.dedupe_key` matches, else inserts.

This adopts the **same dedupe intent** the existing model already chose (`onConflict conversation_instance_id,route_key`) but implemented without a DB unique constraint, so **no migration** is required and it works whether or not the (unbacked) constraint is ever added.

## 5. API / runtime seam

Smallest evidence-based seam, mirroring the COMPOSE-3 Instagram channel-boundary pattern:

- New guarded endpoint `POST /api/internal/opportunities/persist`, authorized by optional `COMPOSE5_PERSIST_SHARED_SECRET` (open when unset, parity with the BetterFans/Instagram boundaries). It derives outcome → signal → persists standalone, and returns the deterministic result.
- New worker functions `persistStandaloneConversationOpportunity` + `createSupabaseStandaloneOpportunityStore`.

The endpoint does **not** run automations, resolve identity, promote to the Queue, or touch conversation-runtime execution. It is **not** wired into `processConversationInstance`, the handoff gate, or `ensureConversationOpportunity` — so existing runtime behaviour is unchanged (consistent with the invariant and with the fact that the runtime opportunity path is gated off today).

## 6. Queue boundary

- The standalone path **never** calls `ensureConversationHandoffQueueItem` or `ensureCreatorConversationQueue`, and the `StandaloneOpportunityStore` port has no Queue method (source-verified: the two new worker functions issue three `.from(...)` calls, all to `of_conversation_opportunities`, and zero queue calls).
- Persisted rows carry `queue_id = null`, `queue_item_id = null`, `status = "detected"` (never `queued`).
- The existing coupled `ensureConversationOpportunity` / `ensureConversationHandoffQueueItem` path is **left byte-for-byte unchanged** for its current callers.

Result of this sprint: **opportunity persisted, Queue item not created.** Queue consumption / promotion from opportunity to queue item is explicitly deferred to a later sprint.

## 7. New Subscriber reference case (persist)

Using the accepted New Subscriber map + the COMPOSE-4 example:

```
reply "how much for a custom ppv?"
  → inline-regex class purchase_intent      (classifyNewSubscriberReply)
  → canonical purchase_intent               (canonicalFromNsp4)
  → capability outcome offer_opportunity    (identityResolved = true)
  → opportunity signal revenue / buying_signal
  → PERSISTED of_conversation_opportunities row: status "detected",
    category "revenue", route_key "buying_signal", queue_id/queue_item_id null,
    metadata.evidence preserved, metadata.compose5.dedupe_key set
  → NO queue item
```

## 8. Non-persist cases (proven)

- **Unsupported outcome** — `silence_follow_up` / `no_action` / unknown → not produced → not persisted (no store write).
- **Weak confidence** — `offer_opportunity` with confidence `0.3 < OPPORTUNITY_MIN_CONFIDENCE (0.5)` → not produced → not persisted.
- **Unresolved owner** — owner-bearing (`revenue`/`relationship`) with `identityResolved = false` → not produced (COMPOSE-4) **and** independently refused by COMPOSE-5 for hand-built signals → not persisted; reason cites owner fabrication.
- **No conversation reference** — `conversation_instance_id` is `NOT NULL`; a null reference → not persisted.

Operations opportunities (`human_review` / `safety_review`) still persist with unresolved identity because they are not owner-bearing.

## 9. Validation

Deterministic check `apps/creator-cockpit/scripts/compose5-standalone-opportunity-persistence-check.ts` — **44/44 PASS** under Node 24 type-strip (pure boundary in of-types has 0 runtime imports; imported by relative path). It uses an in-memory `StandaloneOpportunityStore` and proves: OpportunitySignal → payload mapping; COMPOSE-4 evidence preserved; supported signal persists; duplicate is idempotent (1 insert + 1 update, one row, same id); distinct route → new row; unsupported/weak/unresolved-owner/no-conversation do not persist; owner never fabricated; deterministic `detected` status; **no queue write** (structural: port has no queue method; row queue links null); Instagram-originated resolved conversation persists via the same boundary while unresolved stays owner-guarded; COMPOSE-4 adapter unchanged.

Regression: `compose2`, `compose3`, `compose4` checks re-run — **ALL PASS**.

Both changed files pass `node --check` (syntax after type-strip).

Blocked locally (state exactly): full `npm ci` / `tsc` / `vite build` cannot run in the sandbox — `registry.npmjs.org` returns **HTTP 403** and `node_modules` is absent (same constraint as prior sprints). The **CI verify job** (`.github/workflows/creator-cockpit-smoke.yml`: `npm ci → typecheck → build`) is the authoritative gate and runs on the PR. Deployed smoke needs a live Worker + Supabase and is skipped unless `COCKPIT_BASE_URL` is set.

Manual acceptance against a live worker (not run here):

```
curl -sS -X POST "$COCKPIT_BASE_URL/api/internal/opportunities/persist" \
  -H 'content-type: application/json' \
  -H "x-compose5-persist-secret: $COMPOSE5_PERSIST_SHARED_SECRET" \
  -d '{"creatorId":"<uuid>","conversationInstanceId":"<uuid>","outcomeKey":"buying_signal","handoffKind":"buying_signal","terminalType":"handoff","rawSignal":"purchase_intent","identityResolved":true}'
# → { ok:true, result:{ persisted:true, deduped:false, opportunityId:"…" } }; replay → deduped:true
```

## 10. Architectural invariants (preserved)

1. Interpretation signals are not opportunities. 2. Capability outcomes are not opportunities. 3. Opportunity signals are not Queue items. 4. Persisted opportunities do not automatically create Queue items. 5. Queue owns work management. 6. Opportunity owns detected commercial/relationship/operations potential. 7. Evidence lineage survives persistence. 8. Idempotency prevents duplicate opportunity spam. 9. Identity uncertainty never fabricates owners. 10. Runtime execution is unchanged except the new persistence seam.

## 11. Explicitly out of scope (not absorbed)

Queue promotion; Queue item creation; human approval workflow; AI/LLM interpretation or classification; scoring engine; billing; creator onboarding; Instagram connector expansion; automated DM sending; Journey/Node Flow/Hermes runtime redesign.

## 12. Remaining gaps

- Standalone persistence is not wired into the live conversation runtime (the handoff gate is off and runtime wiring is intentionally deferred); the seam is proven via the deterministic check + guarded endpoint.
- Idempotency uses select-then-write (no DB unique constraint). If concurrent writers on the same `(conversation, route_key)` ever become possible, a future minimal additive unique index could harden it; not required today.
- Queue promotion / consumption of a persisted `detected` opportunity is future work.
- `metadata.compose5.source_node_id` is populated from `CapabilityOutcome.nodeId`, which is still null at live runtime (per COMPOSE-4); node attribution remains future work.

## 13. Decision gate

**YES.** COMPOSE-4 opportunity signals can now persist into the existing Opportunity boundary with preserved evidence and deterministic idempotency, without creating Queue items or changing runtime execution. Stop after COMPOSE-5; do not auto-start the next sprint.
