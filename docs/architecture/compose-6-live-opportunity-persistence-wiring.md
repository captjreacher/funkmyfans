# COMPOSE-6 — Live Opportunity Persistence Wiring

Status: proposed (additive, draft PR based on `main`).
Base: `main` @ `b760f28` (COMPOSE-1–5 merged: #33 NSF-1, #34 COMPOSE-1, #35 COMPOSE-2, #36 COMPOSE-3, #37 COMPOSE-4, #38 COMPOSE-5).

## Objective

Wire the COMPOSE-4 → COMPOSE-5 semantic + persistence path into the **live** conversation interpretation runtime so supported opportunity signals persist automatically, while the Queue stays untouched.

```
conversation evidence
  → existing interpretation producer  (inline-regex classifyNewSubscriberReply)
  → canonical interpretation signal   (COMPOSE-2 canonicalFromNsp4)
  → capability outcome                (COMPOSE-4 buildCapabilityOutcome)
  → opportunity signal                (COMPOSE-4 mapOutcomeToOpportunitySignal)
  → standalone persisted opportunity  (COMPOSE-5 persistStandaloneOpportunity, status "detected")
  → Queue REMAINS UNTOUCHED
```

## 1. Live interpretation path — evidence found (no assumptions)

- **Producer / classification seam**: `resolveRuntimeVariableValue` (worker.ts) runs `classifyNewSubscriberReply` (16 NSP-4 response classes) via the `__classify_nsp_response__` token, and `classifyShortNewSubscriberReply` via `__classify_nsp6_response__`. It is invoked from the **`set_variable` step handler** inside `processConversationInstance`, which assigns `variables.response_class` / `variables.next_response_class` and records `variable_set` history.
- **Terminal seam**: the **`end` step handler** in `processConversationInstance` computes `outcomeKey` / `outcomeLabel` / `terminalType`, then branches: (1) `terminalType === "handoff" && metadata.queueHandoff` → `ensureConversationHandoffQueueItem` (the Queue-coupled writer); (2) otherwise → `markConversationCompleted`. The handoff gate is **off** for all NSP-4 terminals, so **every** NSP-4 terminal reaches branch (2) and **no** opportunity/Queue rows are created today.
- **Existing opportunity/Queue writers**: `ensureConversationOpportunity` (requires a `queueId`) is called only by `ensureConversationHandoffQueueItem`. COMPOSE-6 does not touch either.
- **Canonical mapping**: `src/lib/interpretationSignals.ts` (COMPOSE-2) is pure (type-only `of-types` import) and exports `canonicalFromNsp4` / `isCanonicalInterpretationSignal`.

## 2. Raw producer → canonical signal wiring

In the `set_variable` handler, after the producer assigns `response_class`/`next_response_class`, `deriveCompose6CanonicalSignal(variableKey, variables)` maps the producer class → canonical via `canonicalFromNsp4` and threads it forward on the conversation variables (`__compose6_last_response_class`, `__compose6_last_canonical_signal`), also recording it in `variable_set` history. The **producer is preserved** (the `response_class` variable is untouched, the classifier is unchanged); the canonical signal is a **derived** additive output. Unknown / other-vocabulary classes (e.g. the nsp6 outcome vocab) degrade to no canonical signal. No AI / no probabilistic interpretation.

## 3. Capability outcome construction

At the terminal seam, `maybePersistLiveConversationOpportunity` assembles `LiveOpportunityEvidence` from real runtime evidence and the pure COMPOSE-4 boundary builds the `CapabilityOutcome`: `capabilityKey = new_subscriber_welcome_discovery`; `outcomeKey` / `handoffKind` / `terminalType` from step metadata; `rawSignal` = recorded `response_class`; `canonicalSignals` = the derived canonical signal (when present); `sourceEventId` = `conversation.originating_event_id`; `sourceConversationId` = `conversation.id`; `sourceStepId` = end-step id; `identityResolved` = `deriveIdentityResolvedForConversation(conversation)`. **`nodeId` is `null`** — the live runtime cannot identify the Journey node at this seam (documented gap, never fabricated). No Node Flow internals are copied into the outcome.

## 4. Outcome → opportunity signal

Unchanged COMPOSE-4 `mapOutcomeToOpportunitySignal`, invoked inside the pure orchestrator. All COMPOSE-4 guards hold: supported outcome, actionable, `confidence ≥ OPPORTUNITY_MIN_CONFIDENCE (0.5)`, owner-bearing categories require resolved identity, full evidence lineage. Unsupported / weak outcomes yield no signal and never persist.

## 5. Persistence through the COMPOSE-5 boundary

The new pure orchestrator `runLiveOpportunityPersistence(store, evidence)` (of-types) composes `buildCapabilityOutcome` → `mapOutcomeToOpportunitySignal` → `persistStandaloneOpportunity` — **no duplicated mapping or persistence logic**. The worker passes the COMPOSE-5 `createSupabaseStandaloneOpportunityStore(supabase)`. Status stays `detected`; `queue_id` / `queue_item_id` stay null; dedupe is the COMPOSE-5 deterministic key (replay-safe). Persistence never throws into conversation execution (see §14).

## 6. Activation policy

No existing boolean feature-flag convention exists in the worker, so COMPOSE-6 adds an explicit env flag **`COMPOSE6_LIVE_OPPORTUNITY_PERSISTENCE_ENABLED`** (enabled only when `"true"` / `"1"`). **Default OFF** (conservative): with the flag unset the live seam is a no-op. The COMPOSE-5 internal test endpoint (`POST /api/internal/opportunities/persist`) is **not** used as the production runtime seam.

## 7. Queue boundary

The live helper never calls `ensureConversationHandoffQueueItem`, `ensureCreatorConversationQueue`, or `ensureConversationOpportunity`; it persists through the COMPOSE-5 store port, which touches **only** `of_conversation_opportunities` and has **no** Queue method (source-verified: the helper body has zero queue calls). Persisted rows: `queue_id = null`, `queue_item_id = null`, `status = detected`. The existing Queue-coupled path (branch 1 of the end step) is left **unchanged**. Queue promotion remains future work.

## 8. Reference runtime cases (deterministic check, in-memory store)

- **A — persisted revenue**: `purchase_intent` → canonical `purchase_intent` → `offer_opportunity` → revenue / `buying_signal` → one persisted `detected` opportunity, evidence preserved, **no Queue item**.
- **B — idempotent replay**: same terminal processed twice → deduped (1 insert + 1 update, one row, same id).
- **C — safe non-persist**: unsupported outcome (silence), weak confidence (<0.5), unresolved owner for revenue, missing conversation reference, non-actionable/unknown — none persist, no store writes, runtime completes normally.
- **D — operations**: `human_review` → operations opportunity persists even with unresolved identity (not owner-bearing), still no Queue item.

## 9. Observability

`maybePersistLiveConversationOpportunity` records a `of_conversation_history` entry per terminal: `opportunity_persisted` / `opportunity_deduplicated` / `opportunity_signal_rejected` / `opportunity_persist_failed`, with payload `{capability_key, outcome_type, canonical_signals, identity_resolved, opportunity_produced, opportunity_signal_reason, persisted, deduped, opportunity_id, not_persisted_reason, queue_item_created:false}`. The `set_variable` seam adds `canonical_interpretation_signal` to `variable_set` history. Uses the existing history convention only; no new subsystem; no raw message content is logged.

## 10. Validation

New `apps/creator-cockpit/scripts/compose6-live-opportunity-persistence-check.ts` — **28/28 PASS** (Node 24 type-strip). Proves: producer→canonical mapping; runtime derives a valid outcome; supported outcome → signal → COMPOSE-5 persistence; case A persists exactly once; case B idempotent; cases C non-persist with no store writes; case D operations; **failure handling** (a throwing store surfaces a catchable error so the worker's try/catch shields the conversation; the non-persist path never touches the store); Queue boundary (no queue method, null queue links, never `queued`); evidence lineage; nodeId-null gap. `compose2/3/4/5` re-run **ALL PASS** (no regression). Both changed source files pass `node --check`.

**Blocked locally**: `npm ci` / `tsc` / `vite build` cannot run — `registry.npmjs.org` HTTP 403, `node_modules` absent (same as every prior sprint). The CI **verify** job (`npm ci → typecheck → build`) is authoritative. A local Worker/API runtime test needs a live Worker + Supabase (ECONNREFUSED :8787) and was not run; the injected in-memory store proves the orchestration deterministically instead.

## 11. Out of scope (not absorbed)

Queue promotion / Queue item creation; human approval UI; Queue redesign; AI/LLM interpretation; new opportunity scoring; Instagram OAuth/polling/webhook; automated messaging; Journey / Node Flow / Hermes redesign; fuzzy identity resolution; billing; onboarding; uniqueness migration (not essential — COMPOSE-5 dedupe is select-then-write).

## 12. Architectural invariants (preserved)

1. Existing producers remain the source of raw interpretation. 2. Canonical mapping is deterministic. 3. Capability outcomes are separate from Node Flow execution. 4. Opportunity signals are separate from persisted opportunities. 5. Persisted opportunities are separate from Queue items. 6. Live persistence uses the COMPOSE-5 boundary. 7. Queue ownership is not absorbed. 8. Identity uncertainty never fabricates ownership. 9. Evidence lineage survives the full runtime path. 10. Persistence failure never corrupts conversation execution. 11. Replay never creates duplicate opportunity spam. 12. COMPOSE-3 Channel/Identity boundaries are unchanged.

## 13. Remaining gaps

- `nodeId` is null at the live seam (runtime cannot resolve the Journey node) — node attribution remains future work.
- Activation defaults OFF; enabling in production requires setting the env flag after operational review.
- Idempotency remains select-then-write (no DB unique constraint); a future minimal unique index could harden concurrency.
- Only the terminal (end-step) seam persists; per-turn classification-level persistence is out of scope.
- Queue promotion / consumption of `detected` opportunities is future work.

## 14. Failure handling

`maybePersistLiveConversationOpportunity` is wrapped in `try/catch`: any error (store failure, mapping edge) is swallowed and recorded as `opportunity_persist_failed` history (best-effort, nested try/catch), so conversation execution is never blocked or corrupted. The persistence call sits **before** the terminal's existing control flow and does not alter it.

## Decision gate

**YES** — the live conversation interpretation runtime can now derive canonical signals, build supported capability outcomes, and persist idempotent, evidence-preserving opportunities through the COMPOSE-5 boundary, without creating Queue items and without disrupting conversation execution (flag-gated, default OFF). Stop after COMPOSE-6; do not auto-start the next sprint.
