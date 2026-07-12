# FYV -> FMF Creator Intelligence Package Handoff

## Boundary

```
FYV                                   FMF
 assessment                            creator relationship
 interpretation        event            creator workspace
 package generation  ───────────▶       operations
                                         automation execution
        creator.intelligence_package.published
```

FYV is the canonical producer of creator intelligence (assessment, interpretation, package generation). FMF is the operational consumer. FMF consumes a **published** FYV Creator Intelligence Package as an external source artifact and uses it to advance the creator **relationship lifecycle** — without direct access to FYV internal databases, APIs, or assessment logic.

This sprint (FYV-1) is **additive** on top of the existing Creator Intelligence Projection v1 (`creator_intelligence_snapshots` / `creator_intelligence_opportunity_projections`, imported today via `POST /api/creators/:id/intelligence/import`) and CIP-3 (accepted opportunity -> playbook proposal -> builder draft). It adds the event boundary + relationship lifecycle those deliberately deferred. No runtime execution redesign; one additive, reversible migration.

## What FMF stores (reference, never a copy)

- **Operational pointer** — `of_creators.metadata.fyv_package`:

  ```json
  {
    "source_product": "FYV",
    "package_reference": "fyv/{creator}/intelligence-package/{date}",
    "assessment_reference": "fyv/{creator}/assessment/{date}",
    "package_state": "published",
    "linked_at": "<iso8601>",
    "source_event_id": "<package_reference or producer event id>"
  }
  ```

- **Relationship lifecycle** — `of_creators.relationship_state` (+ `relationship_state_changed_at`).
- **Received package history / provenance** — the existing immutable `creator_intelligence_snapshots` remains the source-of-truth for full imported package payloads. FMF does **not** duplicate FYV assessment/report/scoring logic. The event path stores a reference only.

## Event contract

`POST /api/events/fyv` (persist-only, deduped; mirrors the Instagram ingestion boundary):

```json
{
  "event_type": "creator.intelligence_package.published",
  "source_product": "FYV",
  "creator_reference": "<creator_id | username>",
  "package_reference": "<package_reference>",
  "source_assessment_reference": "<reference>",
  "package_state": "published"
}
```

### Processing flow

```
receive
  -> authorize (x-fyv-event-secret, only if CREATOR_INTELLIGENCE_EVENTS_SHARED_SECRET set)
  -> validate payload (of-types, pure)
        event_type == creator.intelligence_package.published
        source_product == FYV
        package_reference present
        creator_reference present
        package_state == published
  -> resolve EXISTING FMF creator (uuid id, else case-insensitive username)
  -> attach of_creators.metadata.fyv_package pointer
  -> advance relationship_state: invited -> accepted
  -> persist deduped of_events row (provider='fyv', provider_event_id=package_reference)
```

### Guards (all enforced)

| Case | Result |
| --- | --- |
| Missing `package_reference` | 400, no state change |
| Missing `creator_reference` | 400, no state change |
| `package_state` not `published` (`identified`/`draft`/`superseded`) | 422, no state change |
| Wrong `event_type` / `source_product` | 400, no state change |
| Unknown creator | **404, reject — never create, no duplicate identity** |
| Duplicate event (same `package_reference`) | Deduped response, **no second transition** |

## Creator relationship lifecycle

```
invited --> accepted --> active --> paused --> offboarded
                            ^          |
                            +----------+   (resume)
```

Legal transitions (`canTransitionCreatorRelationship`): `invited->accepted|offboarded`, `accepted->active|offboarded`, `active->paused|offboarded`, `paused->active|offboarded`. `offboarded` is terminal. Same-state is not a transition.

**The FYV published event may only perform `invited -> accepted`** (`nextRelationshipStateForPublishedPackage`: `null`/`invited -> accepted`; any already-advanced state is a no-op). It **never** performs `accepted -> active` — activation is an explicit FMF operational decision.

### Capabilities (`relationshipCapabilities`)

| State | onboardingAllowed | automationExecutionEnabled | executionSuspended | executionBlocked |
| --- | --- | --- | --- | --- |
| invited | ✗ | ✗ | ✗ | ✗ |
| accepted | ✓ | ✗ | ✗ | ✗ |
| active | ✓ | ✓ | ✗ | ✗ |
| paused | ✓ | ✗ | ✓ | ✗ |
| offboarded | ✗ | ✗ | ✗ | ✓ |

## Idempotency & write safety

No explicit multi-statement transaction is used (parity with the existing BetterFans/Instagram boundaries; PostgREST does not expose one here). Instead:

1. If the event already exists (`of_events` unique `(provider, provider_event_id)` partial index) -> return **deduped**, no re-transition.
2. Otherwise attach the pointer + advance the state in **one atomic single-row `UPDATE`** (idempotent: `invited/null -> accepted` only; re-applying is a no-op).
3. Then insert the canonical event as the dedupe/commit marker (a concurrent duplicate -> `23505` -> treated as deduped).

Because state is applied **before** the event row exists and the advance is idempotent, a crash between (2) and (3) self-heals on replay without a double transition. A single-transaction Postgres function is a possible future hardening.

## Creator Cockpit

`CreatorDetail` Profile tab gains a read-only **FYV onboarding** block, derived entirely from the existing creator record (no new API call): `Assessment complete`, `FYV package linked`, `Onboarding: <relationship_state>`, `Services` (pending/ready from `onboarding_status`). The existing Intelligence tab (imported package, snapshot, opportunities) and Playbooks tab (CIP-3) are unchanged.

## Configuration

- `CREATOR_INTELLIGENCE_EVENTS_SHARED_SECRET` (optional). When set, requests must send header `x-fyv-event-secret`. When unset, the boundary is open (parity with the other ingestion boundaries).

## Validation

- `apps/creator-cockpit/scripts/fyv-onboarding-check.ts` — deterministic, no DB/browser (Node type-strip). **77/77 PASS.** Covers: legal/illegal transitions; the event advance function; capability gates (incl. paused/offboarded restrictions); every validation guard; and the full orchestrator over an in-memory store that mirrors the Supabase store — valid published event advances MoonSiren `invited/null -> accepted` and attaches the pointer; duplicate replay is idempotent (one event row, no second transition); unknown creator is rejected with no creation; unpublished/missing-reference make no writes; an already-`active` creator is never regressed or activated.
- Existing `compose2..7` checks re-run: **ALL PASS** (no regression).
- CI verify job (`.github/workflows/creator-cockpit-smoke.yml`: `npm ci -> typecheck -> build`) is the authoritative gate. Local `npm ci`/typecheck/build are blocked in the sandbox (registry egress 403), consistent with prior sprints. Deployed smoke needs a live Worker + Supabase.

## Explicitly out of scope

FYV repository / assessment generation; querying FYV tables or APIs; automatic creator creation; MGRNZ; billing; accounting; activating automation from the FYV event (`accepted -> active`); duplicate creator identity models; duplicating FYV intelligence calculations; changes to opportunity projection, CIP-3, queues, or automation runtime.

## Remaining gaps / follow-ups

- Live FYV transport (OAuth/webhook signature verification) — this sprint accepts a POSTed event with an optional shared secret; no HMAC.
- Opportunity projection still arrives via the existing manual import path; the lightweight event stores a reference only. If FYV later delivers the full payload on the event, the handler can optionally project it (published-only).
- `active`/`paused`/`offboarded` transitions are modelled + capability-gated but are driven by explicit FMF operations (operator UI actions to set them are future work).
- Single-transaction Postgres function for the attach+advance+event write is a possible concurrency hardening.
