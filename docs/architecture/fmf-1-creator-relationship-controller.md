# FMF-1: Creator Relationship Controller

## Ownership boundary

```
FMF (Creator Cockpit)                              FYV
──────────────────────                            ──────
 agency creator management                         assessments
 creator invitation WORKFLOWS   ─── controls ───►  invite DELIVERY
 creator relationship state     ─── receives ───   creator_invited
 creator OPERATIONAL surface        events         creator_accepted
                                                   creator_activated
                                                   intelligence generation
```

FMF is the **source of truth** for agency creator management, creator invitation workflows, and creator operational relationship state. FYV owns assessments, reports, intelligence generation, and the **actual invite delivery** (email/token/creator-facing surface). FMF does **not** duplicate FYV's invite mechanics; it orchestrates and stores the relationship.

## Data model — one FMF creator, one FYV link

`public.fmf_creator_fyv_relationships` (migration `20260713000000`):

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` |
| `fmf_creator_id` | uuid | **unique**, FK → `of_creators(id)` ON DELETE CASCADE |
| `fyv_creator_id` | text (nullable) | opaque external id from FYV; nullable so a row can exist in `pending` before the FYV account is provisioned |
| `relationship_state` | text | CHECK `pending | invited | accepted | active`; default `pending` |
| `invited_at` / `accepted_at` / `activated_at` | timestamptz (nullable) | per-state stamps, set once, never cleared |
| `state_changed_at` | timestamptz | updated only on real transitions |
| `metadata` | jsonb | last-event lineage; not for intelligence content |
| `created_at` / `updated_at` | timestamptz | trigger `set_updated_at()` (reused) |

RLS + grants mirror the existing `creator_intelligence_*` tables (SELECT to `authenticated`, full CRUD to `service_role`).

## Lifecycle

```
 pending  ─▶  invited  ─▶  accepted  ─▶  active
```

- **Strict**: `canTransitionFmfFyvRelationship` enforces single-step legality (validation).
- **Orchestrator**: uses `nextStateAfterFmfFyvEvent` (ordinal advance) — **catches up** when webhooks arrive out of order (e.g. `pending + creator_activated → active`) and **never regresses**.

## Endpoints

| method | path | purpose |
| --- | --- | --- |
| `GET`  | `/api/creators/:id/fyv/relationship` | Read the FMF↔FYV relationship (or `null` when not linked). |
| `POST` | `/api/creators/:id/fyv/invite` | Agency Invite. Ensures the row exists (`pending`), calls FYV, advances state. |
| `POST` | `/api/events/fyv/relationship` | Webhook consumer for `creator_invited | creator_accepted | creator_activated`. |

### Invite flow (agency action)

```
click Invite
  -> load or create the local relationship row (pending)
  -> if FYV_API_BASE_URL is configured, POST to FYV's own invite endpoint
       Authorization: Bearer <FYV_API_KEY>
       body: { source_product: "FMF", fmf_creator_id }
  -> honour FYV's returned state (only when it ordinally advances)
  -> else fall back to invited (state)
  -> update local row (state + invited_at only when they advance)
```

FMF **never** re-implements invite delivery. When `FYV_API_BASE_URL` is unset the outbound call is skipped, the local row still advances to `invited`, and the response reports `fyv_invoked: false` — useful for staging and offline UI validation.

### Event webhook consumer

```
POST /api/events/fyv/relationship
  optional shared-secret header: x-fyv-event-secret (FYV_EVENTS_SHARED_SECRET)
  body: { event_type, fyv_creator_id, fmf_creator_id?, event_id?, occurred_at? }
```

Processing:
1. Validate shape (`normalizeFmfFyvRelationshipEvent`).
2. Resolve relationship — prefer `fmf_creator_id`, else `fyv_creator_id`. **404 when unknown** (FMF never creates a relationship from a webhook).
3. `store.applyEvent` — atomic + idempotent:
   - **dedupe** by `of_events (provider='fyv', provider_event_id)` — replays are no-ops;
   - **recompute** target state from the **live** row (never regress from a stale resolve);
   - single-row UPDATE writes `relationship_state` (only when it advances) and the event's per-state timestamp (only when unset);
   - insert into `of_events` as the commit marker (concurrent duplicate → 23505 → deduped).

Persist-only. **No** automation execution, **no** queue/opportunity/intelligence writes.

## Configuration

| env | required | purpose |
| --- | --- | --- |
| `FYV_API_BASE_URL` | no | Base URL of the FYV API (e.g. `https://fyv.example.com`). When unset, the outbound invite call is skipped. |
| `FYV_API_KEY` | no | Sent as `Authorization: Bearer <key>` when set. |
| `CREATOR_INTELLIGENCE_EVENTS_SHARED_SECRET` | no | **Reused from FYV-1.** When set, the webhook requires header `x-fyv-event-secret`. Open when unset (parity with other ingestion boundaries). One inbound FYV secret gates both `/api/events/fyv` (intelligence package) and `/api/events/fyv/relationship` (this sprint). |

## Cockpit UI

`CreatorDetail` Profile tab gains an **FYV relationship** card (read-only, derived from the relationship row):

```
FYV relationship                             [ Invite to FYV / Invited / Accepted / Active ]
Creator: <display_name>
FYV:                Connected / Not connected
Relationship:       <state>
FYV creator id:     <id or "not linked">
Invited / Accepted / Activated timestamps
```

No creator-facing UI is added. The cockpit is agency-facing; FYV owns the creator-facing surface.

## Non-goals (explicit)

- **Not** duplicated: assessments, reports, intelligence generation (FYV's domain — see `docs/architecture/creator-intelligence-projection-v1.md`).
- **Not** built: creator-facing email/portal/token — FYV owns delivery. FMF sends no email.
- **Not** touched: `mgrnz-web` project, billing, accounting, existing intelligence/CIP-3 flows.
- **Not** related: `of_creators.status` / `onboarding_status` (platform connection health / setup state) remain unchanged — the FMF↔FYV relationship is a separate concern.

## MoonSiren validation

- **FMF creator id**: `20fdee3c-6998-4e8a-8611-04ab88949301` (live `funk-my-brand`, username `leahsiren` / display `moonsiren`).
- **FYV creator id**: `16bab1fb-…` (from FYV; example fixture uses `16bab1fb-e6f0-4e19-9b3b-000000000001`).

Fixtures for the three events live at `apps/creator-cockpit/fixtures/fyv-creator-{invited,accepted,activated}-event.json`. The deterministic check (`apps/creator-cockpit/scripts/fmf-relationship-controller-check.ts`, **49/49 PASS**) proves lifecycle correctness, ordinal catch-up, no-regression, idempotency, unknown-relationship rejection, and per-state timestamp backfill on out-of-order arrival — all without a live DB or FYV connection.

## Validation summary

- `fmf-relationship-controller-check.ts`: **49/49 PASS** (Node type-strip, in-memory store).
- `compose2..7`: **ALL PASS** (no regression).
- `node --check` on all 3 changed TS files: clean.
- Local `npm ci` / typecheck / build remain blocked by sandbox egress (registry 403). CI verify job is authoritative.

## Follow-ups

- Real FYV OAuth/webhook signature (this sprint uses a shared-secret header).
- Operator UI to unlink / re-invite / view event history — not needed for FMF-1.
- Consolidation with FYV-1's `of_creators.relationship_state` (`invited|accepted|active|paused|offboarded`) — that models the FMF creator's broader lifecycle driven by the intelligence-package event; this FMF-1 lifecycle models the FMF↔FYV account LINK. Both live side-by-side; unify later if the split proves unhelpful.
- FYV-1 and FMF-1 share `provider='fyv'` in `of_events`; their `provider_event_id` shapes are structurally distinct (`packageReference` vs `${eventType}:${fyvCreatorId}`) so they never collide, but if FYV producers ever supply an explicit collision-prone id, add a sub-namespace prefix.
