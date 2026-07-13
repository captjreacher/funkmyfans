# FMF-3: Creator Readiness Orchestrator

## From dashboard to live operational view

FMF-2 gave us a snapshot: "is this creator operationally ready right now?" FMF-3 makes it **live**: whenever creator readiness changes, FMF detects the transition, records an append-only event, and emits a declarative set of orchestration actions for existing services to consume.

The orchestrator is a **coordinator**, not an executor. It never runs a journey, never re-implements automation, never duplicates FYV logic. It observes the state boundary and describes what should happen next.

## Ownership (unchanged)

FYV owns creator assessment, intelligence, authentication, and access lifecycle. FMF owns operations, readiness, opportunities, journeys, playbooks, and automation. FMF-3 sits inside FMF and reads existing state (from both sides via already-defined FMF surfaces).

## Milestones

Six operational milestones map to FMF-2's `readinessScore` thresholds:

| Milestone | Score | Meaning |
| --- | --- | --- |
| `discovery` | 0–19 | Creator seeded; nothing operational yet |
| `infrastructure_ready` | 20–39 | BetterFans connected |
| `intelligence_ready` | 40–59 | + FYV intelligence imported |
| `creator_ready` | 60–79 | + Creator linked / partially linked to FYV |
| `operational` | 80–99 | + Journeys configured or running |
| `production_ready` | 100 | All sections at maximum |

Thresholds are chosen so the MoonSiren spec trajectory `20% → 40% → 68% → 84% → 100%` produces exactly one milestone event per step.

## Event types

| Event | Fires when |
| --- | --- |
| `creator_readiness_changed` | The milestone changes (up or down). Umbrella event. |
| `creator_reached_infrastructure` | Crossing UP into `infrastructure_ready`. **One-shot per creator.** |
| `creator_reached_intelligence` | Crossing UP into `intelligence_ready`. One-shot. |
| `creator_reached_creator_ready` | Crossing UP into `creator_ready`. One-shot. |
| `creator_reached_operational` | Crossing UP into `operational`. One-shot. |
| `creator_reached_production` | Crossing UP into `production_ready`. One-shot. |
| `creator_regressed` | Milestone ordinal decreased. |
| `creator_blocked` | Previous evaluation had 0 blocks; new has ≥1. (Not fired on the first-ever evaluation.) |
| `creator_unblocked` | Previous had ≥1 block; new has 0. |

Idempotency is layered:
1. **Planner** — no events emitted unless state actually delta'd. Replays with no state change produce zero events.
2. **Storage** — partial unique index `(creator_id, event_type, new_milestone)` on `public.creator_readiness_events` enforces one row per (creator, reached-milestone). A race that slips through the planner is deduped by the DB.

## Orchestration actions

The orchestrator emits declarative `OrchestrationAction[]` on the event row. It **never dispatches** them itself — downstream services subscribe to the persisted events. This keeps FMF-3 additive.

| Action | Emitted when |
| --- | --- |
| `queue_default_journey_activation` | Reaching `operational` |
| `enable_operational_automations` | Reaching `production_ready` |
| `pause_creator_automations` | Regressing from `operational`+ |
| `refresh_readiness` | (Reserved for future self-referential triggers.) |

## Data model

New append-only table `public.creator_readiness_events`:

| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | `gen_random_uuid()` |
| `creator_id` | uuid | FK → `of_creators(id)` ON DELETE CASCADE |
| `event_type` | text | CHECK-constrained to the 9 types above |
| `previous_score` / `new_score` | integer | 0–100 CHECK on `new_score` |
| `previous_status` / `new_status` | text | ReadinessBadge |
| `previous_milestone` / `new_milestone` | text | CHECK on `new_milestone` |
| `trigger_event` | text | Lineage: which input event triggered the reconcile |
| `blocking_issues` / `warnings` | text[] | Snapshot at time of event |
| `actions` | jsonb | Declarative action list (see above) |
| `metadata` | jsonb | Extensibility |
| `created_at` | timestamptz | Default `now()` |

Partial unique index on `(creator_id, event_type, new_milestone)` scoped to the `creator_reached_*` family. Regular index on `(creator_id, created_at desc)` for history queries. RLS + grants mirror the existing readiness tables.

## Trigger points

`reconcileCreatorReadiness(supabase, creatorId, triggerEvent)` is wired into every state-change entry point as a **fire-and-forget** side effect (`try/catch`; failures logged, never surfaced to the parent):

| Trigger | Wired into |
| --- | --- |
| `betterfans_sync_completed` | `POST /api/creators/:id/sync/:type` (on success) |
| `intelligence_imported` | `POST /api/creators/:id/intelligence/import(-fixture)` |
| `creator_invited` / `creator_accepted` / `creator_activated` | `POST /api/events/fyv/relationship` webhook (echoes the raw event_type) |
| `fyv_invite_dispatched` | `POST /api/creators/:id/fyv/invite` (on success) |

## API

```
GET /api/creators/:id/readiness/history
```

Read-only per spec — no write endpoints on the orchestrator surface. Returns newest-first up to 50 events. Missing-relation degradation to `{ ok: true, events: [] }` when the table isn't deployed yet.

## UI

The existing FMF-2 `CreatorReadinessCard` is extended with a **Recent readiness activity** section at the bottom. Newest 8 events, one line each: glyph + human-readable label + timestamp. No new tabs, no new pages, no timelines anywhere else.

Example activity for the MoonSiren scenario:
```
✓ Infrastructure ready — BetterFans connected      2026-07-13
✓ FYV intelligence ready                            2026-07-13
✓ Creator relationship ready                        2026-07-13
✓ Creator unblocked                                 2026-07-13
✓ Operational readiness reached                     2026-07-13
✓ Production ready                                  2026-07-13
```

## MoonSiren replay validation

Deterministic replay (`fmf-3-orchestrator-check.ts`, **69/69 PASS**) walks: BF connected → intelligence imported → FYV invited → FYV accepted → journeys running. Assertions cover:
- Correct milestone at each step (thresholds match spec).
- Milestone-reached events fire ONCE across replays (both planner-level "no delta" and store-level partial unique).
- `creator_unblocked` fires when the previous state was blocked and the new isn't.
- Regression (score drop across milestones) fires `creator_regressed` + `pause_creator_automations` action.
- First-ever reconcile with pre-existing blocks does NOT fire `creator_blocked` (seed, not transition).
- Action rules: journey activation at operational, automation enable at production, pause on regression from operational+.

Plus the FMF-2 pure calculator (48/48), FMF-1 relationship controller (49/49), FYV-1 (91/91), and compose2..7 all re-run **without regression**.

## Non-goals (explicit)

- No move of FYV logic into FMF.
- No duplicate journey / playbook / automation execution.
- No writes from `/readiness/history` (the API is read-only per spec).
- No creator-facing UI.
- The orchestrator does NOT dispatch actions — it records them on the event row for downstream services to consume through existing event/task infrastructure. Real dispatch (calling the automation engine, queuing a journey activation) is a future sprint.

## Success criteria met

- **FMF automatically reacts** to readiness changes: every state-change trigger point calls the orchestrator, which detects the delta and records events.
- **The Readiness Dashboard becomes a live operational view**: the existing card now shows a "Recent readiness activity" trail with milestone crossings, blocks/unblocks, and regressions in real time.
- **A single readiness orchestration layer** replaces feature-specific triggers: any downstream automation subscribes to `creator_readiness_events` rather than watching each source table independently.
