# COMPOSE-4 — Canonical Interpretation Signals + Outcome → Opportunity Boundary

Status: implemented (additive), based on `main` @ `7877972` (COMPOSE-1–3 + NSF-1 merged).
Branch: `compose-4-interpretation-opportunity-boundary`.

## Objective and decision gate

Wire the older interpretation vocabularies into the canonical interpretation-signal model, then
prove a deterministic boundary from a capability outcome to an opportunity signal — **without
redesigning runtime execution**. Target path:

```
conversation/event evidence
  → existing producer (inline-regex 16-class / ConversationIntent)   [COMPOSE-2 mapping tables]
  → canonical interpretation signal                                  [CanonicalInterpretationSignal]
  → capability outcome                                               [CapabilityOutcome, derived]
  → opportunity signal                                               [OpportunitySignal, deterministic]
  → existing Opportunity boundary                                    [of_conversation_opportunities input adapter]
```

**Decision gate — YES.** Existing interpretation producers map deterministically into canonical
interpretation signals (every one of the 16 inline-regex response classes and all 12
`ConversationIntent` values), and supported capability outcomes produce evidence-preserving
opportunity signals — reusing the existing `revenue`/`operations`/`relationship` opportunity
vocabulary — **without changing runtime execution or Queue ownership**. Unsupported/weak/unknown
evidence degrades safely, and unresolved identity never fabricates an opportunity owner.

## What was implemented

1. **Canonical signal wiring.** The COMPOSE-2 producer→canonical tables
   (`src/lib/interpretationSignals.ts`: `NSP4_TO_CANONICAL`, `CONVERSATION_INTENT_TO_CANONICAL`,
   `canonicalFromNsp4`, `canonicalFromConversationIntent`) are the deterministic mapping layer; they
   are left **unchanged** and are now proven end-to-end to cover every producer output. The runtime
   consumes canonical signals through the new outcome boundary. No producer behaviour changed; no
   vocabulary deleted.
2. **Capability outcome model** (`CapabilityOutcome`, of-types) — a deterministic, **derived**
   descriptor of the bounded outcome a capability reached, independent of how a Node Flow executed it.
3. **Outcome → Opportunity boundary** (`mapOutcomeToOpportunitySignal`, of-types) — maps only
   explicitly supported outcomes to `OpportunitySignal`s, preserves the evidence chain, refuses
   weak/unknown evidence, and refuses to fabricate an owner when identity is unresolved.
4. **Opportunity integration** — a pure adapter
   (`opportunitySignalToConversationOpportunityInput`) shapes an `OpportunitySignal` into the
   existing `of_conversation_opportunities` insert payload (status `detected`, no queue linkage).
   The runtime additively annotates the existing opportunity's `metadata` with the derived
   `{ capability_outcome, opportunity_signal }` — it creates **no** Queue item and changes **no**
   route/category/status.
5. **New Subscriber reference path** — proven from the accepted map (see below).
6. **Instagram compatibility** — proven that an Instagram-originated conversation participates in the
   same canonical→opportunity boundary once conversation evidence exists; COMPOSE-3 ingestion/identity
   is untouched.

## Files changed

| File | Change |
| --- | --- |
| `packages/of-types/src/index.ts` | New COMPOSE-4 block: `CapabilityOutcomeType`, `CapabilityOutcomeEvidence`, `CapabilityOutcome`, `OpportunitySignalCategory`, `OpportunitySignal`, `OutcomeToOpportunityResult`, `OPPORTUNITY_MIN_CONFIDENCE`; pure functions `outcomeTypeFor`, `canonicalSignalsForOutcomeType`, `buildCapabilityOutcome`, `mapOutcomeToOpportunitySignal`, `opportunitySignalToConversationOpportunityInput`. All additive, dependency-free. |
| `apps/creator-cockpit/worker.ts` | Additive, guarded wiring: `deriveIdentityResolvedForConversation`, `buildCompose4OpportunityAnnotation`, and a `compose4` annotation spread into `ensureConversationOpportunity`'s opportunity `metadata`. Imports `buildCapabilityOutcome`, `mapOutcomeToOpportunitySignal`. No routing/category/status/queue change. |
| `apps/creator-cockpit/scripts/compose4-interpretation-opportunity-check.ts` | New deterministic check (37 assertions). |

No migration. `src/lib/interpretationSignals.ts` is unchanged (COMPOSE-2 mapping preserved). No change
to the BetterFans or Instagram ingestion paths, the conversation runtime control flow, the Queue, or
Hermes.

## Exact canonical signal wiring

- **Inline-regex interpretation** (`classifyNewSubscriberReply`, worker.ts) emits 16 response classes;
  each maps to a canonical signal via `canonicalFromNsp4` (e.g. `purchase_intent → purchase_intent`,
  `asks_for_content → content_interest`, `explicit_or_unsupported_request → unsupported_request`,
  `silent_no_reply → silence`). All 16 covered.
- **`ConversationIntent`** (12 values, `OfMessageClassification.primary_intent`) maps via
  `canonicalFromConversationIntent` (e.g. `buying_signal → purchase_intent`, `goodbye → disengaged`).
- **Unknown / unmapped** inputs return `undefined` (mapping) or degrade to the `no_action` outcome
  type — never a fabricated signal.
- The mapping is deterministic and additive; the old vocabularies remain externally represented
  through these compatibility maps (not deleted).

## Exact capability outcome contract (`CapabilityOutcome`)

```ts
{
  capabilityKey: string;            // source capability (registry key)
  nodeId: string | null;            // source journey node, where available
  outcomeType:                      // relationship_continuation | offer_opportunity | content_preference
    CapabilityOutcomeType;          //   | silence_follow_up | boundary_safety | human_handoff | no_action
  outcomeKey: string | null;        // runtime end-step outcome key, where available
  terminalType: string | null;      // completed | handoff, where available
  canonicalSignals: CanonicalInterpretationSignal[];  // consumed/produced
  evidence: {                        // preserved chain
    producer: string;                // e.g. "inline_regex.classifyNewSubscriberReply"
    rawSignal: string | null;        // producer raw output
    canonicalSignals: CanonicalInterpretationSignal[];
    sourceEventId: string | null;
    sourceConversationId: string | null;
    notes: string[];
  };
  confidence: number;                // deterministic readiness in [0,1]
  actionable: boolean;               // whether it warrants an opportunity
  requiresHuman: boolean;            // whether a human necessarily owns next step
  identityResolved: boolean;         // COMPOSE-3 link
}
```

It is **derived** by `buildCapabilityOutcome` (pure, deterministic). It carries a capability *ref*
(`capabilityKey`) but no Node Flow internals (no steps/script) — the Registry does not execute it.

## Exact outcome → opportunity signal contract

`mapOutcomeToOpportunitySignal(outcome) → { produced: true; signal: OpportunitySignal } | { produced: false; reason }`.

Supported outcome → opportunity mapping (reusing the existing runtime opportunity categories):

| outcomeType | category | classification | queueHandoff | owner required |
| --- | --- | --- | --- | --- |
| `offer_opportunity` | `revenue` | `buying_signal` | true | yes |
| `relationship_continuation` | `relationship` | `relationship_continuation` | true | yes |
| `content_preference` | `relationship` | `content_preference` | false | yes |
| `human_handoff` | `operations` | `human_review` | true | no |
| `boundary_safety` | `operations` | `safety_review` | true | no |
| `silence_follow_up`, `no_action`, unknown | — | — | — | not produced |

Guards (deterministic): not-actionable → not produced; `confidence < OPPORTUNITY_MIN_CONFIDENCE (0.5)`
→ not produced; owner-bearing category with `identityResolved === false` → not produced (reason cites
owner fabrication). `OpportunitySignal` carries the preserved `evidence`, `canonicalSignals`,
`sourceEventId`/`sourceConversationId`, and `queueHandoff` (a description of whether the *existing*
lifecycle would route to a human — it does **not** create a Queue item).

## Opportunity persistence: deferred (documented seam)

Existing opportunity persistence (`ensureConversationOpportunity`, `of_conversation_opportunities`
upsert on `conversation_instance_id,route_key`) is **tightly coupled** to Queue-item creation
(`ensureConversationHandoffQueueItem`). To avoid absorbing Queue ownership or adding a divergent write
path, COMPOSE-4 does **not** add a new persistence write. Instead:

- `opportunitySignalToConversationOpportunityInput` is a pure adapter that produces the exact
  `of_conversation_opportunities` insert payload (status `detected`, `queue_id`/`queue_item_id` null),
  documenting the seam.
- The runtime **additively annotates** the existing opportunity row's `metadata.compose4` with the
  derived `capability_outcome` + `opportunity_signal` (or the skip reason). This makes the boundary
  observable in the live path without changing the opportunity's route/category/status and without a
  new write path. Persistence of standalone signals can later flow through the existing upsert seam.

## New Subscriber example path

Accepted map (`nsp-6c`), buying-signal branch:

```
New Subscriber Welcome/Discovery
  reply "how much for a custom ppv?"
  → inline_regex.classifyNewSubscriberReply → "purchase_intent"        [raw producer signal]
  → canonicalFromNsp4 → "purchase_intent"                              [canonical signal]
  → (accepted by make_offer_ppv.supportedInterpretationSignals)
  → buildCapabilityOutcome → outcomeType "offer_opportunity" (conf 0.9, actionable, identityResolved)
  → mapOutcomeToOpportunitySignal → { category: "revenue", classification: "buying_signal",
       queueHandoff: true, evidence.rawSignal: "purchase_intent", canonicalSignals: ["purchase_intent"] }
```

The runtime reaches this outcome at end step `end_buying_signal` (outcomeKey `buying_signal`,
handoffKind `buying_signal`) and the opportunity row is annotated with the derived signal. The
`engaged → relationship`, `exception/human_review → operations`, and `no_response → (no opportunity)`
branches are covered by the check.

## Instagram compatibility note

COMPOSE-3 ingestion and identity boundaries are unchanged (verified: `normalizeInstagramEvent` still
accepts a valid event). Once conversation evidence exists for an Instagram-originated, resolved
identity, that conversation uses the **same** canonical signal vocabulary and the **same**
outcome→opportunity boundary (verified: an Instagram-sourced buying signal produces the same `revenue`
opportunity signal; an unresolved Instagram identity is still owner-guarded). No Instagram runtime
(polling/OAuth/webhooks/DM) was added.

## Validation evidence

- **compose4-interpretation-opportunity-check.ts**: **37/37 PASS** in-sandbox (Node 24 type strip).
  Proves: inline-regex (16) → canonical; `ConversationIntent` (12) → canonical; unknown → safe
  degrade; canonical signals accepted by capability descriptors; capability outcome is deterministic
  and separate from Node Flow execution; supported outcome → opportunity signal; unsupported/weak →
  no signal; evidence preserved producer→signal→outcome→opportunity; unresolved identity blocks owner
  fabrication; no Queue item created (adapter yields `detected`, no queue linkage); COMPOSE-3
  ingestion untouched; Instagram participates in the same boundary.
- **COMPOSE-2 check**: re-run **ALL PASS**. **COMPOSE-3 check**: re-run **ALL PASS** (no regression).
- **typecheck / build**: **blocked in sandbox** — `registry.npmjs.org` returns HTTP 403, so `npm ci`
  (and `tsc`/`vite build`) cannot run locally (same constraint as prior sprints). Authoritative gate
  = the Creator Cockpit Smoke CI verify job (`npm ci → typecheck → build`). Deployed smoke needs a
  live Worker + Supabase; not run. No pass is claimed for checks that did not run.

## Scope not absorbed

No AI/LLM interpretation. No Queue redesign and **no Queue item created by this boundary**. No
Journey/Node Flow runtime redesign (the worker touch is an additive, guarded JSONB-metadata
annotation — routing, categories, status, and queue behaviour are unchanged). No Hermes change. No
Instagram runtime beyond COMPOSE-3. No monetisation/scoring engine, billing, or onboarding. The old
interpretation vocabularies are preserved (not deleted), represented through the canonical
compatibility maps.

## Architectural invariants preserved

Journey = composition · Capability = WHAT · Node Flow = WHICH · **interpretation signals are not
opportunities** · **capability outcomes are not Queue items** · opportunities preserve evidence ·
outcome mapping is deterministic · unsupported evidence degrades safely · **identity uncertainty does
not fabricate relationship ownership** · COMPOSE-3 Channel/Identity boundaries intact.

## Remaining gaps

- **Standalone opportunity persistence** is deferred (documented seam): decoupling opportunity
  persistence from Queue creation so a `detected` opportunity can be persisted without a handoff/queue
  is future work (belongs with a Queue-owning sprint, not here).
- **Classification-level annotation**: `OfMessageClassification` rows are not yet annotated with the
  canonical signal (the canonical mapping stays in `src/lib` for the app; the runtime boundary is
  wired at the opportunity). A later additive pass could stamp the canonical signal onto classification
  evidence.
- **Node/journey attribution**: `CapabilityOutcome.nodeId` is available but the runtime currently
  passes `null` (the runtime works on scripts, not journey node ids); wiring node attribution needs the
  journey↔script binding at runtime.
- Broader opportunity scoring, monetisation strategy, and richer outcome types are intentionally out of
  scope.

Stop after COMPOSE-4. Do not start the next sprint automatically.
