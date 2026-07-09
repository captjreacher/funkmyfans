# COMPOSE-3 — Instagram Entry + Identity Resolution

Status: implemented (additive), stacked on COMPOSE-2 (`compose-2-capability-registry` @ `4937548`).
Branch: `compose-3-instagram-identity`.

## Objective and decision gate

Prove the architectural path:

```
Instagram event
  → Channel: Instagram Entry (capability channel_source_entry)   [canonical ingestion boundary]
  → provisional identity evidence                                [ProvisionalIdentity]
  → Identity Resolution (capability identity_resolution)         [deterministic resolution]
  → downstream relationship context                             [RelationshipContextProjection]
```

**Decision gate — YES.** An Instagram-originated event can now enter through a Channel capability
(`POST /api/events/instagram` → `of_events`), preserve provisional identity evidence, pass through a
**separate** Identity capability (`identity_resolution`), and safely produce a **resolved or
unresolved** downstream relationship context — with **no change to interpretation or opportunity
runtime**. The Channel node and the Identity node remain distinct capabilities; `capabilityRef`
(WHAT) stays independent of `nodeFlowRef` (WHICH).

## What was implemented

1. **Capability Registry** — added the semantic capability `identity_resolution` (category `identity`,
   owner `system`, status `experimental`, no Node Flow). Refined `channel_source_entry` to advertise a
   `provisional_identity` output. The registry stays pure semantic metadata (no execution).
2. **Instagram Channel node** — modelled as `class: "channel"`, `config.channel: "instagram"`,
   `capabilityRef: channel_source_entry`. It receives an Instagram event and emits canonical
   source/event context **plus** provisional identity evidence. It contains **no** identity-resolution
   logic.
3. **Instagram ingestion producer** — `POST /api/events/instagram` ingests into the existing canonical
   event boundary `of_events` (deterministic validation + normalization, source/provider metadata and
   provider event id preserved, idempotent/deduplicated via the pre-existing unique index, raw source
   evidence preserved). It performs **no** interpretation and creates **no** opportunity/queue item.
4. **Creator/provider model** — minimal additive migration widening the `of_creators.platform_provider`
   CHECK to include `'instagram'`; `PlatformProvider` type extended to match. No columns, no tables, no
   change to creator identity ownership.
5. **Provisional identity contract** — `ProvisionalIdentity` (transport-scoped evidence,
   `resolutionState` fixed to `"provisional"`).
6. **Identity Resolution node** — modelled as `class: "identity"`, `capabilityRef: identity_resolution`,
   **no** `nodeFlowRef` (capability_only). Backed by a deterministic, pure resolver seam
   (`resolveProvisionalIdentity`) that reuses the existing relationship boundary as candidate evidence.
7. **RelationshipContextProjection** — reused as the downstream context boundary via
   `projectRelationshipContextFromIdentity`, which emits the **existing** projection shape so downstream
   consumers read it unchanged.
8. **Reference journey** — `INSTAGRAM_IDENTITY_JOURNEY_EXAMPLE` composes Instagram Entry → Identity
   Resolution → downstream relationship context, with explicit **resolved** and **unresolved** paths and
   all four COMPOSE-2 compatibility states exercised.

## Files changed

| File | Change |
| --- | --- |
| `packages/of-types/src/index.ts` | `PlatformProvider += "instagram"`; `CapabilityKey += "identity_resolution"`; `CapabilityCategory += "identity"`; `CapabilityInputKey += "provisional_identity"`; `CapabilityOutputKey += "provisional_identity","identity_context"`. New COMPOSE-3 block: contracts (`ProvisionalIdentity`, `InstagramEventSource`, `NormalizedInstagramEvent`, `InstagramIngestionOutcome`, `IdentityCandidate`, `IdentityResolutionResult`, `ResolvedIdentity`, status/method unions), deterministic core (`normalizeInstagramEvent`, `resolveProvisionalIdentity`, `projectRelationshipContextFromIdentity`), `INSTAGRAM_PROVIDER`, and `INSTAGRAM_IDENTITY_JOURNEY_EXAMPLE`. |
| `apps/creator-cockpit/src/lib/capabilityRegistry.ts` | Added `identity_resolution` descriptor; added `provisional_identity` to `channel_source_entry.outputKeys`. |
| `apps/creator-cockpit/worker.ts` | `POST /api/events/instagram` route; `ingestInstagramEvent`, `resolveInstagramCreator`, `isAuthorizedInstagramEventIngest`; imports; `Env.INSTAGRAM_EVENTS_SHARED_SECRET?`. No change to the BetterFans path or the conversation runtime. |
| `supabase/migrations/20260709000000_instagram_platform_provider.sql` | Additive: widen `of_creators_platform_provider_check` to include `'instagram'`. |
| `apps/creator-cockpit/src/lib/journeyExamples.ts` | Bound `capabilityRef` on the existing Instagram-qualification example's Channel/Identity/Human nodes; set Identity `blockUntilResolved: false`. |
| `apps/creator-cockpit/scripts/compose2-capability-check.ts` | Relaxed the exact-6 assertion to a superset check so an additive 7th capability does not break the COMPOSE-2 guardrail. |
| `apps/creator-cockpit/scripts/compose3-instagram-identity-check.ts` | New deterministic check (55 assertions). |

## Schema / migration changes and why

**`20260709000000_instagram_platform_provider.sql`** — the only migration. It drops and re-adds
`of_creators_platform_provider_check` to permit `'instagram'`. **Why necessary:** `of_creators.platform_provider`
already exists (default `'betterfans'`) but is gated by a CHECK constraint
(`create table public.of_creators`, `20260618184143`) that rejects `'instagram'`, so an Instagram creator
cannot be represented without widening it. It is minimal (one constraint), additive (no columns/tables),
and reversible. The sibling `of_creators_betterfans_required` constraint already allows non-BetterFans
providers to omit `betterfans_account_id`, so Instagram creators need nothing further. **No** migration
was needed for event dedupe — the unique index `of_events (provider, provider_event_id)`
(`20260619000200`) already covers every provider including `instagram`.

## Exact Instagram ingestion contract

`POST /api/events/instagram` (optional auth header `x-instagram-event-secret`, gated by
`INSTAGRAM_EVENTS_SHARED_SECRET`; open when unset, parity with BetterFans).

Request body (flexible; snake/camel/nested accepted):

```jsonc
{
  "eventType": "instagram.dm_received",        // REQUIRED (aliases: event_type, type, field)
  "instagramAccountId": "ig-biz-emma",         // creator ref (aliases: accountId, igAccountId, *_id)…
  "creatorId": "<fmf-creator-uuid>",           // …OR the FMF creator id (at least one required)
  "providerEventId": "ig-mid-1001",            // optional, preserved (aliases: id, eventId, mid, message.mid)
  "occurredAt": "2026-07-09T09:00:00.000Z",    // optional (aliases: timestamp, received_at)
  "user": { "id": "ig-user-777", "username": "AceFan" },  // optional sender evidence (also from/sender)
  "message": { "text": "…" }                   // any raw fields; preserved verbatim
}
```

Deterministic validation (all `400`, no side effects):
- payload not a JSON object → `"Instagram event payload must be a JSON object"`;
- missing event type → `"Instagram event type is required"` (`field: "eventType"`);
- missing both `creatorId` and account id → `"An Instagram creator reference (creatorId or instagramAccountId) is required"` (`field: "creatorId"`).

Persistence — one `of_events` row:

```jsonc
{
  "creator_id": "<resolved creator uuid>",     // required context; unknown creator → 404 (never fabricated)
  "provider": "instagram",
  "provider_event_id": "ig-mid-1001",          // dedupe key (unique with provider)
  "event_type": "instagram.dm_received",
  "payload": {                                  // raw evidence preserved under .raw
    "source": { "platform": "instagram", "accountId": "ig-biz-emma", "receivedVia": "http_ingest" },
    "provider_event_id": "ig-mid-1001",
    "event_type": "instagram.dm_received",
    "occurred_at": "2026-07-09T09:00:00.000Z",
    "provisional_identity": { /* see below */ },
    "raw": { /* the original request body, verbatim */ }
  },
  "received_at": "<now>",
  "processed_at": null,
  "processing_status": "received",              // interpretation/opportunity deferred to COMPOSE-4
  "processing_error": null
}
```

Responses: `200 { ok: true, deduped: false, event, provisionalIdentity, summary }`;
duplicate → `200 { ok: true, deduped: true, event, provisionalIdentity, summary }`;
validation → `400`; unknown creator → `404`; write failure → a `failed` audit row + `500`.
The route runs **no** automations, **no** interpretation, **no** identity resolution, **no** opportunity/queue.

## Exact provisional identity contract (`ProvisionalIdentity`)

```ts
{
  sourcePlatform: "instagram",        // PlatformProvider
  externalId: string | null,          // IG user id where available
  username: string | null,            // handle where available
  creatorId: string | null,           // FMF creator (bound after creator lookup)
  creatorExternalId: string | null,   // IG account id where available
  sourceEventRef: string | null,      // provider event id
  evidenceAt: string,                 // ISO 8601 (occurredAt ?? receivedAt)
  resolutionState: "provisional"      // ALWAYS provisional — never claims a resolved person
}
```

The literal `resolutionState: "provisional"` makes the **provisional external identity** vs
**resolved internal relationship identity** distinction unforgeable at the type level. A username or
platform id being present does **not** imply resolution.

## Exact identity resolution contract

`resolveProvisionalIdentity(provisional, candidates) → IdentityResolutionResult`:

```ts
{
  status: "resolved" | "unresolved",
  method: "external_id_exact" | "username_exact" | "none",
  confidence: number,                 // 1 exact id, 0.9 exact username, 0 unresolved
  provisional: ProvisionalIdentity,   // echo of the evidence consumed
  resolved: {                          // null when unresolved (no fabrication)
    subscriberRelationshipId: string,
    subscriberId: string | null,
    matchedOn: "external_id_exact" | "username_exact"
  } | null,
  warnings: string[]
}
```

Resolution is **exact-only** and strictly scoped: same platform (never cross-platform), same creator
(never cross-creator), external-id match preferred then case-insensitive username. No fuzzy or
heuristic matching. Missing creator context or no match → `unresolved` (a valid, safe state).
`IdentityCandidate` is a minimal, canonical view of an existing `of_subscriber_relationships` row
(`subscriberRelationshipId`, `subscriberId`, `creatorId`, `platformProvider`, `externalId`, `username`)
— reusing the existing relationship boundary rather than minting a competing model. The resolver is
pure; the ingestion route does **not** invoke it (resolution is the Identity node's job, not the
Channel's).

## How RelationshipContextProjection is reused

`projectRelationshipContextFromIdentity(result) → RelationshipContextProjection` emits the **existing**
projection shape (`identity_status`, `identity_confidence`, `downstream_usability`, `known_sources`,
`relationship_posture`, `relationship_signals`, `commercial_signal_summary`, `warnings`) — the same
shape produced by FYV and read by the runtime via `normalizeRelationshipContext` /
`extractRelationshipContext` (`worker.ts`). The Identity node therefore *supplies the inputs* to the
established downstream boundary without inventing a new one. Identity resolution is **not** relationship
intelligence: the projection never fabricates `relationship_posture`/`relationship_signals`/
`commercial_signal_summary` (all null/empty); it reports identity status/confidence/usability and the
known source only.

### Resolved identity example

Provisional `{ externalId: "ig-user-777", creatorId: "creator-emma", … }` against a candidate
`{ subscriberRelationshipId: "rel-ace", creatorId: "creator-emma", platformProvider: "instagram", externalId: "ig-user-777" }`:

```jsonc
// result:  { status:"resolved", method:"external_id_exact", confidence:1, resolved:{ subscriberRelationshipId:"rel-ace", subscriberId:"sub-ace", matchedOn:"external_id_exact" }, warnings:[] }
// projection:
{ "identity_status":"exact", "identity_confidence":1, "downstream_usability":"usable",
  "known_sources":["instagram"], "relationship_posture":null, "relationship_signals":[],
  "commercial_signal_summary":null, "warnings":[] }
```

### Unresolved identity example

Provisional `{ externalId: "ig-user-999", username: "ghost", creatorId: "creator-emma" }` with no match:

```jsonc
// result:  { status:"unresolved", method:"none", confidence:0, resolved:null, warnings:["No canonical subscriber matched the provisional Instagram identity."] }
// projection:
{ "identity_status":"unresolved", "identity_confidence":0, "downstream_usability":"unusable",
  "known_sources":["instagram"], "relationship_posture":null, "relationship_signals":[],
  "commercial_signal_summary":null, "warnings":["No canonical subscriber matched the provisional Instagram identity."] }
```

No contact/relationship is fabricated; downstream context is simply marked unusable.

## Reference journey composition (`INSTAGRAM_IDENTITY_JOURNEY_EXAMPLE`)

```
Instagram Entry (channel · channel_source_entry · capability_only)
  → Identity Resolution (identity · identity_resolution · capability_only, NO Node Flow)
      → resolved   → New Subscriber Welcome (conversation · new_subscriber_welcome_discovery + nodeFlowRef · capability_and_flow)
      → unresolved → Identity Review (human · human_handoff · capability_only)
```

COMPOSE-2 compatibility model preserved: the Identity node is **capability_only** (B) — a concrete Node
Flow is **not** required to represent the Identity capability; the Welcome node is **capability_and_flow**
(A); `flow_only` (C) and `unbound` (D) remain valid (proven by the COMPOSE-2 check and the derived
generic journey). `capabilityRef` and `nodeFlowRef` are never merged.

## Validation evidence

- **Deterministic COMPOSE-3 check** — `apps/creator-cockpit/scripts/compose3-instagram-identity-check.ts`,
  **55/55 PASS**, executed in-sandbox via Node 24 type stripping
  (`node apps/creator-cockpit/scripts/compose3-instagram-identity-check.ts`). Covers every required
  assertion: registry resolution; Instagram = Channel using `channel_source_entry`; valid fixture
  accepted; invalid payloads fail deterministically (400s); provider event id preserved (top-level +
  nested `message.mid`); raw source evidence preserved; provisional identity emitted without claiming
  resolution (incl. with no user evidence); known identity resolves deterministically (id + username,
  creator-scoped, not the same-id other-creator row); unknown/cross-platform/no-creator/empty →
  unresolved safely; relationship context only via the projection boundary; `capabilityRef` independent
  of `nodeFlowRef`; identity_resolution declares no interpretation signals; canonical vocabulary
  untouched (21); no opportunity/queue output keys; the 6 COMPOSE-2 capabilities remain.
- **COMPOSE-2 check** — re-run after the additive registry change: **ALL PASS**.
- **Typecheck / build** — **blocked in sandbox**: the egress firewall returns HTTP 403 for
  `registry.npmjs.org`, so `npm ci` (and therefore `tsc`/`vite build`) cannot run locally (same
  constraint as prior sprints). The authoritative gate is the Creator Cockpit Smoke CI verify job
  (`npm ci → typecheck → build`, `.github/workflows/creator-cockpit-smoke.yml`), which runs on the PR.
  The deterministic core is additionally validated by the Node type-strip smoke above.
- **Deployed smoke** — needs a live Worker + Supabase (`COCKPIT_BASE_URL`); not run in the sandbox. No
  claim of a pass is made for checks that did not run.

## COMPOSE-4 scope was NOT absorbed

No interpretation producer was rewired; inline regex interpretation and `ConversationIntent` are
untouched; the canonical interpretation vocabulary is unchanged (21 signals). No Outcome→Opportunity
mapping/execution, no opportunity persistence from Instagram events, no queue integration, no automated
outreach, no Instagram DM sending/OAuth/webhook registration/polling. Ingestion sets
`processing_status: "received"` and runs no automations, deliberately leaving downstream processing to
COMPOSE-4.

## Architectural invariants preserved

Journey describes composition · Capability = WHAT · Node Flow = WHICH · Channel ingestion ≠ identity
resolution · Identity resolution ≠ relationship intelligence · Relationship context ≠ interpretation ·
Interpretation ≠ opportunity creation · **Event ingestion succeeds independently of identity
resolution** · **Unresolved identity is a valid deterministic state** · No node fabricates context owned
by another bounded capability (identity resolution never invents relationship posture/signals; the
Channel never claims resolution).

## Remaining gaps before a real Instagram connector can be attached

- **Ingestion producer/adapter**: no live Instagram Graph API integration, OAuth, webhook registration,
  or polling — the boundary is proven with fixtures/deterministic payloads. A real connector must map an
  Instagram business account to an FMF creator (today `resolveInstagramCreator` matches an existing
  `platform_provider='instagram'` creator by id/username/`metadata.instagram_account_id`) and forward
  webhook events to `POST /api/events/instagram`.
- **Identity resolution wiring**: the resolver is a pure, deterministic seam proven by the check and the
  reference journey; it is **not** wired into a live Journey runtime (Journey runtime redesign is out of
  scope). A future sprint runs it over ingested provisional identities and persists the derived
  `relationship_context`.
- **Candidate loading**: production resolution needs `of_subscriber_relationships` candidates loaded per
  creator/platform; the shape (`IdentityCandidate`) is defined but the DB read is not wired into a
  runtime path here.
- **Registry maturity**: `identity_resolution` is `experimental` (v0.1) with empty `implementationRefs`.
- **COMPOSE-4** still owns: wiring producers to the canonical interpretation signals, and
  Outcome→Opportunity mapping/execution.

Stop after COMPOSE-3. Do not start COMPOSE-4 automatically.
